const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: 21.12455, longitude: 79.00295 } });
  const page = await context.newPage();
  try {
    await page.goto('http://localhost:5173/#/map', { waitUntil: 'networkidle' });
    await page.waitForSelector('button.search-pill', { timeout: 5000 });
    await page.click('button.search-pill');
    await page.waitForTimeout(400);
    // Look for the 'Use my current location' button inside the bottom sheet
    const useBtn = await page.$('text=Use my current location');
    console.log('use-current-location-visible:', !!useBtn);
  } catch (e) {
    console.error('ERR', e.message);
    process.exitCode = 1;
  }
  await browser.close();
})();