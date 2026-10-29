// Exercise the app's tab listener with Expo's actual routers. Native rendering is mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const vm = require('node:vm');
const ts = require('typescript');
const { StackRouter } = require('expo-router/build/react-navigation/routers/StackRouter');
const { TabRouter } = require('expo-router/build/react-navigation/routers/TabRouter');
const { extendRouterActions } = require('expo-router/build/react-navigation/routers/extendRouter');
const { RouterActionHandling } = require('expo-router/build/react-navigation/routers/types');

// Avoid loading the native UI barrel while retaining the native-tab reducer itself.
const nativeRouterFile = require.resolve('expo-router/build/native-tabs/NativeBottomTabsRouter');
const nativeRequire = createRequire(nativeRouterFile);
const nativeExports = {};
vm.runInNewContext(fs.readFileSync(nativeRouterFile, 'utf8'), {
  exports: nativeExports, process, console,
  require: name => name === '../react-navigation/native'
    ? { TabRouter, extendRouterActions, RouterActionHandling } : nativeRequire(name),
});

const NativeTabs = { Trigger: { Icon: 'Icon', Label: 'Label' } };
const dependencies = {
  react: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
  'expo-router/native-tabs': { NativeTabs },
  '../../context/LanguageContext': { useLanguage: () => ({ t: value => value }) },
  '../../ui/useAppTheme': { useAppTheme: () => ({ dark: false }), useThemeColors: () => ({}) },
};
const layoutExports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/app/(tabs)/_layout.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
}).outputText, { exports: layoutExports, require: name => {
  assert.ok(name in dependencies, 'Unexpected dependency: ' + name);
  return dependencies[name];
} });
const triggers = layoutExports.default().props.children;
const homeTrigger = triggers.find(node => node.props.name === '(home)').props;
const tabNames = triggers.map(node => node.props.name);
const stackRouter = StackRouter({ initialRouteName: 'index' });
const tabRouter = nativeExports.NativeBottomTabsRouter({ initialRouteName: '(home)', backBehavior: 'history' });
const stack = name => ({
  type: 'stack', key: name + '-stack', routeKeySeq: 1, stale: false, index: 0,
  routeNames: ['index', 'mosque'], routes: [{ key: name + '-index', name: 'index' }],
});
const reduce = (router, state, action) => {
  const result = router.getStateForAction(state, action, { routeNames: state.routeNames, routeGetIdList: {} });
  assert.ok(result?.state, 'Router did not handle ' + action.type);
  return result.state;
};
const fixtures = () => ({
  type: 'tab', key: 'tabs', routeKeySeq: 5, stale: false, index: 0, routeNames: tabNames,
  history: [{ type: 'route', key: '(home)-tab' }],
  routes: tabNames.map(name => ({ key: name + '-tab', name, state: stack(name) })),
});
const pushMosque = state => reduce(stackRouter, state, { type: 'PUSH', payload: { name: 'mosque' } });
const switchTab = (state, name) => reduce(tabRouter, state, { type: 'NAVIGATE', payload: { name } });

// First reproduce the report without a listener: native tabs retain the nested stack.
let original = fixtures();
original.routes[0].state = pushMosque(original.routes[0].state);
original = switchTab(switchTab(original, 'settings'), '(home)');
assert.equal(original.routes[0].state.routes.at(-1).name, 'mosque');

assert.equal(typeof homeTrigger.listeners, 'function', 'Home must dismiss its nested page when switching tabs');
for (const destination of tabNames.filter(name => name !== '(home)')) {
  let tabs = fixtures();
  const homeRoute = tabs.routes[0];
  const homeIndex = homeRoute.state.routes[0];
  const calls = [];
  const navigation = {
    getState: () => tabs,
    dispatch: action => {
      calls.push(action);
      assert.equal(action.target, tabs.routes[0].state.key, 'Only the Home stack may be popped');
      assert.equal(stackRouter.shouldActionChangeFocus(action), false, 'The reset must not steal focus from the destination tab');
      const nextHome = reduce(stackRouter, tabs.routes[0].state, { source: homeRoute.key, ...action });
      tabs = { ...tabs, routes: tabs.routes.map(route => route.key === homeRoute.key ? { ...route, state: nextHome } : route) };
    },
  };
  const listeners = homeTrigger.listeners({ navigation, route: homeRoute });
  // Opening a page inside Home (or covering the tabs with a modal) must not pop it.
  tabs = { ...tabs, routes: tabs.routes.map(route => route.key === homeRoute.key ? { ...route, state: pushMosque(route.state) } : route) };
  listeners.blur();
  assert.equal(calls.length, 0);
  assert.equal(tabs.routes[0].state.routes.at(-1).name, 'mosque');

  tabs = switchTab(tabs, destination);
  const otherRoutes = tabs.routes.slice(1);
  listeners.blur();
  assert.equal(calls.length, 1, 'Switching away must dismiss Masjidlar before Home is revisited');
  assert.equal(tabs.routes[tabs.index].name, destination);
  assert.strictEqual(tabs.routes[0].state.routes[0], homeIndex, 'Home must retain its mounted root route');
  assert.deepEqual(tabs.routes.slice(1), otherRoutes, 'Other tabs must retain their state');
  listeners.blur();
  assert.equal(calls.length, 1, 'A root-only Home stack must not dispatch again');

  tabs = switchTab(tabs, '(home)');
  assert.equal(tabs.routes[0].state.index, 0);
  assert.deepEqual(tabs.routes[0].state.routes.map(route => route.name), ['index']);
  tabs.routes[0].state = pushMosque(tabs.routes[0].state);
  assert.equal(tabs.routes[0].state.routes.at(-1).name, 'mosque', 'The Home card must still open Masjidlar after returning');
}
console.log('PASS: reproduced retained mosque state; Home → Masjidlar → each other tab → Home returns to index, preserving the root route, other tabs and in-tab navigation.');
