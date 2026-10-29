const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildSync } = require('esbuild');

function bundle(file, requireModule = require) {
  const code = buildSync({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'cjs',
    external: ['react', 'react-native', 'expo-haptics', 'expo-router'] }).outputFiles[0].text;
  const box = { exports: {} };
  vm.runInNewContext(code, { module: box, exports: box.exports, require: requireModule, Date: { now: () => now } });
  return box.exports;
}
let now = 0;
const { createCompassMotion } = bundle('src/domain/compassMotion.ts');
const { createQiblaAlignment } = bundle('src/domain/qiblaAlignment.ts');
const track = createQiblaAlignment();
assert.equal(track(240, 188, true, 0).aligned, false);
assert.equal(track(240, 233, true, 10).feedback, true);
for (const angle of [239, 240, 241, 232, 231, 229, 240]) {
  const state = track(240, angle, true, 100);
  assert.equal(state.aligned, true, 'Hysteresis must tolerate boundary noise');
  assert.equal(state.feedback, false, 'Holding the direction must not buzz again');
}
assert.equal(track(240, 226, true, 200).aligned, false);
assert.equal(track(240, 240, true, 250).feedback, false, 'Rapid re-entry must honor cooldown');
track(240, 210, true, 2000);
assert.equal(track(240, 240, true, 2100).feedback, true);
assert.equal(track(240, 240, false, 2200).aligned, false, 'Low confidence must never confirm direction');
assert.equal(track(240, null, true, 2300).aligned, false);
assert.equal(track(240, NaN, true, 2400).aligned, false);
assert.equal(track(NaN, 240, true, 2500).aligned, false);
assert.equal(track(0, 359, true, 4200).feedback, true, 'Alignment must cross north correctly');

const slots = [], effects = [];
let cursor = 0;
const haptics = [];
const react = {
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; }];
  },
  useEffect(callback, deps) {
    const index = cursor++;
    const previous = slots[index];
    if (!previous || deps.some((value, i) => value !== previous.deps[i])) effects.push(() => {
      previous?.cleanup?.();
      slots[index] = { deps, cleanup: callback() };
    });
  },
};
const { useQiblaAlignment } = bundle('src/hooks/useQiblaAlignment.ts', name => {
  if (name === 'react') return react;
  if (name === 'react-native') return { AppState: { currentState: 'active' } };
  if (name === 'expo-router') return { useIsFocused: () => true };
  if (name === 'expo-haptics') return { NotificationFeedbackType: { Success: 'success' }, notificationAsync: async type => haptics.push({ type, at: now }) };
  throw new Error('Unexpected dependency ' + name);
});
const motion = createCompassMotion();
const render = (active = true, bearing = 240) => {
  cursor = 0;
  const result = useQiblaAlignment(motion, bearing, active);
  while (effects.length) effects.shift()();
  return result;
};
const emit = (heading, accuracy = 3, trueNorth = true) => {
  now += 100;
  motion.publish(heading === null ? null : { heading, accuracy, trueNorth });
};
render();
emit(188); assert.equal(render(), false);
emit(240, 0); assert.equal(render(), false);
emit(240, 3, false); assert.equal(render(), false);
assert.equal(haptics.length, 0, 'No feedback from unreliable or magnetic-only samples');
emit(240); assert.equal(render(), true); assert.equal(haptics.length, 1);
for (let i = 0; i < 30; i++) { emit([232, 240, 231, 242][i % 4]); render(); }
assert.equal(haptics.length, 1, 'No repeating vibration while aligned');
render(false); emit(240); assert.equal(render(false), false);
assert.equal(haptics.length, 1, 'No haptic from a background/unfocused screen');
render(true); render(); assert.equal(haptics.length, 2, 'Fresh focus can confirm alignment once');
emit(null); assert.equal(render(), false);
now += 2000;
emit(0); render(); assert.equal(haptics.length, 2, 'Phone north is not Qibla in Tashkent');
render(true, 0); assert.equal(render(true, 0), true);
assert.equal(haptics.length, 3, 'Changing the geographic bearing uses the current heading');
slots.forEach(slot => slot?.cleanup?.());
emit(240); assert.equal(haptics.length, 3, 'Unmount removes the sensor subscription');
assert.ok(haptics.every(event => event.type === 'success'));
console.log('PASS: actual alignment hook sends one success haptic on entry; hysteresis, cooldown, north crossing, quality, geographic changes, focus/background and unmount checks pass.');
