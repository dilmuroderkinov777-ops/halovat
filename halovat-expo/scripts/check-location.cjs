// Exercise the real service with controlled native callbacks and a fake deadline.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services/foregroundLocation.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const fix = (accuracy = 15, age = 0) => ({ timestamp: Date.now() - age, coords: { latitude: 41.3, longitude: 69.2, accuracy } });
const flush = () => new Promise(resolve => setImmediate(resolve));
function load({ cached = null, enabled = true, slowStart = false } = {}) {
  let callback, fail, release;
  let started = 0, removed = 0;
  const timers = new Map();
  const subscription = { remove: () => { removed++; } };
  const native = {
    Accuracy: { High: 4 }, hasServicesEnabledAsync: async () => enabled,
    getLastKnownPositionAsync: async () => cached,
    watchPositionAsync: (options, cb, error) => {
      started++; callback = cb; fail = error;
      return slowStart ? new Promise(resolve => { release = () => resolve(subscription); }) : Promise.resolve(subscription);
    },
  };
  const sandbox = { exports: {}, require: () => native, Date, setTimeout: cb => { const key = {}; timers.set(key, cb); return key; }, clearTimeout: key => timers.delete(key) };
  vm.runInNewContext(compiled, sandbox);
  return { locate: sandbox.exports.foregroundLocation, fix: value => callback(value), fail: reason => fail(reason), release: () => release(),
    timeout: () => [...timers.values()].forEach(cb => cb()), started: () => started, removed: () => removed, timers };
}
async function main() {
  const accurate = load();
  const a = accurate.locate(), b = accurate.locate();
  assert.equal(a, b, 'Concurrent screens must share the GPS request');
  await flush(); accurate.fix(fix());
  assert.equal((await a).coords.accuracy, 15);
  assert.equal(accurate.started(), 1); assert.equal(accurate.removed(), 1); assert.equal(accurate.timers.size, 0);

  const cached = load({ cached: fix(50) });
  assert.equal((await cached.locate()).coords.accuracy, 50);
  assert.equal(cached.started(), 0);
  const fresh = cached.locate({ fresh: true }); await flush(); cached.fix(fix(10));
  assert.equal((await fresh).coords.accuracy, 10); assert.equal(cached.started(), 1);

  const slow = load({ slowStart: true });
  const timeout = assert.rejects(slow.locate(), /Joylashuv/);
  await flush(); slow.timeout(); await timeout;
  slow.release(); await flush(); assert.equal(slow.removed(), 1, 'Late native subscriptions must be removed');

  const coarse = load({ cached: fix(500, 90_000) });
  const fallback = coarse.locate(); await flush(); coarse.fix(fix(200)); coarse.timeout();
  assert.equal((await fallback).coords.accuracy, 200); assert.equal(coarse.removed(), 1);

  const invalid = load({ cached: fix(10, 180_000) });
  const invalidResult = assert.rejects(invalid.locate(), /Joylashuv/); await flush();
  invalid.fix({ ...fix(), coords: { latitude: NaN, longitude: 69, accuracy: 10 } });
  invalid.timeout(); await invalidResult; assert.equal(invalid.removed(), 1);

  const off = load({ enabled: false, cached: fix() });
  await assert.rejects(off.locate(), /GPS/); assert.equal(off.started(), 0);
  const failed = load();
  const failure = assert.rejects(failed.locate(), /Denied/); await flush(); failed.fail('Denied'); await failure;
  const retry = failed.locate(); await flush(); failed.fix(fix()); await retry;
  assert.equal(failed.started(), 2); assert.equal(failed.removed(), 2);
  console.log('PASS: shared GPS request, fresh/cache accuracy, deadline, late cleanup, invalid/stale fixes, disabled GPS, errors and retry.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
