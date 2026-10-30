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
const { createQiblaAlignment, isQiblaAligned } = bundle('src/domain/qiblaAlignment.ts');
const quickReturn = createQiblaAlignment();
assert.equal(quickReturn(240, 240, true).feedback, true);
quickReturn(240, 210, true);
assert.equal(quickReturn(240, 240, true).feedback, true,
  'A new alignment after turning away must buzz even within 1.8 seconds of the previous one');
for (const angle of [0, -0.4, 0.4, -5, 5]) assert.equal(isQiblaAligned(angle), true);
for (const angle of [-5.01, 5.01, -180, 180, null, NaN, Infinity, -Infinity]) assert.equal(isQiblaAligned(angle), false);
for (const heading of [235, 245]) {
  const boundary = createQiblaAlignment();
  assert.equal(boundary(240, heading, true).feedback, true, 'Both 5° boundaries confirm alignment');
}
assert.equal(createQiblaAlignment()(240, 234.9, true).feedback, false, 'Haptics must not start outside 5°');
const track = createQiblaAlignment();
assert.equal(track(240, 188, true).aligned, false);
assert.equal(track(240, 235, true).feedback, true);
for (const angle of [239, 240, 241, 232, 231, 229, 240]) {
  const state = track(240, angle, true);
  assert.equal(state.aligned, Math.abs(240 - angle) <= 5, 'Feedback hysteresis must not change the visible ±5° tolerance');
  assert.equal(state.feedback, false, 'Holding the direction must not buzz again');
}
assert.equal(track(240, 226, true).aligned, false);
assert.equal(track(240, 240, true).feedback, true, 'Returning after a clear turn must rearm immediately');
assert.equal(track(240, 240, false).aligned, false, 'Inactive screens must not confirm direction');
assert.equal(track(240, null, true).aligned, false);
assert.equal(track(240, NaN, true).aligned, false);
assert.equal(track(NaN, 240, true).aligned, false);
assert.equal(track(0, 359, true).feedback, true, 'Alignment must cross north correctly');

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
emit(240, 0); assert.equal(render(), true); assert.equal(haptics.length, 1, 'Low confidence must not block the visible alignment feedback');
emit(240, 3, false); assert.equal(render(), true);
assert.equal(haptics.length, 1, 'Confidence/reference changes alone must not vibrate again');
emit(240); assert.equal(render(), true); assert.equal(haptics.length, 1);
for (let i = 0; i < 30; i++) { emit([232, 240, 231, 242][i % 4]); render(); }
assert.equal(haptics.length, 1, 'No repeating vibration while aligned');
// Repeated full rotations in both directions, with accuracy loss and magnetic fallback.
for (let turn = 0; turn < 12; turn++) {
  const before = haptics.length;
  const direction = turn % 2 ? -1 : 1;
  for (let delta = 30; delta <= 360; delta += 30) {
    const heading = ((240 + direction * delta) % 360 + 360) % 360;
    emit(heading, turn % 4, turn % 3 !== 0);
    assert.equal(render(), delta === 360, 'Every completed turn must return to aligned');
  }
  assert.equal(haptics.length, before + 1, 'Each full turn must produce exactly one new confirmation');
}
const afterTurns = haptics.length;
// Several genuine re-entries inside the old 1.8s cooldown must not get swallowed.
for (let index = 0; index < 3; index++) { emit(210); render(); emit(240, 1); render(); }
assert.equal(haptics.length, afterTurns + 3);
const beforeBackground = haptics.length;
render(false); emit(240); assert.equal(render(false), false);
assert.equal(haptics.length, beforeBackground, 'No haptic from a background/unfocused screen');
render(true); render(); assert.equal(haptics.length, beforeBackground + 1, 'Fresh focus can confirm alignment once');
emit(null); assert.equal(render(), false);
emit(0); render(); assert.equal(haptics.length, beforeBackground + 1, 'Phone north is not Qibla in Tashkent');
render(true, 0); assert.equal(render(true, 0), true);
assert.equal(haptics.length, beforeBackground + 2, 'Changing the geographic bearing uses the current heading');
slots.forEach(slot => slot?.cleanup?.());
emit(240); assert.equal(haptics.length, beforeBackground + 2, 'Unmount removes the sensor subscription');
assert.ok(haptics.every(event => event.type === 'success'));
console.log('PASS: ±5° guidance and feedback agree through 12 full turns, rapid re-entry, accuracy loss and magnetic fallback; jitter never repeats feedback, invalid readings and lifecycle cleanup remain safe.');
