// Optional browser verification: use installed Playwright or set PLAYWRIGHT_MODULE.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildSync } = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function main() {
  const root = path.resolve(__dirname, '..');
  const documentBundle = buildSync({ entryPoints: [path.join(root, 'src/components/qiblaSceneDocument.ts')], bundle: true, write: false, platform: 'node', format: 'cjs' }).outputFiles[0].text;
  const box = { exports: {} };
  new Function('module', 'exports', documentBundle)(box, box.exports);
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 420 }, deviceScaleFactor: 2 });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => requests.push(request.url()));
    await page.evaluate(() => window.addEventListener('message', event => {
      try { const message = JSON.parse(event.data); if (message.type === 'error') window.__sceneFailure = message.message; } catch {}
    }));
    await page.setContent(box.exports.qiblaSceneDocument);
    await page.waitForFunction(() => window.updateHalovatQibla || window.__sceneFailure);
    assert.equal(await page.evaluate(() => window.__sceneFailure), undefined, '3D scene must initialize');
    await page.waitForFunction(() => window.__halovatQibla.inspect().texturesReady);
    const state = { heading: 188, bearing: 240, aligned: false, active: true, dark: false, reduceMotion: false };
    const update = async patch => {
      Object.assign(state, patch);
      await page.evaluate(data => window.updateHalovatQibla(data), state);
      await page.waitForFunction(() => !window.__halovatQibla.inspect().scheduled);
      return page.evaluate(() => window.__halovatQibla.inspect());
    };
    const dir = path.join(root, '.expo/qibla-check'); fs.mkdirSync(dir, { recursive: true });
    const first = await update({});
    const checkCentered = snapshot => {
      assert.ok(Math.abs(snapshot.personScreen[0]) < 0.002 && Math.abs(snapshot.personScreen[1]) < 0.002,
        'The person and geographic rotation pivot must project to the center of the scene');
    };
    checkCentered(first);
    await page.screenshot({ path: path.join(dir, 'scene-turn-right.png') });
    assert.ok(first.kaabaPosition[0] > 0, 'A target 52 degrees right must appear right of the person');
    const aligned = await update({ heading: 240, aligned: true });
    checkCentered(aligned);
    assert.ok(Math.abs(aligned.kaabaPosition[0]) < 0.004, 'Aligned target must be directly ahead');
    assert.ok(aligned.kaabaPosition[2] < 0, 'Forward is negative Z');
    assert.ok(aligned.kaabaBounds.every(point => Math.abs(point[0]) < 1 && Math.abs(point[1]) < 1), 'Aligned Kaaba roof and plinth must remain fully in frame');
    assert.deepEqual(aligned.personPosition, first.personPosition, 'Person must not move');
    assert.deepEqual(aligned.personRotation, first.personRotation, 'Person must not turn');
    assert.deepEqual(aligned.cameraPosition, first.cameraPosition, 'Camera must stay fixed');
    await page.screenshot({ path: path.join(dir, 'scene-aligned.png') });
    const left = await update({ heading: 292, aligned: false });
    assert.ok(left.kaabaPosition[0] < 0, 'Turning past Qibla moves target left');
    await update({ bearing: 0, heading: 359 });
    const before = await page.evaluate(() => window.__halovatQibla.inspect());
    const after = await update({ heading: 1 });
    assert.ok(Math.abs(after.heading - before.heading) < 3, 'North crossing must turn two degrees, not 358');
    const orbit = [];
    const radius = Math.hypot(first.kaabaPosition[0], first.kaabaPosition[2]);
    for (const heading of [0, 45, 90, 135, 180, 225, 270, 315, 360]) {
      const snapshot = await update({ heading, bearing: 0, reduceMotion: true });
      checkCentered(snapshot);
      orbit.push(snapshot);
      assert.deepEqual(snapshot.personPosition, first.personPosition);
      assert.deepEqual(snapshot.personRotation, first.personRotation);
      assert.ok(snapshot.kaabaPosition.every(Number.isFinite), 'A complete turn keeps valid world coordinates');
      assert.ok(Math.abs(Math.hypot(snapshot.kaabaPosition[0], snapshot.kaabaPosition[2]) - radius) < 0.002,
        'The geographic world must orbit the fixed person at a constant distance');
      assert.ok(snapshot.kaabaBounds.every(point => Math.abs(point[0]) < 1 && Math.abs(point[1]) < 1),
        'The complete Kaaba must stay in frame throughout a turn around the centered person');
      if (heading === 0 || heading === 360) {
        const forward = snapshot.forwardScreen.map((v, i) => v - snapshot.personScreen[i]);
        const target = snapshot.kaabaScreen.map((v, i) => v - snapshot.personScreen[i]);
        assert.ok(Math.abs(forward[0] * target[1] - forward[1] * target[0]) < 0.002, 'Alignment follows the fixed forward arrow in the isometric camera');
        assert.ok(Math.abs(snapshot.kaabaScreen[0]) < 1 && Math.abs(snapshot.kaabaScreen[1]) < 1, 'Forward target stays in view');
      }
    }
    for (let i = 0; i < 4; i++) {
      for (const axis of [0, 1]) assert.ok(Math.abs((orbit[i].kaabaScreen[axis] + orbit[i + 4].kaabaScreen[axis]) / 2 - first.personScreen[axis]) < 0.002,
        'Opposite points on the visible orbit must be centered on the person');
    }
    const dark = await update({ dark: true, heading: 188, bearing: 240 });
    await page.screenshot({ path: path.join(dir, 'scene-dark.png') });
    assert.ok(dark.triangles < 70000, 'Keep mobile triangle budget bounded');
    assert.ok(dark.pixelRatio <= 1.5, 'Cap rendering resolution for battery usage');
    const stationary = await page.evaluate(() => window.__halovatQibla.inspect().draws);
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__halovatQibla.inspect().draws), stationary, 'Stationary scene must stop rendering');
    const paused = await update({ active: false });
    await update({ heading: 300 });
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.__halovatQibla.inspect().draws), paused.draws, 'No frames in background');
    const missing = await update({ active: true, heading: null });
    assert.equal(missing.targetVisible, false, 'Missing heading must not fabricate Qibla direction');
    const resumed = await update({ heading: 240, bearing: 240, aligned: true, dark: false });
    assert.ok(resumed.targetVisible);
    assert.ok(Math.abs(resumed.kaabaPosition[0]) < 0.004);
    for (const viewport of [{ width: 320, height: 330 }, { width: 430, height: 410 }, { width: 844, height: 300 }]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(size => {
        const canvas = document.querySelector('canvas'), snapshot = window.__halovatQibla.inspect();
        return canvas.width === Math.floor(size.width * snapshot.pixelRatio)
          && canvas.height === Math.floor(size.height * snapshot.pixelRatio) && !snapshot.scheduled;
      }, viewport);
      for (const heading of [240, 330, 60, 150]) {
        const snapshot = await update({ heading, reduceMotion: true });
        checkCentered(snapshot);
        assert.ok(snapshot.kaabaBounds.every(point => Math.abs(point[0]) < 1 && Math.abs(point[1]) < 1),
          'Responsive framing must preserve the full centered orbit');
      }
      if (viewport.width === 320) await page.screenshot({ path: path.join(dir, 'scene-small.png') });
    }
    await page.evaluate(() => window.__halovatQibla.dispose());
    assert.equal(await page.evaluate(() => window.__halovatQibla.inspect().scheduled), false);
    assert.deepEqual(errors, [], 'No runtime errors');
    assert.deepEqual(requests.filter(url => !url.startsWith('data:')), [], '3D scene must work entirely offline');
    console.log('PASS: centered fixed person/pivot, complete visible orbit, opposite-point symmetry, responsive framing, inverse map rotation, shortest north crossing, alignment, offline loading, idle/background teardown, recovery and dark theme.');
    console.log(JSON.stringify({ triangles: first.triangles, drawCalls: first.calls, textures: first.textures, geometries: first.geometries, screenshots: dir }, null, 2));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
