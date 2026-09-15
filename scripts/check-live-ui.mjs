import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const qa = require('./citeward-rpc-fixture.cjs');

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
  await page.route('**/__qa_rpc', route => fixture.fulfillRpc(route));
  await page.addInitScript(qa.installWallet, fixture.walletOptions());
  const review = async () => {
    await page.locator('.detail-tabs').getByRole('button', { name: /Review/ }).click();
    await page.locator('.contribution-card').nth(1).waitFor();
  };
  const capture = name => page.screenshot({ path: path.join(output, `citeward-${name}.png`), scale: 'css' });
  try {
    await page.goto(url);
    await page.locator('.read-brief').first().waitFor();
    assert(configIntercepted, 'Live QA must intercept the Vite configuration before exercising controls');
    // eth_accounts already returns the creator; there is no Connect wallet step.
    await page.locator('.read-brief').first().click();
    await review();
    await page.getByRole('button', { name: 'Approve', exact: true }).waitFor();
    assert.match(await page.locator('.contribution-card').first().innerText(), new RegExp(qa.PENDING_CONTRIBUTOR));
    await page.locator('#approval-0').fill('0.000000000000000001');
    assert.equal(await page.locator('#approval-0').inputValue(), '0.000000000000000001');
    assert(!await page.getByRole('button', { name: 'Approve', exact: true }).isDisabled());
    await capture('creator-review');
    const axe = await new AxeBuilder({ page }).include('dialog[open]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    report.accessibility.push({ name: 'creator-review-dialog', violations: axe.violations });
    assert.equal(axe.violations.length, 0, 'Creator review dialog must pass axe');
    // This amount is rejected locally before any wallet or transaction request.
    await page.locator('#approval-0').fill('0.2');
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await page.locator('#approval-error-0').waitFor();
    assert.equal(await page.locator('#approval-0').getAttribute('aria-invalid'), 'true');
    assert.match(await page.locator('#approval-error-0').innerText(), /exceeds.*unallocated reward pool/);
    report.flows.push('Creator sees reward recipient, accepts exact 1 wei input, and receives an associated over-allocation error');
    await page.evaluate(address => window.__citewardQaWallet.setAccount(address), qa.VIEWER);
    await page.getByRole('button', { name: 'Approve', exact: true }).waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#approval-0').count(), 0);
    report.flows.push('Non-creator cannot see approval controls');

    fixture.setState({ mode: 'expired', unsafeEvidence: true });
    await page.reload();
    await page.locator('.read-brief').first().click();
    await page.locator('.detail-tabs').getByRole('button', { name: 'Contribute', exact: true }).click();
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
    await page.locator('.error-state').scrollIntoViewIfNeeded();
    await capture('rpc-error');
    fixture.setState({ mode: 'open', unsafeEvidence: false });
    await page.locator('.error-state').getByRole('button', { name: 'Try again', exact: true }).click();
    await page.locator('.mission-card').first().waitFor();
    assert.equal(await page.locator('.error-state').count(), 0);
    report.flows.push('RPC failure displays retry and recovers missions after the fixture is restored');
    await page.evaluate(() => window.__citewardQaWallet.setChain('0x1'));
    await page.getByRole('button', { name: 'Open your rewards', exact: true }).click();
    await page.getByRole('button', { name: 'Switch network', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Switch network', exact: true }).click();
    await page.locator('.reward-balance').waitFor();
    await page.getByRole('button', { name: 'Claim rewards', exact: true }).waitFor();
    assert(!await page.getByRole('button', { name: 'Claim rewards', exact: true }).isDisabled());
    report.flows.push('Wrong-network rewards prompt switches the fixture wallet and restores the 1 wei claim balance');
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.blockedExternalRequests, [], 'The fixture must keep all browser requests local');
    assert(fixture.requests.every(request => !/send|sign/i.test(request.method)), 'No transaction or signing RPC may be forwarded');
    report.result = 'passed';
    return report;
  } catch (error) {
    report.result = 'failed'; report.failure = error.stack;
    throw error;
  } finally {
    report.rpcMethods = [...new Set(fixture.requests.map(request => request.method))];
    await writeFile(path.join(output, 'citeward-live-results.json'), JSON.stringify(report, null, 2) + '\n');
    await context.close();
  }
}
if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true });
  try { console.log(JSON.stringify(await runLiveQa(browser, process.argv[2]), null, 2)); }
  finally { await browser.close(); }
}
