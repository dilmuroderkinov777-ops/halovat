const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { Coordinates, Qibla } = require('adhan');

const compile = file => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loadMath = file => {
  const box = { exports: {} };
  vm.runInNewContext(compile(file), box);
  return box.exports;
};
const flush = async () => { for (let index = 0; index < 20; index++) await Promise.resolve(); };
const headingMath = loadMath('src/domain/compassHeading.ts');

class FakeClock {
  now = 1000;
  nextId = 0;
  tasks = new Map();
  setTimeout = (callback, delay = 0, ...args) => {
    const id = ++this.nextId;
    this.tasks.set(id, { at: this.now + Math.max(0, delay), callback: () => callback(...args) });
    return id;
  };
  clearTimeout = id => { this.tasks.delete(id); };
  async advance(milliseconds) {
    const until = this.now + milliseconds;
    let iterations = 0;
    while (true) {
      const next = [...this.tasks.entries()].filter(([, task]) => task.at <= until)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!next) break;
      assert.ok(++iterations < 10_000, 'Timer scheduling must not loop indefinitely');
      this.now = next[1].at;
      this.tasks.delete(next[0]);
      next[1].callback();
      await flush();
    }
    this.now = until;
    await flush();
  }
}

function harness({ granted = true, deferWatcher = false, platform = 'android' } = {}) {
  const clock = new FakeClock();
  const state = { started: 0, removed: 0, requested: 0, animations: [], values: [], writes: [], watches: [] };
  const hooks = [];
  let cursor = 0;
  let focusEffect;
  let cleanup;
  let appStateListener;
  let resolveGps;
  const gps = new Promise(resolve => { resolveGps = resolve; });
  const sameDependencies = (left, right) => left && right && left.length === right.length
    && left.every((value, index) => Object.is(value, right[index]));
  const memo = (factory, dependencies) => {
    const index = cursor++;
    if (!hooks[index] || !sameDependencies(hooks[index].dependencies, dependencies)) {
      hooks[index] = { value: factory(), dependencies };
    }
    return hooks[index].value;
  };

  class AnimatedValue {
    constructor(value) { this.value = value; state.values.push(this); }
    setValue(value) { this.stopAnimation(); this.value = value; }
    stopAnimation(callback) { this.active?.stop(); callback?.(this.value); }
  }
  const Animated = {
    Value: AnimatedValue,
    timing: (value, config) => {
      assert.equal(config.useNativeDriver, true, 'Compass animation must use the native driver');
      assert.equal(config.isInteraction, false, 'Compass animation must not block interactions');
      let timer;
      const animation = {
        start: callback => {
          value.stopAnimation();
          value.active = animation;
          state.animations.push({ at: clock.now, value, config });
          timer = clock.setTimeout(() => {
            value.value = config.toValue;
            value.active = undefined;
            timer = undefined;
            callback?.({ finished: true });
          }, config.duration);
        },
        stop: () => {
          clock.clearTimeout(timer);
          timer = undefined;
          if (value.active === animation) value.active = undefined;
        },
      };
      return animation;
    },
  };
  const appState = {
    currentState: 'active',
    addEventListener: (_, callback) => {
      appStateListener = callback;
      return { remove: () => { if (appStateListener === callback) appStateListener = undefined; } };
    },
  };
  const dependencies = {
    'expo-location': {
      getForegroundPermissionsAsync: async () => ({ granted, canAskAgain: true }),
      requestForegroundPermissionsAsync: async () => { state.requested++; return { granted, canAskAgain: true }; },
      watchHeadingAsync: async (callback, error) => {
        state.started++;
        const watch = { callback, error, removed: false };
        watch.subscription = { remove: () => {
          assert.equal(watch.removed, false, 'Each native watcher must be removed once');
          watch.removed = true;
          state.removed++;
        } };
        state.watches.push(watch);
        return deferWatcher ? new Promise(resolve => { watch.resolve = () => resolve(watch.subscription); }) : watch.subscription;
      },
    },
    'expo-router': { useFocusEffect: callback => { focusEffect = callback; } },
    'react-native': { Animated, Easing: { linear: value => value }, Platform: { OS: platform }, AppState: appState },
    react: {
      useCallback: (callback, dependencies) => memo(() => callback, dependencies),
      useMemo: memo,
      useRef: value => memo(() => ({ current: value }), []),
      useState: initial => {
        const index = cursor++;
        if (!hooks[index]) hooks[index] = { value: typeof initial === 'function' ? initial() : initial };
        return [hooks[index].value, update => {
          const next = typeof update === 'function' ? update(hooks[index].value) : update;
          if (!Object.is(hooks[index].value, next)) {
            hooks[index].value = next;
            state.writes.push({ at: clock.now, index, value: next });
          }
        }];
      },
    },
    '../services/foregroundLocation': { foregroundLocation: () => gps },
    '../domain/compassHeading': headingMath,
  };
  class ClockDate extends Date { static now() { return clock.now; } }
  const box = {
    exports: {}, Date: ClockDate,
    setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout,
    setInterval: () => { throw new Error('Compass must not poll or synthesize sensor readings with an interval'); },
    clearInterval: () => {},
    require: key => { assert.ok(key in dependencies, 'Unexpected dependency: ' + key); return dependencies[key]; },
  };
  vm.runInNewContext(compile('src/hooks/useCompass.ts'), box);
  const snapshot = () => {
    cursor = 0;
    return box.exports.useCompass({ latitude: 41.3111, longitude: 69.2797 });
  };
  snapshot();
  return Object.assign(state, {
    clock, snapshot,
    focus: async () => { assert.equal(cleanup, undefined); cleanup = focusEffect(); await flush(); },
    blur: async () => { cleanup?.(); cleanup = undefined; await flush(); },
    emit: (heading, accuracy = 3, trueNorth = true, index = state.watches.length - 1) => {
      state.watches[index].callback({ trueHeading: trueNorth ? heading : -1, magHeading: heading, accuracy });
    },
    appState: async next => { appState.currentState = next; appStateListener?.(next); await flush(); },
    error: (index = state.watches.length - 1) => state.watches[index].error('sensor failure'),
    finishGps: async () => { resolveGps({ coords: { latitude: 40, longitude: 67, accuracy: 5 } }); await flush(); },
  });
}

function checkMath() {
  const { relativeBearing: angle, qiblaBearing } = loadMath('src/domain/qibla.ts');
  assert.equal(angle(240, 210), 30);
  assert.equal(angle(240, 240), 0);
  assert.equal(angle(240, 270), -30);
  assert.equal(angle(1, 359), 2);
  assert.equal(angle(359, 1), -2);
  for (const [latitude, longitude] of [[41.3111, 69.2797], [39.6542, 66.9597], [51.5072, -0.1276], [40.7128, -74.006]]) {
    assert.ok(Math.abs(qiblaBearing(latitude, longitude) - Qibla(new Coordinates(latitude, longitude))) < 0.001,
      'Bearing must match the existing Adhan implementation for ' + latitude + ', ' + longitude);
  }
  const { createHeadingFilter, headingDelta } = headingMath;
  const steady = createHeadingFilter();
  assert.equal(steady(240), 240);
  for (const noise of [-0.8, 0.5, -0.4, 0.9, 0]) assert.equal(steady(240 + noise), 240);
  assert.equal(steady(241.5), 241.5, 'A turn beyond the deadband must preserve the accepted sensor value');
  assert.equal(steady(90), 90, 'Large sparse changes must not need fabricated follow-up readings');
  assert.equal(steady(270), 270);
  assert.equal(headingDelta(359, 1), 2);
  assert.equal(headingDelta(179, -179), 2);
}

async function checkPublishing() {
  const h = harness();
  await h.focus();
  assert.equal(h.started, 1, 'Heading watcher must not wait for GPS');
  assert.equal(h.requested, 0, 'Already-granted permission must not open an Activity');
  const sharedValue = h.snapshot().animatedHeading;
  assert.ok(sharedValue, 'Hook must expose one shared animated heading');
  h.emit(0);
  assert.equal(h.snapshot().heading, 0, 'Zero degrees true north is a valid first reading');
  assert.equal(h.snapshot().status, 'ready');
  assert.equal(h.snapshot().trueNorth, true);
  const animationsBefore = h.animations.length;
  const writesBefore = h.writes.length;
  for (let index = 1; index <= 100; index++) {
    await h.clock.advance(10);
    h.emit(index * 1.5);
  }
  await h.clock.advance(250);
  const turns = h.animations.slice(animationsBefore);
  const displayWrites = h.writes.slice(writesBefore).filter(write => write.value && typeof write.value === 'object'
    && typeof write.value.heading === 'number');
  assert.ok(turns.length <= 11, 'One second burst must coalesce to at most 11 trailing native targets, got ' + turns.length);
  assert.ok(displayWrites.length <= 5, 'One second burst must publish at most 5 trailing React readings, got ' + displayWrites.length);
  for (let index = 1; index < turns.length; index++) {
    assert.ok(turns[index].at - turns[index - 1].at >= 100, 'Regular motion targets must be separated by 100ms');
  }
  assert.equal(h.snapshot().heading, 150, 'Trailing publication must preserve the latest sample');
  assert.equal(sharedValue.value, 150, 'Native motion must finish at the latest accepted sensor heading');
  assert.ok(h.animations.every(animation => animation.config.duration <= 100), 'Native smoothing must not add a second long filter');
  assert.equal(h.snapshot().animatedHeading, sharedValue);
  assert.equal(h.values.length, 1, 'Rerenders must not allocate new Animated.Value instances');
  const settledAnimations = h.animations.length;
  const settledWrites = h.writes.length;
  for (let index = 0; index < 100; index++) {
    await h.clock.advance(10);
    h.emit(150 + [-0.5, 0.4, 0.7, -0.8, 0][index % 5]);
  }
  await h.clock.advance(1000);
  assert.equal(h.animations.length, settledAnimations, 'Stationary noise must not restart native animations');
  assert.equal(h.writes.length, settledWrites, 'Stationary noise must not rerender React');
  assert.equal(h.clock.tasks.size, 0, 'Stationary compass must not keep a polling timer alive');
  await h.blur();
  assert.equal(h.clock.tasks.size, 0);
  console.log('PASS: bounded publication (' + turns.length + ' native targets, ' + displayWrites.length
    + ' React readings), latest sample, one shared value and idle silence.');
}

async function checkSparseAndSafety() {
  const h = harness();
  await h.focus();
  h.emit(359);
  await h.clock.advance(250);
  h.emit(1);
  await h.clock.advance(350);
  assert.equal(h.animations.at(-1).config.toValue, 361, 'Crossing north must animate through 361 degrees');
  assert.equal(h.snapshot().animatedHeading.value, 361);
  assert.equal(h.snapshot().heading, 1);
  h.emit(90);
  await h.clock.advance(350);
  assert.equal(h.snapshot().heading, 90, 'One sparse event must settle to its exact native heading');
  assert.equal(h.snapshot().animatedHeading.value, 450);
  h.emit(270);
  await h.clock.advance(350);
  assert.equal(headingMath.headingDelta(h.snapshot().animatedHeading.value, 270), 0);
  assert.equal(h.snapshot().heading, 270);

  h.emit(275);
  h.emit(276, 0);
  assert.equal(h.snapshot().headingAccuracy, 0, 'Accuracy loss must bypass throttling immediately');
  h.emit(277, 3, false);
  assert.equal(h.snapshot().trueNorth, false, 'Magnetic fallback must immediately invalidate true-north alignment');
  h.emit(278, 3, true);
  assert.equal(h.snapshot().trueNorth, true);
  assert.equal(h.snapshot().heading, 278, 'Reference-frame change must publish its matching current heading');
  await h.blur();
  assert.equal(h.removed, 1);
  assert.equal(h.clock.tasks.size, 0, 'Blur must clear pending motion, display and animation work');
  const writes = h.writes.length;
  const animations = h.animations.length;
  h.emit(180);
  await h.finishGps();
  await h.clock.advance(20_000);
  assert.equal(h.writes.length, writes, 'Late heading/GPS callbacks after blur must not update state');
  assert.equal(h.animations.length, animations);
  console.log('PASS: north wrapping, exact sparse turns, immediate quality/reference changes and blur cancellation.');
}

async function checkLifecycle() {
  const h = harness();
  await h.focus();
  h.emit(240);
  await h.clock.advance(20);
  h.emit(260);
  await h.appState('background');
  assert.equal(h.snapshot().heading, null);
  assert.equal(h.removed, 1);
  assert.equal(h.clock.tasks.size, 0, 'Background must stop pending work');
  const writes = h.writes.length;
  h.emit(300, 3, true, 0);
  await h.clock.advance(1000);
  assert.equal(h.writes.length, writes);
  await h.appState('active');
  assert.equal(h.started, 2);
  h.emit(10, 2, false);
  assert.equal(h.snapshot().heading, 10, 'Resume must reset to its first new reading');
  assert.equal(h.snapshot().trueNorth, false);
  await h.clock.advance(20);
  h.emit(90, 2, false);
  h.error();
  assert.equal(h.snapshot().status, 'unavailable');
  assert.equal(h.snapshot().heading, null);
  assert.equal(h.removed, 2, 'Native watcher must be removed on error');
  assert.equal(h.clock.tasks.size, 0, 'Error must cancel pending work');
  const failedWrites = h.writes.length;
  h.emit(180);
  await h.clock.advance(20_000);
  assert.equal(h.writes.length, failedWrites, 'Late callbacks after error must not resurrect the compass');
  await h.blur();
  assert.equal(h.removed, 2);

  const denied = harness({ granted: false });
  await denied.focus();
  assert.equal(denied.snapshot().status, 'permission');
  assert.equal(denied.started, 0);
  await denied.appState('background');
  await denied.appState('active');
  assert.equal(denied.requested, 1, 'Returning from permission UI must not create a request loop');
  await denied.blur();
  assert.equal(denied.clock.tasks.size, 0);

  const late = harness({ deferWatcher: true });
  await late.focus();
  await late.blur();
  late.watches[0].resolve();
  await flush();
  assert.equal(late.removed, 1, 'Native handle resolving after blur must be removed');
  assert.equal(late.clock.tasks.size, 0);

  const lateError = harness({ deferWatcher: true });
  await lateError.focus();
  lateError.emit(30);
  lateError.error();
  lateError.watches[0].resolve();
  await flush();
  assert.equal(lateError.removed, 1, 'A handle resolving after an early error must be removed');
  assert.equal(lateError.snapshot().status, 'unavailable');
  assert.equal(lateError.clock.tasks.size, 0);
  await lateError.blur();
  console.log('PASS: focus/background/error teardown, delayed handles, stale callbacks and permission-loop protection.');
}

async function main() {
  checkMath();
  await checkPublishing();
  await checkSparseAndSafety();
  await checkLifecycle();
  console.log('PASS: physical Qibla/cardinal math agrees with Adhan; compass checks use a deterministic fake clock and mocked native driver.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
