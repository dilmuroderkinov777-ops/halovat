// Exercise the actual native form's draft/save lifecycle without a device.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let cursor = 0;
const hooks = [];
let effects = [];
let dismissals = 0;
let blurs = 0;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useRef: initial => {
    const index = cursor++;
    return hooks[index] ??= { current: initial };
  },
  useEffect: (effect, deps) => {
    const index = cursor++;
    if (!hooks[index] || deps.some((value, i) => value !== hooks[index][i])) effects.push(effect);
    hooks[index] = deps;
  },
};
const ui = Object.fromEntries(['BottomSheet', 'Button', 'Column', 'Host', 'ScrollView', 'Text', 'TextInput'].map(type => [type, type]));
ui.useNativeState = initial => react.useRef({ value: initial, set(value) { this.value = value; } }).current;
const compiled = ts.transpileModule(fs.readFileSync('src/components/ProfileNameSheet.tsx', 'utf8'), { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
} }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, { exports: exportsObject, require(name) {
  if (name === 'react') return react;
  if (name === '@expo/ui') return ui;
  if (name === 'react-native') return { Keyboard: { dismiss: () => dismissals++ }, StyleSheet: { absoluteFill: { position: 'absolute' } } };
  if (name.endsWith('/LanguageContext')) return { useLanguage: () => ({ t: text => text }) };
  if (name.endsWith('/useAppTheme')) return { useAppTheme: () => ({ dark: false }), useThemeColors: () => ({ green: '#006C49', ink: '#1B1C1A', body: '#404944', muted: '#707974', paper: '#FFFFFF' }) };
  if (name.endsWith('/theme')) return { Colors: { green: '#006C49' } };
  if (name === './nativeAccessibility') return { nativeAccessibilityLabel: label => [{ label }] };
  if (name === './nativeControlModifiers') return { actionModifiers: () => [], largeActionLabelModifiers: () => [], sheetAppearance: () => [] };
  throw new Error('Unexpected import: ' + name);
} });
function find(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => find(child, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
const saved = [];
const props = { visible: false, name: 'Halovat', onSave: name => { saved.push(name); props.name = name; }, onClose: () => { props.visible = false; } };
function render() {
  cursor = 0;
  const tree = exportsObject.ProfileNameSheet(props);
  const pending = effects;
  effects = [];
  pending.forEach(effect => effect());
  find(tree, 'TextInput')[0].props.ref.current = { blur: () => blurs++ };
  return tree;
}
render();
props.visible = true;
let tree = render();
let input = find(tree, 'TextInput')[0].props;
assert.equal(input.value.value, 'Halovat');
assert.equal(input.maxLength, 40);
assert.ok(!input.autoFocus, 'Do not focus while the sheet is still presenting');
assert.equal(find(tree, 'BottomSheet')[0].props.isPresented, true);
assert.equal(find(tree, 'RNHostView').length, 0, 'Native form must not inherit the fixed RN sheet height');
assert.equal(find(tree, 'ScrollView').length, 1, 'Form can scroll when the keyboard reduces the viewport');
input.value.set('Wikki');
find(tree, 'Button')[0].props.onPress();
assert.deepEqual(saved, ['Wikki']);
assert.equal(props.visible, false);
assert.equal(blurs, 1);
assert.equal(dismissals, 1);
render();
props.visible = true;
tree = render();
input = find(tree, 'TextInput')[0].props;
assert.equal(input.value.value, 'Wikki');
input.value.set('Unsaved name');
find(tree, 'Button')[1].props.onPress();
assert.deepEqual(saved, ['Wikki'], 'Closing does not save an unfinished draft');
render();
props.visible = true;
tree = render();
input = find(tree, 'TextInput')[0].props;
assert.equal(input.value.value, 'Wikki', 'Reopening resets to the saved name');
input.onSubmitEditing('Wikki New');
assert.deepEqual(saved, ['Wikki', 'Wikki New']);
assert.equal(props.visible, false);
render();
props.visible = true;
tree = render();
find(tree, 'TextInput')[0].props.value.set('Discard on swipe');
find(tree, 'BottomSheet')[0].props.onDismiss();
assert.equal(props.visible, false);
assert.deepEqual(saved, ['Wikki', 'Wikki New']);
console.log('PASS: native profile name draft, save, keyboard submit, cancel, swipe dismissal and reopen lifecycle.');
