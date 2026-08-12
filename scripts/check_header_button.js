const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: { latitude: 21.12455, longitude: 79.00295 } });
  const page = await context.newPage();
  try {
    page.on('console', (msg) => console.log('PAGE_CONSOLE', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.log('PAGE_ERROR', err.toString()));
    await page.goto('http://localhost:5173/#/map', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const btn = await page.$('button[aria-label="Use my current location"]');
    console.log('button-exists:', !!btn);
    if (btn) {
      const html = await page.evaluate((el) => el.outerHTML, btn);
      console.log('button-html:', html);
    }
    const headerHtml = await page.$eval('header.app-header', el => el.outerHTML).catch(() => null);
    console.log('header-exists:', !!headerHtml);
    if (headerHtml) console.log(headerHtml.slice(0, 800));
  } catch (e) {
    console.error('ERR', e.message);
    process.exitCode = 1;
  }
  await browser.close();
})();