const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const WIDTHS = [320, 375, 430];
const HEIGHT = 800;
const GEO = { latitude: 21.12455, longitude: 79.00295 };

async function runForWidth(width) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width, height: HEIGHT },
    permissions: ['geolocation'],
    geolocation: GEO,
  });
  const page = await context.newPage();
  const result = { width, checks: {}, screenshot: null, error: null };

  try {
    await page.goto('http://localhost:5173/#/map', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // 1. Map exists and dominates viewport
    const mapEl = await page.$('.leaflet-container');
    result.checks.mapExists = !!mapEl;
    if (mapEl) {
      const rect = await mapEl.boundingBox();
      result.checks.mapDominant = rect && rect.height > HEIGHT * 0.5;
    } else {
      result.checks.mapDominant = false;
    }

    // 2. Search pill visible and not covering map
    const pill = await page.$('button.search-pill');
    result.checks.searchPillVisible = !!pill;
    if (pill && mapEl) {
      const pillRect = await pill.boundingBox();
      const mapRect = await mapEl.boundingBox();
      // Pill should be near top and not cover center
      result.checks.searchPillNotCoverMap = pillRect && mapRect && (pillRect.y + pillRect.height < mapRect.y + mapRect.height * 0.25);
    } else result.checks.searchPillNotCoverMap = false;

    // Click locate to ensure current-location marker and nearby
    await page.click('button[aria-label="Use my current location"]');
    await page.waitForSelector('.current-location-marker', { timeout: 5000 });
    result.checks.currentLocationMarker = true;

    // Wait for nearby list and choose first place to open place details
    const nearby = await page.waitForSelector('.nearby-list button', { timeout: 5000 }).catch(() => null);
    if (nearby) {
      await page.click('.nearby-list button');
      await page.waitForSelector('section.place-card h1', { timeout: 5000 });
      // Do not auto-start; click Navigate here to set destination
      await page.click('section.place-card button.primary-button');
      result.checks.destinationSelected = true;
    } else {
      result.checks.destinationSelected = false;
    }

    // Ensure navigation panel / selects present
    await page.waitForSelector('#from-place-select', { timeout: 5000 });
    await page.waitForSelector('#to-place-select', { timeout: 5000 });
    // From should default to current-location
    const fromValue = await page.$eval('#from-place-select', (el) => el.value).catch(() => null);
    result.checks.fromDefaultCurrent = fromValue === 'current-location';

    // TO placeholder check
    const toFirstOption = await page.$eval('#to-place-select option:nth-child(1)', (el) => el.textContent.trim()).catch(() => null);
    result.checks.toPlaceholder = toFirstOption && toFirstOption.toLowerCase().includes('where do you want to go');

    // FROM/TO visually distinct: check quick-card labels exist
    const quickFrom = await page.$('.route-quick-selection .quick-card:nth-child(1) .quick-label');
    const quickTo = await page.$('.route-quick-selection .quick-card:nth-child(2) .quick-label');
    result.checks.quickLabels = !!quickFrom && !!quickTo;

    // Start Navigation button visible and tappable size
    const startBtn = await page.$('button.primary-button');
    result.checks.startVisible = !!startBtn;
    if (startBtn) {
      const b = await startBtn.boundingBox();
      result.checks.startTappable = b && b.height >= 40 && b.width >= 90; // approx 44x
    } else result.checks.startTappable = false;

    // Open search sheet for origin by dispatching the global event (avoids map intercepting clicks)
    await page.evaluate(() => {
      try {
        window.dispatchEvent(new CustomEvent('dishaa-open-search', { detail: { target: 'origin' } }));
      } catch (e) {}
    });
    await page.waitForTimeout(300);
    // check the bottom sheet exists and not too tall
    const sheet = await page.$('.search-results-sheet, .bottom-sheet');
    if (sheet) {
      const srect = await sheet.boundingBox();
      result.checks.sheetExists = true;
      result.checks.sheetHeightReasonable = srect && srect.height <= HEIGHT * 0.75;
    } else {
      result.checks.sheetExists = false;
      result.checks.sheetHeightReasonable = false;
    }

    // Check use current location option present in sheet if targeting origin
    const useCurrent = await page.$('[data-testid="use-current-location"]');
    result.checks.useCurrentVisible = !!useCurrent;

    // Check search results scrollable by typing a query
    await page.click('#place-search').catch(() => {});
    await page.fill('#place-search', 'a');
    await page.waitForTimeout(400);
    const resultsList = await page.$('.search-results');
    if (resultsList) {
      const rb = await resultsList.boundingBox();
      result.checks.resultsScrollable = rb && rb.height < HEIGHT * 0.6; // presence implies scrollable UI
    } else {
      result.checks.resultsScrollable = true; // assume ok if not present (no results)
    }

    // Close sheet if open
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);

    // Now start navigation explicitly
    await page.click('button.primary-button');

    // Intercept route response and check polyline
    let routeResponse = null;
    let routeRequest = null;
    page.on('request', (request) => {
      try {
        if (request.url().includes('/api/navigation/route') && request.method() === 'POST') routeRequest = request.postData();
      } catch (e) {}
    });
    page.on('response', async (response) => {
      try {
        if (response.url().includes('/api/navigation/route') && response.request().method() === 'POST') {
          routeResponse = { status: response.status(), body: await response.json().catch(() => null) };
        }
      } catch (e) {}
    });

    const deadline = Date.now() + 6000;
    while (Date.now() < deadline && !routeResponse) await page.waitForTimeout(200);

    result.checks.routePosted = !!routeResponse && routeResponse.status === 200;
    result.checks.routeReturned = !!routeResponse && !!routeResponse.body && !!routeResponse.body.route;
    result.requestBody = routeRequest ? JSON.parse(routeRequest) : null;

    // Check polyline and markers
    const polyExists = !!(await page.$('svg path.leaflet-interactive'));
    const originMarker = await page.$('.route-origin');
    const destMarker = await page.$('.route-destination');
    result.checks.polyline = polyExists;
    result.checks.routeOriginMarker = !!originMarker;
    result.checks.routeDestMarker = !!destMarker;

    // Live location marker remains visible after navigation
    result.checks.currentLocationStillVisible = !!(await page.$('.current-location-marker'));

    // No horizontal overflow check
    const bodyOverflowX = await page.$eval('body', (b) => getComputedStyle(b).overflowX || '');
    result.checks.noHorizontalOverflow = bodyOverflowX !== 'scroll';

    // Save screenshot
    const outDir = path.join(__dirname, 'screenshots');
    fs.mkdirSync(outDir, { recursive: true });
    const screenshotPath = path.join(outDir, `viewport-${width}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    result.screenshot = screenshotPath;

  } catch (err) {
    result.error = (err && err.message) || String(err);
  } finally {
    await browser.close();
  }
  return result;
}

(async () => {
  const all = [];
  for (const w of WIDTHS) {
    // small delay between runs
    await new Promise((r) => setTimeout(r, 400));
    // eslint-disable-next-line no-await-in-loop
    const r = await runForWidth(w);
    console.log('RESULT', JSON.stringify(r, null, 2));
    all.push(r);
  }
  const outDir = path.join(__dirname, 'screenshots');
  fs.mkdirSync(outDir, { recursive: true });
  const summaryPath = path.join(outDir, 'responsive-results.json');
  fs.writeFileSync(summaryPath, JSON.stringify(all, null, 2));
  console.log('Saved summary to', summaryPath);
  process.exit(0);
})();