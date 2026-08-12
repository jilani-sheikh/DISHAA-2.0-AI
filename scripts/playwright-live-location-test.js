const { chromium } = require('playwright');

(async () => {
  const results = {};
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    permissions: ['geolocation'],
    geolocation: { latitude: 21.12455, longitude: 79.00295 },
  });
  const page = await context.newPage();

  try {
    // 3. Open map
    await page.goto('http://localhost:5173/#/map', { waitUntil: 'networkidle' });

    // 4. Click Locate
    await page.click('button[aria-label="Use my current location"]');

    // 5. Wait for marker
    await page.waitForSelector('.current-location-marker', { timeout: 5000 });
    results.markerAppeared = true;

    // Record initial marker position
    const rect1 = await page.$eval('.current-location-marker', (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });

    // Wait for nearby places list to appear (populated by findNearby)
    const nearbyButton = await page.waitForSelector('.nearby-list button', { timeout: 5000 });
    if (nearbyButton) {
      // Click the first nearby place to open PlaceDetails
      await page.click('.nearby-list button');
      await page.waitForSelector('section.place-card h1', { timeout: 5000 });
      // Click "Navigate here" inside the place details
      await page.click('section.place-card button.primary-button');
      results.destinationSelected = true;
    }

    // 5b. Simulate movement: set new geolocation
    await context.setGeolocation({ latitude: 21.1248, longitude: 79.0032 });

    // Wait a bit for watchPosition to fire and UI to update
    await page.waitForTimeout(1500);

    // 5c. Check marker moved
    const rect2 = await page.$eval('.current-location-marker', (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });

    results.markerMoved = rect1.x !== rect2.x || rect1.y !== rect2.y;

    // 6. Ensure navigation panel exists and select My current location as origin
    await page.waitForSelector('#from-place-select', { timeout: 5000 });
    await page.selectOption('#from-place-select', 'current-location');
    results.originSelected = true;

    // Intercept route POST and capture request body + response
    let routeResponse = null;
    let routeRequest = null;
    page.on('request', async (request) => {
      try {
        if (request.url().includes('/api/navigation/route') && request.method() === 'POST') {
          routeRequest = request.postData();
        }
      } catch (e) {}
    });
    page.on('response', async (response) => {
      try {
        if (response.url().includes('/api/navigation/route') && response.request().method() === 'POST') {
          const status = response.status();
          const body = await response.json().catch(() => null);
          routeResponse = { status, body };
        }
      } catch (e) {}
    });

    // 8. Start navigation
    await page.click('button.primary-button');

    // Wait for route response
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline && !routeResponse) {
      await page.waitForTimeout(200);
    }

    results.routePosted = !!routeResponse && routeResponse.status === 200;
    results.routeReturned = !!routeResponse && !!routeResponse.body && !!routeResponse.body.route;
    results.requestBody = routeRequest ? JSON.parse(routeRequest) : null;

    // 11. Verify route polyline or route-origin marker appears
    const routeOriginExists = await page.$('.route-origin');
    const routeDestinationExists = await page.$('.route-destination');
    const polyExists = !!(await page.$('svg path.leaflet-interactive'));

    results.routeOrigin = !!routeOriginExists;
    results.routeDestination = !!routeDestinationExists;
    results.polyline = polyExists;

    console.log('TEST_RESULTS', JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('TEST_ERROR', err.message);
    await browser.close();
    process.exitCode = 2;
  }

  await browser.close();
})();
