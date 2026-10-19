const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function harness(granted = true, deferWatcher = false) {
  const state = { values: [], started: 0, removed: 0, requested: 0 };
  let resolveGps, resolveWatcher;
  const gps = new Promise(resolve => { resolveGps = resolve; });
  const watcher = { remove: () => { state.removed++; } };
  const dependencies = {
    'expo-location': {
      getForegroundPermissionsAsync: async () => ({ granted, canAskAgain: true }),
      requestForegroundPermissionsAsync: async () => { state.requested++; return { granted, canAskAgain: true }; },
      watchHeadingAsync: async (callback, error) => {
        state.started++; state.reading = callback; state.error = error;
        return deferWatcher ? new Promise(resolve => { resolveWatcher = resolve; }) : watcher;
      },
    },
    'expo-router': { useFocusEffect: callback => { state.focus = callback; } },
    'react-native': { Platform: { OS: 'android' }, AppState: { currentState: 'active', addEventListener: (_, cb) => { state.appState = cb; return { remove() {} }; } } },
    react: { useCallback: value => value, useState: initial => {
      const index = state.values.length; state.values.push(initial);
      return [initial, value => { state.values[index] = typeof value === 'function' ? value(state.values[index]) : value; }];
    } },
    '../services/foregroundLocation': { foregroundLocation: () => gps },
  };
  const box = { exports: {}, Date, setTimeout, clearTimeout, require: key => {
    assert.ok(key in dependencies, 'Unexpected dependency: ' + key); return dependencies[key];
  } };
  vm.runInNewContext(compile('src/hooks/useCompass.ts'), box);
  box.exports.useCompass({ latitude: 41.3, longitude: 69.2 });
  state.finishGps = () => resolveGps({ coords: { latitude: 41.3, longitude: 69.2, accuracy: 5 } });
  state.finishWatcher = () => resolveWatcher(watcher);
  return state;
}
async function main() {
  const h = harness();
  const cleanup = h.focus(); await flush();
  assert.equal(h.started, 1, 'Heading watcher must not wait for a GPS fix');
  assert.equal(h.values[0], null);
  assert.equal(h.requested, 0, 'Already-granted permission must not open an Activity');
  h.reading({ trueHeading: 245, magHeading: 240, accuracy: 2 });
  assert.equal(h.values[1].heading, 245); assert.equal(h.values[2], 'ready');
  h.reading({ trueHeading: 0, magHeading: 350, accuracy: 2 });
  assert.equal(h.values[1].heading, 0, 'True north at zero must remain valid');
  h.appState('background'); await flush();
  assert.equal(h.values[1].heading, null); assert.equal(h.removed, 1);
  h.appState('active'); await flush(); assert.equal(h.started, 2);
  h.reading({ trueHeading: -1, magHeading: 10, accuracy: 1 });
  assert.equal(h.values[1].heading, 10, 'Restore direct readings, without smoothing lag');
  assert.equal(h.values[1].trueNorth, false);
  h.error('sensor failure'); assert.equal(h.values[2], 'unavailable');
  cleanup(); await flush(); assert.equal(h.removed, 2);
  const before = h.values[2]; h.reading({ trueHeading: 180, magHeading: 180, accuracy: 3 });
  assert.equal(h.values[2], before, 'Late heading after blur must be ignored');
  h.finishGps(); await flush(); assert.equal(h.values[0], null, 'Late GPS after blur must be ignored');

  const denied = harness(false); const stopDenied = denied.focus(); await flush();
  assert.equal(denied.values[2], 'permission'); assert.equal(denied.started, 0);
  denied.appState('background'); denied.appState('active'); await flush();
  assert.equal(denied.requested, 1, 'Returning from permission UI must not create a request loop');
  stopDenied();

  const late = harness(true, true); const stopLate = late.focus(); await flush();
  stopLate(); late.finishWatcher(); await flush();
  assert.equal(late.removed, 1, 'Watcher resolving after blur must be removed');

  const math = { exports: {} }; vm.runInNewContext(compile('src/domain/qibla.ts'), math);
  const { phoneAngleFromQibla: angle, qiblaBearing } = math.exports;
  assert.equal(angle(210, 240), -30); assert.equal(angle(240, 240), 0); assert.equal(angle(270, 240), 30);
  assert.equal(angle(359, 1), -2); assert.equal(angle(1, 359), 2);
  assert.ok(Math.abs(qiblaBearing(41.2995, 69.2401) - 240) < 1);
  console.log('PASS: restored Expo heading, GPS-independent startup, permission handling, lifecycle cleanup and fixed-Qibla signed angles.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
