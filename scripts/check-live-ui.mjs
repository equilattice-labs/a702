import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const qa = require('./vercairn-rpc-fixture.cjs');

const output = fileURLToPath(new URL('../output/playwright/', import.meta.url));
// Only isolated read-only RPC data is used; the fixture wallet rejects signing.
// A running Vite dev server is required so its config module can be intercepted.
export async function runLiveQa(browser, url = 'http://127.0.0.1:5173/') {
  const origin = new URL(url).origin;
  assert(['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'QA requires a local Vite server');
  await mkdir(output, { recursive: true });
  const report = { date: new Date().toISOString(), url, flows: [], accessibility: [], errors: [], blockedExternalRequests: [] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const fixture = qa.createFixture({ rpcUrl: `${origin}/__qa_rpc` });
  let configIntercepted = false;
  let holdRpc = true, emptyRegistry = false, releaseRpc;
  const initialRpc = new Promise(resolve => { releaseRpc = resolve; });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    report.blockedExternalRequests.push(route.request().url());
    return route.abort();
  });
  await page.route('**/src/config.js*', route => {
    configIntercepted = true;
    return route.fulfill({ contentType: 'text/javascript', body: fixture.configSource() });
  });
  await page.route('**/__qa_rpc', async route => {
    if (holdRpc) await initialRpc;
    if (!emptyRegistry || route.request().method() === 'OPTIONS') return fixture.fulfillRpc(route);
    // Reuse the read-only fixture while exposing an actually empty registry.
    const payload = route.request().postDataJSON();
    const response = fixture.handle(payload);
    const requests = Array.isArray(payload) ? payload : [payload];
    const responses = Array.isArray(response) ? response : [response];
    requests.forEach((request, index) => {
      if (request.method === 'eth_call' && fixture.iface.parseTransaction({ data: request.params[0].data })?.name === 'missionCount') {
        responses[index].result = fixture.iface.encodeFunctionResult('missionCount', [0n]);
      }
    });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
  await page.addInitScript(qa.installWallet, fixture.walletOptions());
  const review = async () => {
    await page.locator('.detail-tabs').getByRole('tab', { name: /Review/ }).click();
    await page.locator('.contribution-card').nth(1).waitFor();
  };
  const capture = name => page.screenshot({ path: path.join(output, `vercairn-${name}.png`), scale: 'css' });
  try {
    await page.goto(url);
    await page.locator('.loading-state').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Open featured mission', exact: true }).count(), 0, 'Loading cannot expose a fabricated featured mission');
    holdRpc = false;
    releaseRpc();
    await page.locator('.read-brief').first().waitFor();
    assert(configIntercepted, 'Live QA must intercept the Vite configuration before exercising controls');
    // eth_accounts already returns the creator; there is no Connect wallet step.
    const featuredTitle = await page.locator('.mission-card h3').first().innerText();
    await page.getByRole('button', { name: 'Open featured mission', exact: true }).click();
    await page.getByRole('dialog').getByRole('heading', { name: featuredTitle, exact: true }).waitFor();
    assert.equal(await page.locator('#dialog-title').innerText(), featuredTitle);
    await page.getByRole('tab', { name: 'Brief', exact: true }).focus();
    await page.keyboard.press('End');
    const reviewTab = page.getByRole('tab', { name: /Review/, selected: true });
    await reviewTab.waitFor();
    assert.equal(await reviewTab.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByRole('tabpanel').getAttribute('aria-labelledby'), await reviewTab.getAttribute('id'));
    await page.locator('.contribution-card').nth(1).waitFor();
    report.flows.push('Loading cover waits for registry data; featured action opens a real live brief; End selects and focuses its review tab');
    await page.getByRole('button', { name: 'Approve', exact: true }).waitFor();
    assert.match(await page.locator('.contribution-card').first().innerText(), new RegExp(qa.PENDING_CONTRIBUTOR));
    await page.locator('#approval-0').fill('0.000000000000000001');
    assert.equal(await page.locator('#approval-0').inputValue(), '0.000000000000000001');
    assert(!await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled());
    await capture('creator-review');
    const axe = await new AxeBuilder({ page }).include('dialog[open]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    report.accessibility.push({ name: 'creator-review-dialog', violations: axe.violations });
    // This amount is rejected locally before any wallet or transaction request.
    await page.locator('#approval-0').fill('0.2');
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await page.locator('#approval-error-0').waitFor();
    assert.equal(await page.locator('#approval-0').getAttribute('aria-invalid'), 'true');
    assert.match(await page.locator('#approval-error-0').innerText(), /exceeds.*unallocated reward pool/);
    report.flows.push('Creator sees reward recipient, accepts exact 1 wei input, and receives an associated over-allocation error');
    await page.evaluate(address => window.__vercairnQaWallet.setAccount(address), qa.VIEWER);
    await page.getByRole('button', { name: 'Approve', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#approval-0').count(), 0);
    report.flows.push('Non-creator cannot see approval controls');

    fixture.setState({ mode: 'expired', unsafeEvidence: true });
    await page.reload();
    await page.locator('.read-brief').first().click();
    await page.locator('.detail-tabs').getByRole('tab', { name: 'Contribute', exact: true }).click();
    await page.getByText(/past its deadline/).waitFor();
    assert(await page.getByRole('button', { name: 'Submit research', exact: true }).isDisabled());
    assert(await page.getByRole('button', { name: 'Fund this mission', exact: true }).isDisabled());
    await review();
    assert(!await page.getByRole('button', { name: 'Return unallocated funds', exact: true }).isDisabled());
    assert(await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled());
    assert.equal(await page.locator('.contribution-card').first().locator('a[href]').count(), 0);
    assert.match(await page.locator('.contribution-card').first().innerText(), /Evidence URL is unavailable/);
    report.flows.push('Expired mission disables submit, funding and approval; creator refund available; unsafe evidence has no link');

    fixture.setState({ mode: 'error' });
    await page.reload();
    await page.getByRole('heading', { name: 'The board couldn’t load.' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Open featured mission', exact: true }).count(), 0, 'RPC errors remove the featured mission action');
    await page.locator('.error-state').scrollIntoViewIfNeeded();
    await capture('rpc-error');
    fixture.setState({ mode: 'open', unsafeEvidence: false });
    await page.locator('.error-state').getByRole('button', { name: 'Try again', exact: true }).click();
    await page.locator('.mission-card').first().waitFor();
    assert.equal(await page.locator('.error-state').count(), 0);
    await page.getByRole('button', { name: 'Open featured mission', exact: true }).waitFor();
    report.flows.push('RPC failure displays retry and recovers missions after the fixture is restored');
    emptyRegistry = true;
    await page.reload();
    await page.getByRole('heading', { name: 'The next question could be yours.', exact: true }).waitFor();
    assert.equal(await page.locator('.mission-card').count(), 0);
    assert.equal(await page.getByRole('button', { name: 'Open featured mission', exact: true }).count(), 0, 'An empty registry does not show a stale or sample feature');
    emptyRegistry = false;
    await page.reload();
    await page.locator('.mission-card').first().waitFor();
    await page.getByRole('button', { name: 'Open featured mission', exact: true }).waitFor();
    report.flows.push('An empty live registry removes the feature; reloading after a mission appears restores the live feature');
    await page.evaluate(() => window.__vercairnQaWallet.setChain('0x1'));
    await page.getByRole('button', { name: 'Open your rewards', exact: true }).click();
    await page.getByRole('button', { name: 'Switch network', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Switch network', exact: true }).click();
    await page.locator('.reward-balance').waitFor();
    await page.getByRole('button', { name: 'Claim rewards', exact: true }).waitFor();
    assert(!await page.getByRole('button', { name: 'Claim rewards', exact: true }).isDisabled());
    report.flows.push('Wrong-network rewards prompt switches the fixture wallet and restores the 1 wei claim balance');
    fixture.setState({ briefURI: 'https://Research.Twitter.COM./brief', evidenceURI: 'https://x.com./research', unsafeEvidence: false });
    await page.reload();
    await page.getByRole('button', { name: 'Open featured mission', exact: true }).click();
    assert.equal(await page.getByRole('link', { name: 'Read the public brief' }).count(), 0, 'Contract-provided Twitter brief destinations must not become links');
    await review();
    assert.equal(await page.locator('.contribution-card').first().locator('a[href]').count(), 0, 'Contract-provided X evidence destinations must not become links');
    assert.match(await page.locator('.contribution-card').first().innerText(), /Evidence URL is unavailable/);
    assert.equal(await page.locator('.contribution-card').nth(1).locator('a[href]').count(), 1, 'Valid IPFS evidence remains accessible');
    const dynamicLinks = await page.locator('a[href]').evaluateAll(elements => elements.map(element => element.href));
    assert(!dynamicLinks.some(href => /(^|\.)(twitter\.com|x\.com|t\.co)\.*$/i.test(new URL(href).hostname)));
    report.flows.push('Dynamic Twitter brief and X evidence destinations are suppressed while valid IPFS evidence remains linked');
    assert.deepEqual(report.errors, []);
    assert.equal(axe.violations.length, 0, 'Creator review dialog must pass axe');
    assert.deepEqual(report.blockedExternalRequests, [], 'The fixture must keep all browser requests local');
    assert(fixture.requests.every(request => !/send|sign/i.test(request.method)), 'No transaction or signing RPC may be forwarded');
    report.result = 'passed';
    return report;
  } catch (error) {
    report.result = 'failed'; report.failure = error.stack;
    await capture('live-failure').catch(() => {});
    throw error;
  } finally {
    releaseRpc();
    report.rpcMethods = [...new Set(fixture.requests.map(request => request.method))];
    await writeFile(path.join(output, 'vercairn-live-results.json'), JSON.stringify(report, null, 2) + '\n');
    await context.close();
  }
}
if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true });
  try { console.log(JSON.stringify(await runLiveQa(browser, process.argv[2]), null, 2)); }
  finally { await browser.close(); }
}
