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
for (const label of ['▦', '‹', '›']) assert.equal(action(tree, label).square, true);
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

// Check the actual shared action wrapper as well: mocked callbacks alone cannot catch
// a compact native host collapsing around the glyph instead of its touch area.
for (const os of ['ios', 'android']) {
  const NativeAction = load('src/components/NativeAction.tsx', name => {
    if (name === 'react') return react;
    if (name === '@expo/ui') return { Button: 'Button', Host: 'Host', Text: 'NativeText' };
    if (name === 'react-native') return { Platform: { OS: os }, useWindowDimensions: () => ({ fontScale: 1 }) };
    if (name.endsWith('/LanguageContext')) return { useLanguage: () => ({ t: text => text }) };
    if (name.endsWith('/useAppTheme')) return { useAppTheme: () => ({ dark: false }), useThemeColors: () => ({ green: '#006C49' }) };
    if (name.endsWith('/theme')) return { Colors: { green: '#006C49' } };
    if (name === './nativeControlModifiers') return { actionModifiers: () => [], largeActionLabelModifiers: () => [], squareActionLabelModifiers: () => [{ type: 'square-label' }] };
    if (name === './nativeAccessibility') return { nativeAccessibilityLabel: label => [{ label }] };
    throw new Error('Unexpected import: ' + name);
  }).NativeAction;
  hooks = { values: [], cursor: 0 };
  let pressed = 0;
  const host = NativeAction({ label: '‹', compact: true, square: true, variant: 'text', onPress: () => pressed++ });
  assert.equal(host.props.matchContents, false);
  assert.equal(host.props.style.width, 44);
  assert.equal(host.props.style.height, 44);
  const button = find(host, 'Button')[0];
  assert.ok(button);
  if (os === 'android') assert.equal(button.props.style.width, 44);
  assert.equal(find(button, 'NativeText')[0].props.modifiers[0].type, 'square-label');
  button.props.onPress();
  assert.equal(pressed, 1);
}
const iosModifiers = load('src/components/nativeControlModifiers.ios.ts', name => {
  if (name === 'react-native') return { Platform: { Version: '26.0' } };
  if (name.endsWith('/theme')) return { Colors: { green: '#006C49' } };
  if (name === '@expo/ui/swift-ui/modifiers') return {
    frame: size => ({ type: 'frame', ...size }),
    contentShape: shape => ({ type: 'contentShape', shape }),
    shapes: { rectangle: () => 'rectangle' },
  };
  throw new Error('Unexpected import: ' + name);
});
const touchModifiers = iosModifiers.squareActionLabelModifiers();
assert.equal(touchModifiers[0].width, 44);
assert.equal(touchModifiers[0].height, 44);
assert.equal(touchModifiers[1].shape, 'rectangle');
console.log('PASS: weekly navigation, date picker, boundaries and 44-point native action hosts.');
