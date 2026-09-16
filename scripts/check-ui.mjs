import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;

const output = fileURLToPath(new URL('../output/playwright/', import.meta.url));
const socialHost = /(^|\.)(twitter\.com|x\.com|t\.co)\.*$/i;
const tags = ['wcag2a', 'wcag2aa', 'wcag21aa'];

// Runs only against the local sample preview. No wallet is installed or connected.
// Pass an existing browser for interactive QA; the caller retains its ownership.
export async function runUiQa(browser, url = 'http://127.0.0.1:42702/') {
  assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'QA requires a local preview');
  await mkdir(output, { recursive: true });
  const report = { date: new Date().toISOString(), url, flows: [], viewports: [], accessibility: [], errors: [] };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  let featuredTitle;
  page.on('pageerror', error => report.errors.push(error.message));
  async function audit(name) {
    const results = await new AxeBuilder({ page }).withTags(tags).analyze();
    report.accessibility.push({ name, violations: results.violations });
  }
  async function capture(name) {
    await page.screenshot({ path: path.join(output, `tessivra-${name}.png`), scale: 'css' });
  }
  async function assertSelectedTab(name) {
    const tablist = page.getByRole('tablist', { name: 'Mission sections' });
    const selectedTab = tablist.getByRole('tab', { name, selected: true });
    await selectedTab.waitFor();
    assert.equal(await selectedTab.getAttribute('tabindex'), '0');
    assert.equal(await selectedTab.evaluate(el => el === document.activeElement), true, 'Arrow navigation keeps focus on the selected tab');
    for (const tab of await tablist.getByRole('tab', { selected: false }).all()) {
      assert.equal(await tab.getAttribute('tabindex'), '-1', 'Inactive tabs do not add extra Tab stops');
    }
    const panel = page.getByRole('tabpanel');
    assert.equal(await panel.count(), 1, 'Only the selected mission panel is exposed');
    assert.equal(await panel.getAttribute('id'), await selectedTab.getAttribute('aria-controls'));
    assert.equal(await panel.getAttribute('aria-labelledby'), await selectedTab.getAttribute('id'));
  }
  async function openFeaturedMission() {
    await page.getByRole('button', { name: 'Open featured mission', exact: true }).click();
    await page.getByRole('dialog').getByRole('heading', { name: featuredTitle, exact: true }).waitFor();
    assert.equal(await page.locator('#dialog-title').innerText(), featuredTitle, 'The featured action keeps its registry mission independently of board filters and sorting');
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button', { name: 'Open featured mission', exact: true }).evaluate(el => el === document.activeElement), true);
  }
  try {
    await page.goto(url);
    await page.locator('.mission-card').first().waitFor();
    assert.match(await page.title(), /^Tessivra/);
    assert.match(await page.locator('.preview-notice').innerText(), /Sample missions/);
    const count = await page.locator('.mission-card').count();
    featuredTitle = await page.locator('.mission-card h3').first().innerText();
    assert.equal(await page.locator('meta[name^="twitter:"]').count(), 0);
    const links = await page.locator('a[href]').evaluateAll(els => els.map(el => el.href));
    assert(!links.some(href => socialHost.test(new URL(href).hostname)));
    await openFeaturedMission();
    report.flows.push('Featured mission opens its registry brief and Escape restores its trigger focus');

    // Search, every topic, all sort choices, empty recovery and saved persistence.
    await page.getByRole('button', { name: 'Explore missions', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Search missions' }).fill('no matching question 946');
    await page.getByRole('heading', { name: 'No matching missions. Yet.' }).waitFor();
    await openFeaturedMission();
    assert.equal(await page.locator('.mission-card').count(), 0, 'Opening the editorial feature does not change an empty board search');
    await page.locator('.empty-state').getByRole('button', { name: 'Clear filters' }).click();
    assert.equal(await page.locator('.mission-card').count(), count);
    for (const topic of ['Market structure', 'Tokenized assets', 'Ecosystem', 'Risk research']) {
      await page.locator('.filter-row').getByRole('button', { name: topic, exact: true }).click();
      assert.equal(await page.locator('.mission-card').count(), 1);
      assert.equal((await page.locator('.mission-card .category-label').innerText()).trim(), topic);
    }
    await page.locator('.filter-row').getByRole('button', { name: 'Tokenized assets', exact: true }).click();
    await openFeaturedMission();
    const searchbox = page.getByRole('searchbox', { name: 'Search missions' });
    await searchbox.fill('no matching question 946');
    await page.getByRole('heading', { name: 'No matching missions. Yet.' }).waitFor();
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    assert.equal(await searchbox.inputValue(), '');
    assert.equal(await page.locator('.mission-card').count(), 1, 'Clearing search preserves the selected topic');
    assert.equal((await page.locator('.mission-card .category-label').innerText()).trim(), 'Tokenized assets');
    await page.locator('.active-filters').getByRole('button', { name: 'Remove topic filter', exact: true }).waitFor();
    assert.equal(await page.locator('.active-filters').getByRole('button', { name: 'Remove search filter', exact: true }).count(), 0);
    await searchbox.fill('custody');
    await page.locator('.active-filters').getByRole('button', { name: 'Remove search filter', exact: true }).click();
    assert.equal(await searchbox.inputValue(), '');
    assert.equal(await page.locator('.mission-card').count(), 1, 'Removing the keyword chip preserves the topic');
    await searchbox.fill('custody');
    await page.locator('.active-filters').getByRole('button', { name: 'Remove topic filter', exact: true }).click();
    assert.equal(await searchbox.inputValue(), 'custody', 'Removing the topic chip preserves the search query');
    assert.equal(await page.locator('.active-filters').getByRole('button', { name: 'Remove topic filter', exact: true }).count(), 0);
    await page.locator('.active-filters').getByRole('button', { name: 'Remove search filter', exact: true }).click();
    assert.equal(await page.locator('.mission-card').count(), count);
    assert.equal(await page.locator('.active-filters').count(), 0);
    report.flows.push('Search clear and keyword chip preserve the topic; topic chip preserves the keyword; clearing both restores all missions');
    await page.locator('.filter-row').getByRole('button', { name: 'All topics', exact: true }).click();
    for (const sort of ['recommended', 'newest', 'reward', 'deadline']) {
      await page.getByLabel('Sort missions', { exact: true }).selectOption(sort);
      assert.equal(await page.locator('.mission-card').count(), count);
      if (sort === 'reward') {
        assert.match(await page.locator('.mission-card').first().innerText(), /0\.12/);
        await openFeaturedMission();
      }
    }
    const savedTitle = await page.locator('.mission-card h3').first().innerText();
    await page.locator('.bookmark-button').first().click();
    assert.match(await page.locator('.toast').innerText(), /Saved to your list/);
    await page.locator('.toast').getByRole('button', { name: 'Undo', exact: true }).waitFor();
    await page.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).click();
    assert.equal(await page.locator('.mission-card').count(), 1);
    await page.reload();
    await page.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).click();
    assert.equal(await page.locator('.mission-card h3').innerText(), savedTitle);
    await page.locator('.bookmark-button').click();
    await page.getByRole('heading', { name: 'Keep your next question close.' }).waitFor();
    assert.match(await page.locator('.toast').innerText(), /Removed from your saved list/);
    assert.equal(await page.locator('.toast a').count(), 0, 'Bookmark notices contain no transaction link');
    await page.locator('.toast').getByRole('button', { name: 'Undo', exact: true }).click();
    await page.locator('.mission-card h3').waitFor();
    assert.equal(await page.locator('.mission-card h3').innerText(), savedTitle, 'Undo restores the removed mission directly in Saved');
    assert.equal(await page.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('.toast').innerText(), /Saved-list change undone/);
    assert.equal(await page.locator('.toast').getByRole('button', { name: 'Undo', exact: true }).count(), 0, 'A completed Undo does not expose the obsolete action');
    await page.reload();
    await page.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).click();
    assert.equal(await page.locator('.mission-card h3').innerText(), savedTitle, 'The restored bookmark survives a reload');
    await page.locator('.bookmark-button').click();
    await page.getByRole('heading', { name: 'Keep your next question close.' }).waitFor();
    await page.getByRole('button', { name: 'Explore all missions', exact: true }).click();
    report.flows.push('Saved removal offers Undo; Undo restores the row in Saved and persists after reload; a later removal still reaches the empty-state recovery');
    report.flows.push('Search → empty → recover; every topic and sort; save → reload → unsave → explore');

    // Dialog sections, disabled sample actions, keyboard Escape and focus restoration.
    await page.locator('.read-brief').first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Save brief', exact: true }).click();
    const bookmarkFeedback = page.locator('.bookmark-feedback');
    assert(await bookmarkFeedback.isVisible(), 'Bookmark feedback is inside the native modal');
    await bookmarkFeedback.getByRole('button', { name: 'Undo', exact: true }).click();
    assert.equal(await page.locator('.save-detail').getAttribute('aria-pressed'), 'false');
    await bookmarkFeedback.getByRole('button', { name: 'Dismiss notification', exact: true }).click();
    report.flows.push('Detail save offers immediate in-dialog Undo and dismiss; Undo restores the original bookmark state');
    await page.getByRole('button', { name: 'Explore contribution options' }).click();
    assert.equal(await page.locator('#evidence-uri').evaluate(el => el === document.activeElement), true);
    assert(await page.getByRole('button', { name: 'Submit research' }).isDisabled());
    assert(await page.getByRole('button', { name: 'Fund this mission' }).isDisabled());
    await page.locator('.detail-tabs').getByRole('tab', { name: /Review/ }).click();
    await page.locator('.detail-tabs').getByRole('tab', { name: 'Brief', exact: true }).click();
    await assertSelectedTab('Brief');
    for (const [key, name] of [['ArrowRight', 'Contribute'], ['End', /Review/], ['ArrowRight', 'Brief'], ['ArrowLeft', /Review/], ['Home', 'Brief']]) {
      await page.keyboard.press(key);
      await assertSelectedTab(name);
    }
    await capture('detail-desktop');
    await audit('desktop-detail');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('.read-brief').first().evaluate(el => el === document.activeElement), true);
    report.flows.push('Brief → contribute → review → brief; ArrowLeft/Right and Home/End select, focus and wrap semantic tabs; sample actions disabled; Escape restores focus');

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
    assert.equal(download.suggestedFilename(), 'tessivra-research-brief.md');
    assert.match(await readFile(await download.path(), 'utf8'), /Tessivra/);
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
      // Resize observers, media-query listeners and Vue updates settle across frames.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const fit = await page.evaluate(() => {
        const rect = document.querySelector('.hero-actions .button').getBoundingClientRect();
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, cta: { left: rect.left, right: rect.right, bottom: rect.bottom }, fontLoaded: document.fonts.check('16px "Tessivra Sans"') };
      });
      report.viewports.push(fit);
      assert(fit.scrollWidth <= width, `Horizontal overflow at ${width}: document width ${fit.scrollWidth}`);
      assert(fit.cta.left >= 0 && fit.cta.right <= width && fit.cta.bottom <= (width < 768 ? 844 : 1000), `Primary action clipped at ${width}`);
      assert(fit.fontLoaded);
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
    for (const { name, violations } of report.accessibility) {
      assert.equal(violations.length, 0, `${name}: ${violations.map(v => `${v.id}: ${v.nodes.map(n => n.target)}`).join('; ')}`);
    }
    report.result = 'passed';
    return report;
  } catch (error) {
    report.result = 'failed';
    report.failure = error.stack;
    await capture('ui-failure').catch(() => {});
    throw error;
  } finally {
    await writeFile(path.join(output, 'tessivra-ui-results.json'), JSON.stringify(report, null, 2) + '\n');
    await context.close();
  }
}

if (typeof process !== 'undefined' && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true });
  try { console.log(JSON.stringify(await runUiQa(browser, process.argv[2]), null, 2)); }
  finally { await browser.close(); }
}
