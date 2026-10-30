// Native WebView protocol in a real WebGL renderer. No device sensor is mocked here.
const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { execFileSync } = require('node:child_process');
const vm = require('node:vm');
const ts = require('typescript');
const fs = require('node:fs');

function checkDelivery() {
  let now = 0, id = 0, timers = new Map();
  const box = { exports: {}, setTimeout: (fn, delay) => { timers.set(++id, { fn, at: now + delay }); return id; }, clearTimeout: key => timers.delete(key) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/domain/qiblaSceneDelivery.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, box);
  const sent = []; let stalled = 0, seq = 0;
  const bridge = box.exports.createSceneDelivery((state, sequence) => sent.push({ state, sequence }), () => stalled++, () => ++seq);
  bridge.submit(0);
  for (let i = 1; i <= 1000; i++) bridge.submit(i);
  assert.equal(sent.length, 1, 'A slow WebView must have only one unrendered request');
  bridge.rendered(999);
  assert.equal(sent.length, 1, 'An old page acknowledgment must be ignored');
  bridge.rendered(1);
  assert.deepEqual(sent[1], { state: 1000, sequence: 2 }, 'Recovery must jump to the latest heading, not replay old turns');
  now = 3000;
  for (const [key, timer] of timers) if (timer.at <= now) { timers.delete(key); timer.fn(); }
  assert.equal(stalled, 1, 'Missing rendered frames must trigger recovery');
  bridge.submit(1001);
  assert.equal(sent.length, 2, 'A failed channel cannot queue more JS');
  bridge.dispose(); assert.equal(timers.size, 0);
  const paused = box.exports.createSceneDelivery(() => {}, () => stalled++, () => ++seq);
  paused.submit(0); paused.dispose();
  assert.equal(timers.size, 0, 'Screen blur must cancel the recovery timeout');
  console.log('PASS: bounded WebView delivery, latest heading wins, stale replies ignored, timeout recovery and disposal.');
}

async function main() {
  checkDelivery();
  const compiled = buildSync({ entryPoints: ['src/components/qiblaSceneDocument.ts'], bundle: true, write: false, platform: 'node', format: 'cjs' }).outputFiles[0].text;
  const box = { exports: {} }; new Function('module', 'exports', compiled)(box, box.exports);
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 490 }, deviceScaleFactor: 3 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    const prepare = async html => {
      await page.goto('about:blank');
      await page.evaluate(() => {
        window.__nativeMessages = [];
        window.ReactNativeWebView = { postMessage: value => window.__nativeMessages.push(JSON.parse(value)) };
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      });
      await page.setContent(html);
      await page.waitForFunction(() => window.__nativeMessages.some(m => m.type === 'ready'));
    };
    const state = { heading: 188, bearing: 240, aligned: false, active: true, dark: false, reduceMotion: true };
    // Reproduce the old lifecycle bug: RN stays active but WebView reports hidden.
    if (process.env.QIBLA_BASELINE_REF) {
      const oldSource = execFileSync('git', ['show', process.env.QIBLA_BASELINE_REF + ':halovat-expo/src/data/qiblaSceneAssets.ts'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
      const oldJS = JSON.parse(oldSource.split('export const qiblaSceneJS = ')[1].trim().replace(/;$/, ''));
      const baseline = '<!doctype html><style>html,body,canvas{margin:0;width:100%;height:100%}</style><canvas></canvas><script>' + oldJS.replace(/<\/script/gi, '<\\/script') + '</script>';
      await prepare(baseline);
      await page.evaluate(s => window.updateHalovatQibla(s), state);
      await page.waitForTimeout(150);
      const old = await page.evaluate(() => window.__halovatQibla.inspect());
      assert.equal(old.active, false);
      assert.equal(old.draws, 0);
      console.log('REPRODUCED: previous native scene accepts heading but draws zero frames when WebView visibility is hidden.');
    }
    await prepare(box.exports.createQiblaSceneDocument(true));
    let seq = 0;
    const update = async patch => {
      Object.assign(state, patch); const sequence = ++seq;
      await page.evaluate(({ state, sequence }) => window.updateHalovatQibla(state, sequence), { state, sequence });
      await page.waitForFunction(sequence => window.__nativeMessages.some(m => m.type === 'rendered' && m.sequence === sequence), sequence);
      return page.evaluate(() => window.__halovatQibla.inspect());
    };
    const first = await update({});
    assert.ok(first.active && first.draws > 0, 'Native host focus must override WebView visibility');
    assert.equal(first.lightweight, true);
    console.log(JSON.stringify({ triangles: first.triangles, drawCalls: first.calls, pixelRatio: first.pixelRatio }));
    assert.ok(first.pixelRatio <= 1.25 && first.triangles < 45000 && first.calls < 40, 'Android must use the single-pass mobile budget');
    // A native WebView can receive pagehide without being unmounted.
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    for (let i = 0; i <= 144; i++) {
      const snapshot = await update({ heading: (i * 10) % 360, reduceMotion: false });
      assert.ok(Math.abs(((snapshot.targetHeading - state.heading + 540) % 360 + 360) % 360 - 180) < 0.01);
    }
    await page.waitForFunction(() => !window.__halovatQibla.inspect().scheduled);
    const settled = await page.evaluate(() => window.__halovatQibla.inspect());
    assert.ok(Math.abs(((settled.heading + 180) % 360 + 360) % 360 - 180) < 0.01, 'Animated map must settle at the latest heading after repeated full turns');
    const paused = await update({ active: false });
    const stillPaused = await update({ heading: 120 });
    assert.equal(stillPaused.draws, paused.draws);
    const resumed = await update({ active: true, heading: 240, reduceMotion: true });
    assert.ok(resumed.draws > paused.draws);
    assert.ok(Math.abs(resumed.kaabaPosition[0]) < 0.004);
    fs.mkdirSync('.expo/qibla-check', { recursive: true });
    await page.screenshot({ path: '.expo/qibla-check/scene-android-light.png' });
    await update({ dark: true });
    await page.screenshot({ path: '.expo/qibla-check/scene-android-dark.png' });
    assert.deepEqual(errors, []);
    assert.equal(await page.evaluate(() => window.__nativeMessages.some(m => m.type === 'error')), false);
    await page.evaluate(() => document.querySelector('canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(() => window.__nativeMessages.some(m => m.type === 'error'));
    await prepare(box.exports.createQiblaSceneDocument(true));
    const reloaded = await update({ heading: 90 });
    assert.ok(reloaded.draws > 0 && reloaded.heading === 90, 'Reload after context loss must render the latest heading');
    console.log('PASS: native hidden/pagehide recovery, 4 full turns with rendered acknowledgments, pause/resume, dark/light rendering and WebGL loss signaling.');
    console.log(JSON.stringify({ triangles: first.triangles, drawCalls: first.calls, pixelRatio: first.pixelRatio }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
