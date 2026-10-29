// Headless checks for the actual tracker state and native action handlers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let hooks;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } }),
  useState: initial => {
    const index = hooks.cursor++;
    if (!(index in hooks.values)) hooks.values[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.values[index], update => { hooks.values[index] = typeof update === 'function' ? update(hooks.values[index]) : update; }];
  },
  useMemo: create => create(),
};
function load(path, resolver) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: resolver, Date });
  return exports;
}
const prayers = load('src/domain/prayers.ts', require);
const now = new Date(2026, 9, 29, 12);
const store = { now, data: { prayerStatus: {} }, togglePrayerStatus() {}, setPrayerStatus() {} };
function requireModule(name) {
  if (name === 'react') return react;
  if (name === 'react-native') return { Pressable: 'Pressable', Share: {}, StyleSheet: { create: value => value }, View: 'View', useWindowDimensions: () => ({ width: 390 }) };
  if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle' };
  if (name === 'lucide-react-native') return Object.fromEntries(['BookOpen', 'CalendarDays', 'Check', 'CheckCircle2', 'Flame', 'History', 'Info', 'Minus', 'X'].map(x => [x, x]));
  if (name.endsWith('/useAppTheme')) return { useThemedStyles: styles => styles };
  if (name.endsWith('/theme')) return { Typography: {} };
  if (name.endsWith('/AppText')) return { Text: 'Text' };
  if (name.endsWith('/AppContext')) return { useHalovat: () => store };
  if (name.endsWith('/domain/prayers')) return prayers;
  for (const type of ['NativeCalendar', 'NativeAction', 'NativeSegments', 'NativeSheet', 'Screen']) if (name.endsWith('/' + type)) return { [type]: type };
  throw new Error('Unexpected import: ' + name);
}
function find(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
const Tracker = load('src/app/(tabs)/tracker/index.tsx', requireModule).default;
hooks = { values: [], cursor: 0 };
function render() { hooks.cursor = 0; return Tracker(); }
function action(tree, label) { const node = find(tree, 'NativeAction').find(item => item.props.label === label); assert.ok(node, label); return node.props; }
function sheet(tree) { return find(tree, 'NativeSheet').find(item => item.props.title === 'Sana tanlash'); }
function range(tree) { return find(tree, 'Text').map(item => item.props.children).find(value => typeof value === 'string' && value.includes(' – ')); }
let tree = render();
assert.equal(range(tree), '26 oktyabr – 1 noyabr');
assert.equal(action(tree, '›').disabled, true);
assert.equal(action(tree, '‹').accessibilityLabel, 'Oldingi hafta');
assert.ok(find(tree, 'Text').some(item => item.props.children === 'Bugun'));
assert.equal(sheet(tree).props.visible, false);
action(tree, '‹').onPress();
tree = render();
assert.equal(range(tree), '19 oktyabr – 25 oktyabr');
assert.equal(action(tree, '›').disabled, false);
action(tree, '›').onPress();
tree = render();
assert.equal(range(tree), '26 oktyabr – 1 noyabr');
assert.equal(action(tree, '›').disabled, true);
action(tree, '▦').onPress();
tree = render();
assert.equal(sheet(tree).props.visible, true);
find(sheet(tree), 'NativeCalendar')[0].props.onChange(new Date(2025, 11, 31));
tree = render();
assert.equal(sheet(tree).props.visible, false);
assert.equal(range(tree), '29 dekabr – 4 yanvar');
assert.equal(find(tree, 'NativeCalendar')[0].props.maximumDate, now);
action(tree, '›').onPress();
assert.equal(range(render()), '5 yanvar – 11 yanvar');
console.log('PASS: weekly strip navigation, current-week boundary, native date sheet and year rollover.');
