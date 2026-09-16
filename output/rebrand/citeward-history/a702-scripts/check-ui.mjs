import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const output = fileURLToPath(new URL('../output/playwright/', import.meta.url));
const socialHost = /(^|\.)(twitter\.com|x\.com|t\.co)$/i;
const tags = ['wcag2a', 'wcag2aa', 'wcag21aa'];

// Runs only against the local sample preview. No wallet is installed or connected.
// Pass an existing browser for interactive QA; the caller retains its ownership.
export async function runUiQa(browser, url = 'http://127.0.0.1:42702/') {
  assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'QA requires a local preview');
  await mkdir(output, { recursive: true });
  const report = { date: new Date().toISOString(), url, flows: [], viewports: [], accessibility: [], errors: [] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  async function audit(name) {
    const results = await new AxeBuilder({ page }).withTags(tags).analyze();
    report.accessibility.push({ name, violations: results.violations });
    assert.equal(results.violations.length, 0, `${name}: ${results.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target)}`).join('; ')}`);
  }
  async function capture(name) {
    await page.screenshot({ path: path.join(output, `citeward-${name}.png`), scale: 'css' });
  }
  try {
    await page.goto(url);
    await page.locator('.mission-card').first().waitFor();
    assert.match(await page.title(), /^Citeward/);
    assert.match(await page.locator('.preview-notice').innerText(), /Sample missions/);
    const count = await page.locator('.mission-card').count();
    assert.equal(await page.locator('meta[name^="twitter:"]').count(), 0);
    const links = await page.locator('a[href]').evaluateAll(els => els.map(el => el.href));
    assert(!links.some(href => socialHost.test(new URL(href).hostname)));

    // Search, every topic, all sort choices, empty recovery and saved persistence.
    await page.getByRole('button', { name: 'Explore missions', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search missions' }).fill('no matching question 946');
    await page.getByRole('heading', { name: 'No matching missions. Yet.' }).waitFor();
    await page.locator('.empty-state').getByRole('button', { name: 'Clear filters' }).click();
    assert.equal(await page.locator('.mission-card').count(), count);
    for (const topic of ['Market structure', 'Tokenized assets', 'Ecosystem', 'Risk research']) {
      await page.locator('.filter-row').getByRole('button', { name: topic, exact: true }).click();
      assert.equal(await page.locator('.mission-card').count(), 1);
      assert.equal((await page.locator('.mission-card .category-label').innerText()).trim(), topic);
    }
    await page.locator('.filter-row').getByRole('button', { name: 'All topics', exact: true }).click();
    for (const sort of ['recommended', 'newest', 'reward', 'deadline']) {
      await page.getByLabel('Sort missions', { exact: true }).selectOption(sort);
      assert.equal(await page.locator('.mission-card').count(), count);
      if (sort === 'reward') assert.match(await page.locator('.mission-card').first().innerText(), /0\.12/);
    }
    const savedTitle = await page.locator('.mission-card h3').first().innerText();
    await page.locator('.bookmark-button').first().click();
    await page.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).click();
    assert.equal(await page.locator('.mission-card').count(), 1);
    await page.reload();
    await page.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).click();
    assert.equal(await page.locator('.mission-card h3').innerText(), savedTitle);
    await page.locator('.bookmark-button').click();
    await page.getByRole('heading', { name: 'Keep your next question close.' }).waitFor();
    await page.getByRole('button', { name: 'Explore all missions', exact: true }).click();
    report.flows.push('Search → empty → recover; every topic and sort; save → reload → unsave → explore');

    // Dialog sections, disabled sample actions, keyboard Escape and focus restoration.
    await page.locator('.read-brief').first().click();
    await page.getByRole('button', { name: 'Explore contribution options' }).click();
    assert.equal(await page.locator('#evidence-uri').evaluate(el => el === document.activeElement), true);
    assert(await page.getByRole('button', { name: 'Submit research' }).isDisabled());
    assert(await page.getByRole('button', { name: 'Fund this mission' }).isDisabled());
    await page.locator('.detail-tabs').getByRole('button', { name: /Review/ }).click();
    await page.locator('.detail-tabs').getByRole('button', { name: 'Brief', exact: true }).click();
    await capture('detail-desktop');
    await audit('desktop-detail');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('.read-brief').first().evaluate(el => el === document.activeElement), true);
    report.flows.push('Brief → contribute → review → brief; sample transaction controls disabled; Escape restores focus');

    // Invalid URL recovery, exact wei amount, review/edit/download and retained draft.
    await page.getByRole('button', { name: 'Create mission', exact: true }).click();
    await page.getByLabel('What would you like to understand?', { exact: true }).fill('Which primary sources explain settlement risk?');
    await page.locator('#mission-draft').fill('Compare primary sources and explain their limitations.');
    await page.getByLabel('Public brief URL', { exact: true }).fill('javascript:alert(1)');
    await page.getByLabel('Reward pool · testnet ETH', { exact: true }).fill('0.000000000000000001');
    const deadline = new Date(Date.now() + 86400000 * 7);
    await page.locator('#mission-deadline').fill(new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    await page.getByRole('button', { name: 'Review your mission', exact: true }).click();
    assert.equal(await page.locator('#brief-uri').getAttribute('aria-invalid'), 'true');
    await page.locator('#brief-uri').fill('https://example.com/research');
    await page.getByRole('button', { name: 'Review your mission', exact: true }).click();
    await page.locator('.review-mission').waitFor();
    assert.match(await page.locator('.review-mission').innerText(), /0\.000000000000000001/);
    assert.equal(await page.locator('.review-mission h3').evaluate(el => el === document.activeElement), true);
    const downloaded = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download brief', exact: true }).click();
    const download = await downloaded;
    assert.equal(download.suggestedFilename(), 'citeward-research-brief.md');
    assert.match(await readFile(await download.path(), 'utf8'), /Citeward/);
    await page.getByRole('button', { name: 'Edit brief', exact: true }).click();
    assert.equal(await page.locator('#mission-reward').inputValue(), '0.000000000000000001');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Create mission', exact: true }).click();
    assert.equal(await page.locator('#mission-title').inputValue(), 'Which primary sources explain settlement risk?');
    await page.keyboard.press('Escape');
    report.flows.push('Create → invalid URL feedback → correct → review 1 wei → download → edit → reopen retained draft');

    await page.locator('.board-toolbar').getByRole('button', { name: 'My missions', exact: true }).click();
    await page.locator('.empty-state').getByRole('button', { name: 'Connect wallet' }).click();
    await page.getByText(/No Ethereum wallet found/i).first().waitFor();
    await page.locator('.board-toolbar').getByRole('button', { name: 'All missions', exact: true }).click();
    await page.getByRole('button', { name: 'View your rewards', exact: true }).click();
    await page.getByRole('heading', { name: 'Connect to see your rewards.' }).waitFor();
    await page.keyboard.press('Escape');
    await page.locator('.board-help').getByRole('button', { name: 'Contributor guide' }).click();
    await page.getByRole('heading', { name: 'The contributor guide', exact: true }).waitFor();
    await page.keyboard.press('Escape');
    for (const summary of await page.locator('.faqs summary').all()) { await summary.click(); await summary.click(); }
    await page.getByRole('button', { name: /Back to top/ }).click();
    report.flows.push('My missions / missing wallet feedback; rewards, guide, all FAQ toggles, back to top');

    // Numeric fit and separate screenshots at all supported breakpoints.
    await page.reload();
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.locator('.mission-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      const fit = await page.evaluate(() => {
        const rect = document.querySelector('.hero-actions .button').getBoundingClientRect();
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, cta: { left: rect.left, right: rect.right, bottom: rect.bottom }, fontLoaded: document.fonts.check('16px "Citeward Sans"') };
      });
      assert(fit.scrollWidth <= width, `Horizontal overflow at ${width}`);
      assert(fit.cta.left >= 0 && fit.cta.right <= width && fit.cta.bottom <= (width < 768 ? 844 : 1000), `Primary action clipped at ${width}`);
      assert(fit.fontLoaded);
      report.viewports.push(fit);
      await capture(String(width));
      if ([320, 390, 1440].includes(width)) await audit(`page-${width}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    assert.equal(await page.locator('.workspace').getAttribute('inert'), '');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('.sidebar .full').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Close menu' }).evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button', { name: 'Toggle navigation' }).getAttribute('aria-expanded'), 'false');
    await page.getByRole('button', { name: 'Toggle navigation' }).click();
    await page.locator('.sidebar').getByRole('button', { name: 'Create a mission', exact: true }).click();
    await page.locator('dialog[open]').waitFor();
    assert(Number.parseFloat(await page.locator('#mission-title').evaluate(el => getComputedStyle(el).fontSize)) >= 16);
    await capture('create-mobile');
    await audit('mobile-create');
    await page.keyboard.press('Escape');
    await page.locator('.read-brief').first().click();
    await capture('detail-mobile');
    await page.keyboard.press('Escape');
    report.flows.push('Mobile menu: focus wrap, Escape, create; 16px form input; mobile detail');
    assert.deepEqual(report.errors, []);
    report.result = 'passed';
    return report;
  } catch (error) {
    report.result = 'failed';
    report.failure = error.stack;
    throw error;
  } finally {
    await writeFile(path.join(output, 'citeward-ui-results.json'), JSON.stringify(report, null, 2) + '\n');
    await context.close();
  }
}

if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true });
  try { console.log(JSON.stringify(await runUiQa(browser, process.argv[2]), null, 2)); }
  finally { await browser.close(); }
}
