// Real screen smoke test against local Metro, with a sensor fixture only in this isolated browser.
// Production source, real browser profiles and persisted app data are never modified.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const root = path.resolve(__dirname, '..');
  const origin = process.env.QIBLA_PREVIEW_ORIGIN || 'http://localhost:8081';
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Only local Metro is allowed');
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.addInitScript(() => {
      if (window !== window.top) return;
      localStorage.setItem('halovat.expo.onboarding.complete.v3.language-and-six-pages', 'true');
      localStorage.setItem('halovat.expo.state.v1', JSON.stringify({ cityId: 'toshkent', cityManuallySelected: true,
        locationAttempted: true, compassGuideDismissed: true, darkMode: false }));
      let value = { heading: 188, accuracy: 3, trueNorth: true };
      const listeners = new Set();
      window.__qiblaRestarts = 0;
      window.__qiblaFixture = {
        coordinates: { latitude: 41.2995, longitude: 69.2401 }, gpsAccuracy: 17,
        heading: 188, headingAccuracy: 3, trueNorth: true, status: 'ready',
        restart: () => { window.__qiblaRestarts++; },
        motion: { current: () => value, subscribe: listener => { listeners.add(listener); listener(value); return () => listeners.delete(listener); },
          publish: sample => { value = sample; listeners.forEach(listener => listener(sample)); } },
      };
    });
    let instrumented = false;
    await page.route('**/*.bundle?*', async route => {
      const response = await route.fetch();
      let body = await response.text();
      const marker = 'function useCompass(city) {';
      if (body.includes(marker)) {
        body = body.replace(marker, marker + '\nif (globalThis.__qiblaFixture) return globalThis.__qiblaFixture;');
        instrumented = true;
      }
      await route.fulfill({ response, body });
    });
    await page.goto(origin + '/qibla', { waitUntil: 'domcontentloaded' });
    await page.getByRole('image', { name: 'Halovat yuklanmoqda' }).waitFor({ state: 'hidden', timeout: 30000 });
    const recalibrate = page.getByRole('button', { name: /Qayta sozlash/ });
    await recalibrate.click({ trial: true });
    assert.ok(instrumented, 'Actual compass hook must use the test sensor fixture');
    const scene = await page.locator('iframe[title="Qibla 3D"]').elementHandle();
    const frame = await scene.contentFrame();
    await frame.waitForFunction(() => window.__halovatQibla?.inspect().texturesReady && window.__halovatQibla.inspect().draws > 0);
    const text = await page.locator('body').innerText();
    assert.ok(text.includes('52°') && text.includes('O‘ngga buring') && text.includes('GPS · ±17 m'));
    const output = path.join(root, '.expo/qibla-check'); fs.mkdirSync(output, { recursive: true });
    await page.mouse.move(0, 0);
    // Expo UI's web Host reports development-only DOM warnings; dismiss the LogBox toast for the screenshot.
    const dismissLog = page.getByRole('button', { name: /Dismiss notification|Dismiss log|Close notification/i });
    if (await dismissLog.count()) await dismissLog.first().click();
    await page.screenshot({ path: path.join(output, 'page-52-degrees.png'), fullPage: true });
    await recalibrate.click();
    await page.getByText('Telefonni 8 shaklida aylantiring', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__qiblaRestarts), 1, 'Native calibration action must restart sensor and open the guide');
    await page.getByRole('button', { name: 'Kompasga o‘tish', exact: true }).click();
    await page.getByRole('button', { name: 'Yaqin masjidlar', exact: true }).click();
    await page.waitForURL('**/qibla/mosque');
    assert.deepEqual(errors, [], 'No screen runtime errors');
    console.log('PASS: real screen renders sensor fixture and offline scene; calibration restarts sensor and opens guide; nearby-mosques navigation works.');
    console.log('Preview:', path.join(output, 'page-52-degrees.png'));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
