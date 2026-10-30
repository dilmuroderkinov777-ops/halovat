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
      const query = new URLSearchParams(location.search);
      const heading = query.has('heading') ? Number(query.get('heading')) : 188;
      const accuracy = query.has('accuracy') ? Number(query.get('accuracy')) : 3;
      let value = { heading, accuracy, trueNorth: true };
      const listeners = new Set();
      window.__qiblaRestarts = 0;
      window.__qiblaFixture = {
        coordinates: { latitude: 41.2995, longitude: 69.2401 }, gpsAccuracy: 17,
        heading, headingAccuracy: accuracy, trueNorth: true, status: 'ready',
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
    await recalibrate.waitFor();
    assert.ok(instrumented, 'Actual compass hook must use the test sensor fixture');
    const scene = await page.locator('iframe[title="Qibla 3D"]').elementHandle();
    const frame = await scene.contentFrame();
    await frame.waitForFunction(() => window.__halovatQibla?.inspect().texturesReady && window.__halovatQibla.inspect().draws > 0);
    // Expo UI's existing web Host warning uses a shadow-root toast with an unlabeled
    // dismiss button. Close that known warning through its UI before testing clicks.
    const hostWarning = page.locator('#error-toast').getByRole('button').filter({ hasText: /Received `false` for a non-boolean/ });
    if (await hostWarning.isVisible()) await hostWarning.locator('button').click();
    await recalibrate.click({ trial: true });
    const pivot = await frame.evaluate(() => window.__halovatQibla.inspect().personScreen);
    assert.ok(Math.abs(pivot[0]) < 0.002 && Math.abs(pivot[1]) < 0.002,
      'The real screen must display the person and rotation pivot at the center');
    const sceneBox = await page.locator('iframe[title="Qibla 3D"]').boundingBox();
    assert.ok(sceneBox.height >= 480, 'Phone map frame must be larger than the old 410pt cap');
    assert.equal(await page.getByRole('button', { name: 'Yaqin masjidlar', exact: true }).count(), 0,
      'The nearby-mosques card must be removed from Qibla');
    const text = await page.locator('body').innerText();
    assert.ok(text.includes('52°') && text.includes('O‘ngga buring') && text.includes('GPS · ±17 m'));
    const output = path.join(root, '.expo/qibla-check'); fs.mkdirSync(output, { recursive: true });
    await page.mouse.move(0, 0);
    await page.screenshot({ path: path.join(output, 'page-52-degrees.png'), fullPage: true });
    await recalibrate.click();
    await page.getByText('Telefonni 8 shaklida aylantiring', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__qiblaRestarts), 1, 'Native calibration action must restart sensor and open the guide');
    await page.getByRole('button', { name: 'Kompasga o‘tish', exact: true }).click();
    assert.ok(new URL(page.url()).pathname.endsWith('/qibla'));
    // Reproduce the reported screen: a rounded 0° reading with low sensor confidence.
    await page.goto(origin + '/qibla?heading=240&accuracy=0', { waitUntil: 'domcontentloaded' });
    await page.getByText('Qiblaga yo‘naldingiz', { exact: true }).waitFor();
    assert.equal(await page.getByText('0°', { exact: true }).count(), 1);
    assert.equal(await page.getByText('Kompas aniqligi past', { exact: true }).count(), 1);
    assert.equal(await page.getByText('O‘ngga buring', { exact: true }).count(), 0);
    if (await hostWarning.isVisible()) await hostWarning.locator('button').click();
    await page.screenshot({ path: path.join(output, 'page-zero-degrees-low-accuracy.png'), fullPage: true });
    for (let turn = 0; turn < 6; turn++) {
      for (const heading of [300, 0, 60, 120, 180, 240]) {
        await page.evaluate(({ heading, turn }) => {
          const fixture = window.__qiblaFixture;
          fixture.heading = heading;
          fixture.headingAccuracy = turn % 4;
          fixture.trueNorth = turn % 2 === 0;
          fixture.motion.publish({ heading, accuracy: fixture.headingAccuracy, trueNorth: fixture.trueNorth });
        }, { heading, turn });
        if (heading === 300) await page.getByText('Qiblaga yo‘naldingiz', { exact: true }).waitFor({ state: 'hidden' });
        if (heading === 240) {
          await page.getByText('Qiblaga yo‘naldingiz', { exact: true }).waitFor();
          assert.equal(await page.getByText('0°', { exact: true }).count(), 1, 'Every turn must return to the same aligned guidance');
        }
      }
    }
    assert.deepEqual(errors, [], 'No screen runtime errors');
    console.log('PASS: real screen renders enlarged offline map and sensor fixture; nearby-mosques button is absent; calibration still restarts sensor and opens guide.');
    console.log('PASS: real screen shows alignment at 0° with low accuracy, keeps the quality warning and never asks the aligned user to turn right.');
    console.log('PASS: real screen confirms alignment after all six full rotations with changing sensor accuracy and north reference.');
    console.log('Preview:', path.join(output, 'page-zero-degrees-low-accuracy.png'));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
