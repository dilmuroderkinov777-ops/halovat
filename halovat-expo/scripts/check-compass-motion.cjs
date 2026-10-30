// Deterministic motion and numeric-transition checks; no browser or device required.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: name => {
    assert.ok(name in dependencies, 'Unexpected dependency: ' + name);
    return dependencies[name];
  } });
  return exports;
}

const { createHeadingSpring, headingDelta } = load('src/domain/compassHeading.ts');
const settle = spring => {
  let frames = 0;
  while (spring.moving() && frames++ < 180) spring.advance(1 / 60);
  assert.ok(!spring.moving(), 'Sparse readings must settle without further sensor events');
};
const spring = createHeadingSpring();
assert.equal(spring.advance(1 / 60), null, 'No direction before a sensor reading');
spring.setTarget(0);
assert.equal(spring.current(), 0, 'First reading initializes without a fabricated turn');
spring.setTarget(90);
const step1 = spring.advance(1 / 60);
const step2 = spring.advance(1 / 60);
assert.ok(step1 > 0 && step1 < 5, 'A turn eases in');
assert.ok(step2 - step1 > step1, 'Velocity builds smoothly instead of jumping on the first frame');
let previous = step2;
for (let frame = 0; frame < 120; frame++) {
  const heading = spring.advance(1 / 60);
  assert.ok(heading >= previous && heading <= 90, 'A fixed target must settle without oscillation');
  previous = heading;
}
assert.equal(spring.current(), 90);
assert.ok(!spring.moving(), 'Settled compass stops scheduling motion');

for (const [from, to, expected] of [[359, 1, 361], [1, 359, -1]]) {
  spring.reset(from); spring.setTarget(to);
  assert.equal(spring.target(), expected, 'North crossing keeps the shortest turn');
  settle(spring);
  assert.equal(headingDelta(spring.current(), to), 0);
}
spring.reset(0);
for (let target = 10; target <= 1080; target += 10) {
  spring.setTarget(target % 360);
  for (let frame = 0; frame < 6; frame++) spring.advance(1 / 60);
}
settle(spring);
assert.equal(spring.current(), 1080, 'Repeated full turns preserve continuous rotation');

// Retargeting must retain velocity, so regular 10 Hz sensor updates never restart easing.
const continued = createHeadingSpring(), retargeted = createHeadingSpring();
for (const motion of [continued, retargeted]) {
  motion.setTarget(0); motion.setTarget(90);
  for (let frame = 0; frame < 6; frame++) motion.advance(1 / 60);
}
retargeted.setTarget(120);
const before = retargeted.current();
const retainedVelocity = (retargeted.advance(0.00001) - before) / 0.00001;
const referenceVelocity = (continued.advance(0.00001) - before) / 0.00001;
assert.ok(Math.abs(retainedVelocity - referenceVelocity) < 0.1, 'New samples preserve angular velocity');
retargeted.setTarget(350);
settle(retargeted);
assert.equal(headingDelta(retargeted.current(), 350), 0, 'A reversal must settle at the actual latest heading');

const positions = [30, 60, 120].map(fps => {
  const motion = createHeadingSpring(); motion.setTarget(0); motion.setTarget(90);
  for (let frame = 0; frame < fps / 5; frame++) motion.advance(1 / fps);
  return motion.current();
});
assert.ok(Math.max(...positions) - Math.min(...positions) < 1e-10, 'Refresh rate must not alter spring timing');
spring.reset(30); spring.setTarget(120);
assert.equal(spring.advance(1 / 60, true), 120, 'Reduced motion updates immediately');
assert.ok(!spring.moving());
spring.setTarget(200); spring.advance(1 / 60); spring.setTarget(null);
assert.equal(spring.current(), null, 'Sensor loss clears motion');
assert.ok(!spring.moving());
spring.setTarget(240);
assert.equal(spring.current(), 240, 'Recovery initializes at the fresh reading');
console.log('PASS: smooth angular velocity, shortest north crossing, sparse settling, 10 Hz targets, reversals, repeated turns, refresh-rate independence, reduced motion and sensor recovery.');

const slots = [];
let cursor = 0, dirty = false, fontScale = 1;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  memo: component => component,
  useState(initial) {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], value => {
      if (slots[index] !== value) { slots[index] = value; dirty = true; }
    }];
  },
};
const { CompassDegrees } = load('src/components/CompassDegrees.tsx', {
  react,
  'react-native': { View: 'View', StyleSheet: { create: styles => styles }, useWindowDimensions: () => ({ fontScale }) },
  '../ui/AppText': { Text: 'Text' },
  './NativeCountdownText': { NativeCountdownText: 'NativeCountdownText' },
});
const find = (node, type) => Array.isArray(node) ? node.flatMap(child => find(child, type)) : node?.props
  ? [...(node.type === type ? [node] : []), ...find(node.props.children, type)] : [];
function render(angle, reduceMotion = false) {
  let tree;
  do { dirty = false; cursor = 0; tree = CompassDegrees({ angle, reduceMotion, color: '#003527' }); } while (dirty);
  return { tree, counter: find(tree, 'NativeCountdownText')[0]?.props };
}
assert.equal(render(null).counter, undefined, 'Missing heading displays a placeholder');
let reading = render(52);
assert.equal(reading.tree.props.accessibilityLabel, '52°');
assert.equal(reading.counter.text, '52°');
assert.equal(reading.counter.animate, false, 'First reading must not roll from an invented value');
reading.tree.props.onLayout({ nativeEvent: { layout: { width: 100 } } });
reading = render(51);
assert.equal(reading.counter.seconds, 51);
assert.ok(reading.counter.countsDown && reading.counter.animate, 'Decreasing degrees reuse the countdown animation');
const scale = reading.counter.scale;
reading = render(-99);
assert.equal(reading.counter.text, '99°');
assert.equal(reading.counter.countsDown, false, 'Increasing degrees roll in the opposite direction');
assert.ok(reading.counter.animate);
reading = render(100);
assert.equal(reading.counter.scale, scale, 'Digit-count changes must not resize the type');
assert.ok(reading.counter.width <= 100, 'Three-digit degrees fit in a narrow column');
fontScale = 2.5;
reading = render(180);
assert.ok(reading.counter.width <= 100, 'Large accessibility text still fits the available width');
assert.equal(reading.counter.text, '180°');
reading = render(179, true);
assert.ok(reading.counter.reduceMotion && !reading.counter.animate, 'Reduced motion disables numeric animation');
assert.equal(render(null).counter, undefined);
assert.equal(render(10).counter.animate, false, 'Sensor recovery must not roll from a stale degree');
assert.equal(render(0).counter.text, '0°', 'Aligned direction must retain an exact zero');
assert.equal(render(0.4).counter.seconds, 0, 'Sub-degree noise leaves the displayed digit unchanged');
console.log('PASS: compass degrees reuse NativeCountdownText with bidirectional rolling, exact numeric values, stable font size, narrow/large-text layout, accessibility label, reduced motion and missing-heading recovery.');
