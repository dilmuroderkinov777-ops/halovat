// Check the actual tab layout against the actual app palette. Native rendering
// is mocked; Liquid Glass compositing still needs visual verification on iOS.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let dark = false;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useMemo: create => create(),
};
function load(file, dependencies) {
  const exports = {};
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(output, { exports, require: name => {
    assert.ok(name in dependencies, 'Unexpected dependency: ' + name);
    return dependencies[name];
  } });
  return exports;
}
const theme = load('src/ui/theme.ts', {});
const appearance = load('src/ui/useAppTheme.ts', {
  react, './theme': theme, '../context/AppContext': { useHalovatDarkMode: () => dark },
});
const NativeTabs = { Trigger: { Icon: 'Icon', Label: 'Label' } };
const { default: TabLayout } = load('src/app/(tabs)/_layout.tsx', {
  react, 'expo-router/native-tabs': { NativeTabs }, '../../ui/useAppTheme': appearance,
  '../../context/LanguageContext': { useLanguage: () => ({ t: text => text }) },
});

for (const nextDark of [false, true, false, true]) {
  dark = nextDark;
  const tabs = TabLayout();
  const colors = appearance.useThemeColors();
  assert.equal(tabs.type, NativeTabs);
  assert.equal(tabs.props.unstable_nativeProps?.colorScheme, dark ? 'dark' : 'light',
    'The native host must follow the app setting, even when the device setting differs');
  assert.equal(tabs.props.backgroundColor, dark ? '#192820' : theme.Colors.paper);
  assert.equal(tabs.props.iconColor.default, colors.body);
  assert.equal(tabs.props.iconColor.selected, colors.green);
  assert.equal(tabs.props.labelStyle.default.color, colors.body);
  assert.equal(tabs.props.labelStyle.selected.color, colors.green);
  assert.equal(tabs.props.tintColor, colors.green);
  assert.equal(tabs.props.key, undefined, 'Switching theme must not remount tabs or discard navigation state');
  assert.deepEqual(Array.from(tabs.props.children, child => child.props.name), ['(home)', 'tracker', 'tasbeeh', 'qibla', 'settings']);
}
console.log('PASS: light/dark/light transitions update the native tab host, background, inactive/selected icons and labels without remounting the navigator.');
