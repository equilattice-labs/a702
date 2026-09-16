import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const output = fileURLToPath(new URL('../output/playwright/', import.meta.url));
const allowedOrigin = 'http://127.0.0.1:42702';

// Independent experience checks. Uses local sample data, no wallet, signing or RPC fixture.
// Long content is deliberately injected into the test DOM and removed by reloading.
export async function runExperienceQa(browser, url = `${allowedOrigin}/`) {
  assert.equal(new URL(url).origin, allowedOrigin, 'Experience QA only visits the local built preview');
  await mkdir(output, { recursive: true });
  const report = {
    date: new Date().toISOString(), url, flows: [], performance: {}, resources: {},
    preferences: {}, syntheticContent: [], screenshots: [], errors: [], failedRequests: [], blockedExternalRequests: [],
    scope: 'Local Chromium emulation; cold browser context, no CPU or network throttling; no real-device or field-performance claim. Synthetic DOM content is not production data.',
  };
  const contexts = [];
  const responseRecords = [];
  async function context(options = {}) {
    const current = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block', ...options });
    contexts.push(current);
    await current.route('**/*', route => {
      const requestUrl = route.request().url();
      if (new URL(requestUrl).origin === allowedOrigin || requestUrl.startsWith('blob:') || requestUrl.startsWith('data:')) return route.continue();
      report.blockedExternalRequests.push(requestUrl);
      return route.abort();
    });
    current.on('page', page => {
      page.setDefaultTimeout(15000);
      page.on('pageerror', error => report.errors.push(error.message));
      page.on('requestfailed', request => report.failedRequests.push({ url: request.url(), failure: request.failure()?.errorText }));
    });
    return current;
  }
  async function ready(page) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.locator('.mission-card').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.match(await page.locator('.preview-notice').innerText(), /Sample missions/);
  }
  async function capture(page, filename, fullPage = false) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: path.join(output, filename), fullPage, scale: 'css' });
    report.screenshots.push(filename);
  }
  async function fit(page, name, selectors) {
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const result = await page.evaluate(({ name, selectors }) => {
      const root = document.documentElement;
      const boxes = selectors.flatMap(selector => Array.from(document.querySelectorAll(selector), el => {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const range = document.createRange();
        range.selectNodeContents(el);
        const textRects = Array.from(range.getClientRects());
        return {
          selector, clientWidth: el.clientWidth, scrollWidth: el.scrollWidth,
          left: rect.left, right: rect.right, width: rect.width,
          scrollOverflow: el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1,
          contentOutsideBox: textRects.some(r => r.width > 0 && (r.left < rect.left - 1 || r.right > rect.right + 1)),
          overflowX: style.overflowX, overflowWrap: style.overflowWrap,
        };
      }));
      return { name, viewport: innerWidth, scrollWidth: root.scrollWidth, boxes };
    }, { name, selectors });
    report.syntheticContent.push(result);
    assert(result.scrollWidth <= result.viewport + 1, `${name}: document overflows`);
    for (const box of result.boxes) {
      assert(!box.scrollOverflow, `${name}: local scroll overflow in ${box.selector}`);
      assert(!box.contentOutsideBox, `${name}: content exceeds ${box.selector}`);
    }
    return result;
  }
  try {
    const desktopContext = await context();
    await desktopContext.addInitScript(() => {
      window.__experienceMetrics = { lcp: null, cls: 0, shifts: [] };
      let sessionValue = 0, sessionStart = 0, previousShift = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__experienceMetrics.lcp = {
          startTime: entry.startTime, size: entry.size,
          element: entry.element?.tagName || null, text: entry.element?.textContent?.trim().slice(0, 160) || null,
        };
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          if (entry.startTime - previousShift < 1000 && entry.startTime - sessionStart < 5000) sessionValue += entry.value;
          else { sessionValue = entry.value; sessionStart = entry.startTime; }
          previousShift = entry.startTime;
          window.__experienceMetrics.cls = Math.max(window.__experienceMetrics.cls, sessionValue);
          window.__experienceMetrics.shifts.push({ time: entry.startTime, value: entry.value });
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const desktop = await desktopContext.newPage();
    desktop.on('response', response => {
      const requestUrl = response.url();
      if (new URL(requestUrl).origin === allowedOrigin) responseRecords.push((async () => {
        const body = await response.body();
        return { path: new URL(requestUrl).pathname, status: response.status(), contentType: response.headers()['content-type'], decodedBytes: body.length };
      })());
    });
    await ready(desktop);
    await desktop.waitForTimeout(600);
    report.performance = await desktop.evaluate(() => ({
      viewport: { width: innerWidth, height: innerHeight },
      fcpMs: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null,
      lcpMs: window.__experienceMetrics.lcp?.startTime ?? null,
      lcpElement: window.__experienceMetrics.lcp,
      cls: window.__experienceMetrics.cls,
      layoutShifts: window.__experienceMetrics.shifts,
      measuredAfterLoadMs: performance.now(),
      navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
    }));
    assert(report.performance.fcpMs !== null && report.performance.lcpMs !== null, 'Cold initial paint metrics must be available');
    report.resources = await desktop.evaluate(() => ({
      fontFaces: Array.from(document.fonts, face => ({ family: face.family, status: face.status })),
      fontLoaded: document.fonts.check('16px "Tessivra Sans"'),
      logos: Array.from(document.querySelectorAll('.brand img'), img => ({ src: img.currentSrc, complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight })),
      timing: performance.getEntriesByType('resource').map(entry => ({ path: new URL(entry.name).pathname, initiatorType: entry.initiatorType, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, decodedBodySize: entry.decodedBodySize, durationMs: entry.duration })),
      stylesheets: Array.from(document.styleSheets, sheet => sheet.href).filter(Boolean),
    }));
    report.resources.responses = await Promise.all(responseRecords);
    report.resources.totalDecodedBytes = report.resources.responses.reduce((sum, response) => sum + response.decodedBytes, 0);
    report.resources.totalResourceTransferBytes = report.resources.timing.reduce((sum, entry) => sum + entry.transferSize, 0);
    assert(report.resources.fontLoaded);
    assert(report.resources.fontFaces.some(face => face.family.includes('Tessivra Sans') && face.status === 'loaded'));
    assert(report.resources.logos.length >= 2 && report.resources.logos.every(logo => logo.complete && logo.naturalWidth > 0));
    assert(report.resources.responses.every(response => response.status === 200));
    await capture(desktop, 'tessivra-full-desktop.png', true);

    await desktop.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
    report.preferences = await desktop.evaluate(() => {
      const activeAnimations = Array.from(document.querySelectorAll('*')).filter(el => {
        const style = getComputedStyle(el);
        return style.animationName !== 'none' && style.animationDuration.split(',').some(value => parseFloat(value) > 0.001);
      }).map(el => ({ tag: el.tagName, className: String(el.className) }));
      const transitions = Array.from(document.querySelectorAll('*')).filter(el => getComputedStyle(el).transitionDuration.split(',').some(value => parseFloat(value) > 0.001));
      const cta = document.querySelector('.hero-actions .button');
      const ctaStyle = getComputedStyle(cta);
      return {
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        forcedColors: matchMedia('(forced-colors: active)').matches,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
        activeAnimations, transitionsOverOneMillisecond: transitions.length,
        primaryAction: { color: ctaStyle.color, background: ctaStyle.backgroundColor, border: ctaStyle.borderColor, borderStyle: ctaStyle.borderStyle },
      };
    });
    assert(report.preferences.reducedMotion && report.preferences.forcedColors);
    assert.equal(report.preferences.activeAnimations.length, 0);
    assert.equal(report.preferences.transitionsOverOneMillisecond, 0);
    assert.equal(report.preferences.scrollBehavior, 'auto');
    await capture(desktop, 'tessivra-forced-colors.png', true);
    await desktop.emulateMedia({ forcedColors: 'none' });

    const mobileContext = await context({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: 'reduce' });
    const mobile = await mobileContext.newPage();
    await ready(mobile);
    report.mobile = await mobile.evaluate(() => ({
      width: innerWidth, height: innerHeight, maxTouchPoints: navigator.maxTouchPoints,
      coarsePointer: matchMedia('(pointer: coarse)').matches, hover: matchMedia('(hover: hover)').matches,
    }));
    assert(report.mobile.maxTouchPoints > 0 && report.mobile.coarsePointer && !report.mobile.hover);
    const allCount = await mobile.locator('.mission-card').count();
    await mobile.getByRole('button', { name: 'Explore missions', exact: true }).tap();
    await mobile.locator('.filter-row').getByRole('button', { name: 'Tokenized assets', exact: true }).tap();
    await mobile.getByRole('searchbox', { name: 'Search missions' }).fill('no matching mobile research 946');
    await mobile.getByRole('heading', { name: 'No matching missions. Yet.' }).waitFor();
    await mobile.getByRole('button', { name: 'Clear search', exact: true }).tap();
    assert.equal(await mobile.getByRole('searchbox', { name: 'Search missions' }).inputValue(), '');
    assert.equal(await mobile.locator('.mission-card').count(), 1);
    assert.equal((await mobile.locator('.mission-card .category-label').innerText()).trim(), 'Tokenized assets');
    assert.equal(await mobile.getByRole('button', { name: 'Remove topic filter', exact: true }).count(), 1);
    report.flows.push('Touch mobile: select Tokenized assets → empty search → tap Clear search; selected topic and its single result are preserved');
    await mobile.getByRole('button', { name: 'Remove topic filter', exact: true }).tap();
    assert.equal(await mobile.locator('.mission-card').count(), allCount);
    const savedTitle = await mobile.locator('.mission-card h3').first().innerText();
    await mobile.locator('.bookmark-button').first().tap();
    await mobile.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).tap();
    assert.equal(await mobile.locator('.mission-card').count(), 1);
    await mobile.locator('.read-brief').tap();
    await mobile.getByRole('dialog').getByRole('heading', { name: savedTitle, exact: true }).waitFor();
    await capture(mobile, 'tessivra-touch-detail.png');
    await mobile.getByRole('button', { name: 'Close dialog', exact: true }).tap();
    assert.equal(await mobile.locator('dialog[open]').count(), 0);
    assert.equal(await mobile.locator('.mission-card h3').innerText(), savedTitle);
    assert.equal(await mobile.locator('.board-toolbar').getByRole('button', { name: /Saved/ }).getAttribute('aria-pressed'), 'true');
    report.flows.push('Touch mobile: save mission → Saved → detail → tap Close dialog returns to the same saved mission and selected Saved view');

    await mobile.getByRole('button', { name: 'Create mission', exact: true }).tap();
    await mobile.locator('#mission-title').fill('Which primary sources explain settlement risk?');
    await mobile.locator('#mission-draft').fill('Compare primary sources and explain their limitations.');
    await mobile.locator('#brief-uri').fill('javascript:alert(1)');
    await mobile.locator('#mission-reward').fill('0.000000000000000001');
    const deadline = new Date(Date.now() + 86400000 * 7);
    await mobile.locator('#mission-deadline').fill(new Date(deadline.getTime() - deadline.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    await mobile.getByRole('button', { name: 'Review your mission', exact: true }).tap();
    assert.equal(await mobile.locator('#brief-uri').getAttribute('aria-invalid'), 'true');
    const validation = await mobile.locator('.field-error').innerText();
    assert(validation.length > 0);
    await mobile.locator('#brief-uri').fill('https://example.com/research');
    await mobile.getByRole('button', { name: 'Review your mission', exact: true }).tap();
    await mobile.locator('.review-mission').waitFor();
    assert.match(await mobile.locator('.review-mission').innerText(), /0\.000000000000000001 testnet ETH/);
    assert.match(await mobile.locator('.create-progress .active').innerText(), /02.*Review & fund/);
    await capture(mobile, 'tessivra-touch-review.png');
    const downloadPromise = mobile.waitForEvent('download');
    await mobile.getByRole('button', { name: 'Download brief', exact: true }).tap();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'tessivra-research-brief.md');
    const downloadedBrief = await readFile(await download.path(), 'utf8');
    assert.match(downloadedBrief, /Tessivra/);
    assert.match(downloadedBrief, /0\.000000000000000001 testnet ETH/);
    report.download = { suggestedFilename: download.suggestedFilename(), bytes: Buffer.byteLength(downloadedBrief), exactOneWei: true, validation };
    report.flows.push('Touch mobile: create → invalid URL feedback → correct URL → review → download a Tessivra markdown draft preserving exactly 1 wei');
    await mobile.getByRole('button', { name: 'Close dialog', exact: true }).tap();

    // Synthetic stress data: no requests or app data are mutated by these assignments.
    await mobile.reload({ waitUntil: 'networkidle' });
    await mobile.locator('.mission-card').first().waitFor();
    await mobile.locator('.mission-card').first().evaluate(card => {
      card.dataset.qaSyntheticContent = 'true';
      card.querySelector('h3 button').textContent = 'SettlementResearch'.repeat(14);
      card.querySelector('.mission-description').textContent = 'PrimaryEvidence'.repeat(30);
      card.querySelector('.mission-reward strong').textContent = '115792089237316195423570985008687907853269984665640564039457.58400 ETH';
    });
    await fit(mobile, 'Synthetic long unbroken mobile card title, description and uint256-scale amount', ['.mission-card:first-child', '.mission-card:first-child .card-main', '.mission-card:first-child .card-aside', '.mission-card:first-child h3', '.mission-card:first-child .mission-description', '.mission-card:first-child .mission-reward']);
    await mobile.locator('.mission-card').first().scrollIntoViewIfNeeded();
    await capture(mobile, 'tessivra-synthetic-long-card.png');
    await mobile.getByRole('searchbox', { name: 'Search missions' }).fill('synthetic-filter');
    await mobile.getByRole('button', { name: 'Remove search filter', exact: true }).evaluate(el => {
      el.dataset.qaSyntheticContent = 'true';
      el.childNodes[0].textContent = 'EvidenceFilter'.repeat(28);
    });
    await fit(mobile, 'Synthetic long unbroken active-filter label', ['.active-filters', '.active-filters button']);
    await mobile.locator('.active-filters').scrollIntoViewIfNeeded();
    await capture(mobile, 'tessivra-synthetic-long-filter.png');
    await mobile.reload({ waitUntil: 'networkidle' });
    await mobile.locator('.read-brief').first().tap();
    report.dialogInset = await mobile.locator('.dialog-topline').evaluate(el => ({
      rightMargin: getComputedStyle(el).marginRight,
      closeButtonRight: el.querySelector('button').getBoundingClientRect().right,
      dialogRight: el.closest('dialog').getBoundingClientRect().right,
      note: 'The topline has an intentional negative 9px right margin into dialog padding. Check the dialog and long title boundaries rather than treating its smaller content wrapper as the clipping boundary.',
    }));
    assert(report.dialogInset.closeButtonRight < report.dialogInset.dialogRight);
    await mobile.locator('#dialog-title').evaluate(el => { el.dataset.qaSyntheticContent = 'true'; el.textContent = 'MultilingualResearch研究'.repeat(18); });
    await fit(mobile, 'Synthetic long multilingual detail title', ['dialog[open]', '#dialog-title']);
    await capture(mobile, 'tessivra-synthetic-long-detail.png');
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.failedRequests, []);
    assert.deepEqual(report.blockedExternalRequests, []);
    report.result = 'passed';
    return report;
  } catch (error) {
    report.result = 'failed';
    report.failure = error.stack;
    throw error;
  } finally {
    await writeFile(path.join(output, 'tessivra-experience.json'), JSON.stringify(report, null, 2) + '\n');
    for (const current of contexts) await current.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ headless: true });
  try {
    const report = await runExperienceQa(browser, process.argv[2]);
    console.log(JSON.stringify({ result: report.result, flows: report.flows, performance: report.performance, resources: report.resources.totalDecodedBytes, screenshots: report.screenshots }, null, 2));
  } finally { await browser.close(); }
}
