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
const store = { now, data: { prayerStatus: {} }, togglePrayerStatus(day, prayer) {
  const key = prayers.prayerKey(day, prayer);
  const current = this.data.prayerStatus[key];
  if (current === 'missed') delete this.data.prayerStatus[key];
  else this.data.prayerStatus[key] = current === 'done' ? 'missed' : 'done';
}, setPrayerStatus() {} };
// Match AppContext's callback shape, which does not rely on a receiver.
store.togglePrayerStatus = store.togglePrayerStatus.bind(store);
function requireModule(name) {
  if (name === 'react') return react;
  if (name === 'react-native') return { Pressable: 'Pressable', Share: {}, StyleSheet: { create: value => value }, View: 'View', useWindowDimensions: () => ({ width: 390 }) };
  if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Circle: 'Circle' };
  if (name === 'lucide-react-native') return Object.fromEntries(['BookOpen', 'CalendarDays', 'Check', 'CheckCircle2', 'Flame', 'History', 'Info', 'Minus', 'X'].map(x => [x, x]));
  if (name.endsWith('/useAppTheme')) return { useThemedStyles: styles => styles };
  if (name.endsWith('/theme')) return { Typography: {} };
  if (name.endsWith('/AppText')) return { Text: 'Text' };
  if (name.endsWith('/AppContext')) return { useHalovat: () => store };
  if (name.endsWith('/LanguageContext')) return { useLanguage: () => ({ language: 'uz', t: text => text }) };
  if (name.endsWith('/domain/prayers')) return prayers;
  for (const type of ['PrayerCalendarSheet', 'NativeAction', 'NativeSegments', 'NativeSheet', 'Screen']) if (name.endsWith('/' + type)) return { [type]: type };
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
function sheet(tree) { return find(tree, 'PrayerCalendarSheet')[0]; }
function range(tree) { return find(tree, 'Text').map(item => item.props.children).find(value => typeof value === 'string' && value.includes(' – ')); }
function progress(tree) { return find(tree, 'Pressable').find(item => item.props.accessibilityLabel === 'Bajarilish darajasi'); }
let tree = render();
assert.equal(range(tree), '26 oktyabr – 1 noyabr');
const page = find(tree, 'Screen')[0].props.children;
assert.equal(page.props.children[0].type, 'NativeSegments');
assert.ok(progress(page.props.children[1]), 'Results replace the deleted date strip');
assert.ok(find(page.props.children[2], 'Text').some(item => item.props.children === 'Haftalik belgilash'));
assert.equal(find(tree, 'CalendarDays').length, 0);
assert.equal(find(tree, 'NativeAction').filter(item => ['▦', '‹', '›'].includes(item.props.label)).length, 0);
assert.equal(find(page, 'PrayerCalendarSheet').length, 0, 'Sheet is hosted outside the screen scroll');
assert.equal(sheet(tree).props.visible, false);
progress(tree).props.onPress();
tree = render();
assert.equal(sheet(tree).props.visible, true);
find(tree, 'NativeSegments')[0].props.onChange('month');
tree = render();
assert.ok(find(tree, 'Text').some(item => item.props.children === 'Oylik natija'));
assert.ok(find(tree, 'Text').some(item => Array.isArray(item.props.children) && item.props.children.join('') === '/ 155 namoz'));
const Calendar = load('src/components/PrayerCalendarSheet.tsx', requireModule).PrayerCalendarSheet;
function calendar() { return Calendar(sheet(render()).props); }
function cell(day, prayer) {
  const node = find(calendar(), 'Pressable').find(item => item.props.accessibilityLabel.startsWith(prayer + ', ' + day + ' oktyabr:'));
  assert.ok(node);
  return node.props;
}
let calendarTree = calendar();
assert.equal(find(calendarTree, 'Pressable').length, 31 * 6, 'Every date and five prayers are shown for the entire month');
assert.equal(action(calendarTree, '›').disabled, true, 'Cannot browse beyond the current month');
assert.equal(cell(30, 'Bomdod').disabled, true);
cell(29, 'Bomdod').onPress();
assert.equal(store.data.prayerStatus['2026-10-29:fajr'], 'done');
assert.ok(cell(29, 'Bomdod').accessibilityLabel.endsWith('O‘qildi'));
tree = render();
assert.ok(find(progress(tree), 'Text').some(item => item.props.children === 1), 'Calendar edits update the summary');
cell(29, 'Bomdod').onPress();
assert.equal(store.data.prayerStatus['2026-10-29:fajr'], 'missed');
cell(29, 'Bomdod').onPress();
assert.equal(store.data.prayerStatus['2026-10-29:fajr'], undefined);
const day12 = find(calendar(), 'Pressable').find(item => item.props.accessibilityLabel === '12 oktyabr');
day12.props.onPress();
assert.equal(range(render()), '12 oktyabr – 18 oktyabr', 'Calendar date selection changes the weekly matrix');
action(calendar(), '‹').onPress();
assert.equal(sheet(render()).props.value.getMonth(), 8);
assert.equal(find(calendar(), 'Pressable').length, 30 * 6);
assert.equal(action(calendar(), '›').disabled, false);
sheet(render()).props.onChange(new Date(2025, 11, 31));
action(calendar(), '›').onPress();
assert.equal(prayers.dateKey(sheet(render()).props.value), '2026-01-31', 'Month navigation crosses the year boundary');
action(calendar(), '›').onPress();
assert.equal(prayers.dateKey(sheet(render()).props.value), '2026-02-28', 'Month navigation clamps dates to the shorter month');
assert.equal(find(calendar(), 'Pressable').length, 28 * 6);
sheet(render()).props.onChange(new Date(2024, 1, 29));
assert.equal(find(calendar(), 'Pressable').length, 29 * 6, 'Leap-day calendars remain complete');
sheet(render()).props.onClose();
tree = render();
assert.equal(sheet(tree).props.visible, false);

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
console.log('PASS: summary-first tracker, monthly calendar sheet, shared status edits, month/year boundaries, leap dates and native touch targets.');
