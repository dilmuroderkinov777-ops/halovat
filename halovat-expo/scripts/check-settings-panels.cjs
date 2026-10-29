const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let hooks = [], cursor = 0, dismissed = 0;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useRef: initial => { const i = cursor++; return hooks[i] ??= { current: initial }; },
  useState: initial => { const i = cursor++; if (!(i in hooks)) hooks[i] = initial; return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }]; },
};
const native = Object.fromEntries(['BottomSheet', 'Button', 'Column', 'Host', 'Row', 'ScrollView', 'Spacer', 'Text', 'TextInput'].map(x => [x, x]));
const platform = { OS: 'ios' };
native.Icon = Object.assign(function Icon() {}, { select: spec => platform.OS === 'ios' ? spec.ios : spec.android });
native.useNativeState = initial => react.useRef({ value: initial, set(value) { this.value = value; } }).current;
function load(path, resolver) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText, { exports, require: resolver });
  return exports;
}
const prayers = load('src/domain/prayers.ts', require);
function resolver(name) {
  if (name === 'react') return react;
  if (name === '@expo/ui') return native;
  if (name === 'react-native') return { Platform: platform, Pressable: 'Pressable', View: 'View', Keyboard: { dismiss: () => dismissed++ }, StyleSheet: { create: x => x, absoluteFill: {} }, Linking: {} };
  if (name === 'lucide-react-native') return Object.fromEntries(['Check', 'ChevronDown', 'ChevronUp', 'Info', 'Minus'].map(x => [x, x]));
  if (name.endsWith('/LanguageContext')) return { useLanguage: () => ({ t: x => x }) };
  if (name.endsWith('/useAppTheme')) return { useThemedStyles: x => x, useAppTheme: () => ({ dark: false }), useThemeColors: () => ({ green: '#006C49' }) };
  if (name.endsWith('/domain/prayers')) return prayers;
  if (name.endsWith('/AppText')) return { Text: 'Text' };
  if (name === './nativeControlModifiers') return { actionModifiers: () => [], minimalActionLabelModifiers: () => [], squareActionLabelModifiers: () => [], sheetAppearance: () => [] };
  if (name === './nativeAccessibility') return { nativeAccessibilityLabel: label => [{ label }] };
  if (name === './NativeAction') return { NativeAction: 'NativeAction' };
  if (name === './NativeCloseButton') return { NativeCloseButton: 'NativeCloseButton' };
  if (name.endsWith('.xml')) return name;
  if (name === './SettingsPanelUI') return Object.fromEntries(['SettingsDisclosure', 'SettingsNotice', 'SettingsSteps'].map(x => [x, x]));
  throw new Error('Unexpected import: ' + name);
}
function find(node, type) {
  if (Array.isArray(node)) return node.flatMap(x => find(x, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
function text(node) { return find(node, 'Text').flatMap(x => x.props.children).filter(x => typeof x === 'string').join(' '); }
function cityButtons(node) { return find(node, 'Button').filter(button => !button.props.label); }
const City = load('src/components/CitySelectionSheet.tsx', resolver).CitySelectionSheet;
let selected = [], fail = false, complete;
const props = { visible: true, cityId: 'toshkent', onClose: () => { props.visible = false; }, onSelect: id => {
  selected.push(id);
  if (fail) return Promise.reject(new Error('storage unavailable'));
  return new Promise(resolve => { complete = resolve; });
} };
function render() { cursor = 0; return City(props); }
async function main() {
  let tree = render();
  assert.equal(find(tree, 'RNHostView').length, 0, 'Native search sheet can adapt to keyboard height');
  assert.equal(find(tree, 'NativeCloseButton').length, 1);
  assert.equal(find(tree, 'Button').length, prayers.CITIES.length);
  assert.ok(text(tree).includes('✓  Toshkent'));
  const search = query => { const input = find(render(), 'TextInput')[0].props; input.value.set(query); input.onChangeText(query); return render(); };
  tree = search("  MARG'ILON  ");
  assert.equal(find(tree, 'Button').length, 1, 'Search ignores apostrophe variants, case and outer spaces');
  assert.ok(text(tree).includes('Marg‘ilon'));
  tree = search('nonexistent');
  assert.ok(text(tree).includes('Shahar topilmadi'));
  tree = search('Samarqand');
  cityButtons(tree)[0].props.onPress();
  assert.equal(props.visible, true, 'Do not dismiss before saving completes');
  assert.ok(cityButtons(render())[0].props.disabled);
  complete(); await new Promise(setImmediate);
  assert.equal(props.visible, false);
  assert.deepEqual(selected, ['samarqand']);
  assert.equal(find(render(), 'TextInput')[0].props.value.value, '');
  props.visible = true; fail = true;
  tree = search('Buxoro');
  cityButtons(tree)[0].props.onPress(); await new Promise(setImmediate);
  assert.equal(props.visible, true, 'Save errors keep the picker open');
  assert.ok(text(render()).includes('Shahar saqlanmadi. Qayta urinib ko‘ring.'));
  find(render(), 'NativeCloseButton')[0].props.onPress();
  props.visible = true;
  assert.equal(find(render(), 'Button').length, prayers.CITIES.length, 'Reopening clears search and errors');
  assert.ok(!text(render()).includes('Shahar saqlanmadi'));
  assert.equal(dismissed, 2);

  const Close = load('src/components/NativeCloseButton.tsx', resolver).NativeCloseButton;
  let closeCount = 0;
  for (const os of ['ios', 'android', 'web']) {
    platform.OS = os;
    const close = Close({ onPress: () => closeCount++ });
    const button = find(close, 'Button')[0];
    assert.equal(button.props.label, undefined, 'Close control has no visible word label');
    assert.ok(button.props.style.width >= 44 && button.props.style.height >= 44);
    assert.ok(button.props.modifiers.some(modifier => modifier.label === 'Yopish'), 'Accessible close label is retained');
    button.props.onPress();
    if (os !== 'web') assert.equal(find(close, native.Icon)[0].props.name, os === 'ios' ? 'xmark.circle.fill' : '../../assets/sheet-close.xml');
    else assert.ok(text(close).includes('×'), 'Web also has a visible close control');
  }
  assert.equal(closeCount, 3);

  const ui = load('src/components/SettingsPanelUI.tsx', resolver);
  hooks = []; cursor = 0;
  const details = { title: 'Details', children: 'content' };
  let disclosure = ui.SettingsDisclosure(details);
  assert.equal(find(disclosure, 'Pressable')[0].props.accessibilityState.expanded, false);
  find(disclosure, 'Pressable')[0].props.onPress(); cursor = 0;
  disclosure = ui.SettingsDisclosure(details);
  assert.equal(find(disclosure, 'Pressable')[0].props.accessibilityState.expanded, true);
  assert.ok(text(ui.SettingsStatus({ label: 'Notifications', value: null })).includes('Tekshirilmoqda…'));
  assert.ok(text(ui.SettingsStatus({ label: 'Notifications', value: null, unavailable: true })).includes('Aniqlanmadi'));
  assert.ok(text(ui.SettingsStatus({ label: 'Notifications', value: true })).includes('Yoqilgan'));
  assert.ok(text(ui.SettingsStatus({ label: 'Notifications', value: false })).includes('Sozlash kerak'));
  const Guide = load('src/components/IPhoneSetupGuide.tsx', resolver).IPhoneSetupGuide;
  let tests = 0;
  const guide = Guide({ expoGo: true, onVibrationTest: () => tests++ });
  assert.equal(find(guide, 'SettingsDisclosure').length, 4);
  assert.equal(find(guide, 'SettingsDisclosure')[0].props.initiallyOpen, true);
  find(guide, 'NativeAction').find(x => x.props.label === 'Vibratsiyani tekshirish').props.onPress();
  assert.equal(tests, 1);
  assert.ok(find(guide, 'SettingsSteps').some(x => x.props.steps.includes('Expo Go ilovasiga ruxsat bering.')));
  console.log('PASS: city search/save/error/dismiss/reset; native close icons, accessible labels and callbacks; expandable guides and permission badges.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
