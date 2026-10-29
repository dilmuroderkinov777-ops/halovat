// Headless navigation/list checks. Native views are mocked; device rendering is not measured.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let hooks;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } }),
  useState: initial => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], value => { hooks.slots[index] = typeof value === 'function' ? value(hooks.slots[index]) : value; }];
  },
  useRef: initial => react.useMemo(() => ({ current: initial }), []),
  useMemo: (create, deps) => {
    const index = hooks.index++;
    const previous = hooks.slots[index];
    if (!previous || deps.some((value, position) => !Object.is(value, previous.deps[position]))) hooks.slots[index] = { deps, value: create() };
    return hooks.slots[index].value;
  },
  useCallback: (callback, deps) => react.useMemo(() => callback, deps),
  useEffect: (callback, deps) => react.useMemo(() => { hooks.effects.push(callback); }, deps),
};
const places = Array.from({ length: 64 }, (_, index) => ({
  id: 'node/' + index, name: 'Masjid ' + String(index).padStart(2, '0'),
  latitude: 41 + index / 1000, longitude: 69, distanceMeters: 100 + index * 100,
  address: index === 10 ? 'Maxsus manzil' : 'Toshkent', amenities: [],
}));
const navigations = [], selections = [], writes = [], directions = [], lookups = [];
let results = [...places].reverse(); // The screen must rank results, regardless of service order.
let lookupError;
let permissionGranted = false;
let permissionRequests = 0;
const store = {
  city: { name: 'Toshkent', latitude: 41, longitude: 69 }, data: { mosqueName: '' },
  setMosque: (...args) => {
    selections.push(args);
    [store.data.mosqueName, store.data.mosqueLatitude, store.data.mosqueLongitude] = args;
  },
};
function requireModule(name) {
  if (name === 'react') return react;
  if (name === 'react-native') return {
    ...Object.fromEntries(['ActivityIndicator', 'FlatList', 'Image', 'Pressable', 'Switch', 'TextInput', 'View'].map(type => [type, type])),
    StyleSheet: { create: value => value, absoluteFill: {} },
    Linking: { openURL: async url => directions.push(url) },
  };
  if (name === 'expo-router') return { router: { navigate: route => navigations.push(route) }, useIsFocused: () => true, useFocusEffect: callback => react.useEffect(callback, [callback]) };
  if (name === 'expo-location') return {
    getForegroundPermissionsAsync: async () => ({ granted: permissionGranted }),
    requestForegroundPermissionsAsync: async () => { permissionRequests++; return { granted: permissionGranted }; },
  };
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async () => JSON.stringify(['node/1']),
    setItem: async (key, value) => { writes.push({ key, value: JSON.parse(value) }); },
  };
  if (name === 'lucide-react-native') return Object.fromEntries(['Bookmark', 'Landmark', 'MapPin'].map(type => [type, type]));
  if (name.endsWith('/LanguageContext')) return { useLanguage: () => ({ t: text => text, language: 'uz' }) };
  if (name.endsWith('/useAppTheme')) return { useThemedStyles: styles => styles, useThemeColors: () => ({ green: '#006C49', muted: '#707974' }) };
  if (name.endsWith('/theme')) return { Typography: {} };
  if (name.endsWith('/AppText')) return { Text: 'Text' };
  if (name.endsWith('/AppContext')) return { useHalovat: () => store };
  if (name.endsWith('/services/mosques')) return {
    cachedMosques: async () => results,
    lookupNearbyMosques: async (point, force) => {
      lookups.push({ point, force });
      if (lookupError) throw new Error(lookupError);
      return { places: results, source: 'bundled', updatedAt: Date.now() };
    },
  };
  if (name.endsWith('/foregroundLocation')) return { foregroundLocation: async () => ({ coords: { latitude: 41.2, longitude: 69.2 } }) };
  for (const type of ['NativeAction', 'NativeSegments', 'NativeSheet', 'Screen', 'MosqueMap', 'QiblaCompass']) {
    if (name.endsWith('/' + type)) return { [type]: type };
  }
  throw new Error('Unexpected import: ' + name);
}
function load(file) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: requireModule, console, Error });
  return exports.default;
}
function findAll(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => findAll(child, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...findAll(node.props?.children, type)];
}
function mount(Component) {
  const state = { slots: [], effects: [], index: 0 };
  return {
    render: () => { hooks = state; state.index = 0; return Component(); },
    flush: async () => {
      for (const effect of state.effects.splice(0)) effect();
      for (let index = 0; index < 20; index++) await Promise.resolve();
    },
  };
}
const action = (node, label) => {
  const match = findAll(node, 'NativeAction').find(item => item.props.label === label);
  assert.ok(match, 'Missing action: ' + label);
  return match.props;
};

async function main() {
  const qibla = mount(load('src/app/(tabs)/qibla/index.tsx')).render();
  assert.equal(findAll(qibla, 'NativeSegments').length, 0);
  assert.equal(findAll(qibla, 'QiblaCompass').length, 1);
  assert.equal(action(qibla, 'Yaqin masjidlar').large, true);
  assert.deepEqual(Array.from(qibla.props.children, child => child.type), ['QiblaCompass', 'NativeAction']);
  assert.equal(findAll(qibla, 'NativeAction').length, 1);
  action(qibla, 'Yaqin masjidlar').onPress();
  assert.deepEqual(navigations, ['/mosque']);

  const screen = mount(load('src/app/mosque.tsx'));
  let tree = screen.render();
  assert.equal(tree.props.scroll, false, 'FlatList must not be nested in Screen’s ScrollView');
  assert.equal(findAll(findAll(tree, 'FlatList')[0].props.ListHeaderComponent, 'ActivityIndicator').length, 1);
  await screen.flush();
  const renderList = () => findAll(screen.render(), 'FlatList')[0].props;
  const map = list => findAll(list.ListHeaderComponent, 'MosqueMap')[0].props;
  let list = renderList();
  assert.equal(list.initialNumToRender, 3);
  assert.equal(list.maxToRenderPerBatch, 3);
  assert.deepEqual(Array.from(list.data, place => place.id), places.slice(0, 3).map(place => place.id), 'Start with exactly the closest three, sorted by distance');
  assert.deepEqual(Array.from(map(list).places, place => place.id), Array.from(list.data, place => place.id), 'Map must not show hidden results');
  assert.equal(list.onEndReached, undefined, 'Scrolling must not add results automatically');
  tree = [screen.render(), list.ListHeaderComponent, list.ListFooterComponent];
  for (const removed of ['TextInput', 'Switch', 'NativeSegments', 'NativeSheet', 'Image']) assert.equal(findAll(tree, removed).length, 0, removed + ' must be removed');
  assert.ok(!findAll(tree, 'NativeAction').some(node => ['Filtr', 'Masofa bo‘yicha', 'Nom bo‘yicha'].includes(node.props.label)));
  assert.equal(permissionRequests, 0, 'Opening the page must not request location permission');
  assert.equal(list.keyExtractor(places[0]), places[0].id);
  assert.ok(action(list.renderItem({ item: places[0] }), 'Tanlash'), 'The nearest result must not falsely appear as the persisted selection');
  let row = list.renderItem({ item: places[1] });
  assert.equal(findAll(row, 'Image').length, 0, 'Cards must not contain large photo placeholders');
  assert.equal(findAll(row, 'NativeAction').length, 2, 'Only select and directions remain as text actions');
  assert.ok(findAll(row, 'NativeAction').every(node => node.props.appearance === 'minimal'));
  const bookmark = node => findAll(node, 'Pressable')[0].props;
  assert.equal(bookmark(row).accessibilityState.selected, true, 'Restored bookmark must be visible');
  bookmark(row).onPress();
  list = renderList();
  row = list.renderItem({ item: places[1] });
  assert.equal(bookmark(row).accessibilityState.selected, false);
  bookmark(row).onPress();
  assert.equal(writes.at(-1).key, 'halovat:mosque-bookmarks');
  assert.deepEqual(Array.from(writes.at(-1).value), ['node/1']);
  action(row, 'Tanlash').onPress();
  list = renderList();
  assert.ok(action(list.renderItem({ item: places[1] }), 'Tanlangan'));
  action(list.renderItem({ item: places[2] }), 'Yo‘nalish').onPress();
  assert.equal(directions.at(-1), 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(`${places[2].latitude},${places[2].longitude}`));
  assert.deepEqual(selections.at(-1), [places[2].name, places[2].latitude, places[2].longitude]);
  const selectionCount = selections.length;
  map(list).onSelect(places[7].id);
  assert.equal(selections.length, selectionCount, 'Hidden markers must not select unseen results');
  map(list).onSelect(places[0].id);
  list = renderList();
  assert.equal(map(list).selectedId, places[0].id);
  assert.ok(action(list.renderItem({ item: places[0] }), 'Tanlangan'));

  while (list.data.length < places.length) {
    const previousCount = list.data.length;
    assert.equal(findAll(list.ListFooterComponent, 'NativeAction').length, 1);
    action(list.ListFooterComponent, 'Yana ko‘rsatish').onPress();
    list = renderList();
    assert.equal(list.data.length, Math.min(previousCount + 3, places.length), 'Each explicit press must add just three results');
    assert.deepEqual(Array.from(list.data, place => place.id), places.slice(0, list.data.length).map(place => place.id));
    assert.equal(map(list).places.length, list.data.length);
  }
  assert.equal(list.ListFooterComponent, undefined, 'There must be no more button once results end');

  list.onRefresh();
  assert.equal(renderList().data.length, 3, 'Refreshing must collapse back to three');
  await screen.flush();
  assert.equal(lookups.at(-1).force, true);
  assert.equal(renderList().refreshing, false);

  lookupError = 'Offline';
  renderList().onRefresh();
  await screen.flush();
  list = renderList();
  assert.equal(list.data.length, 3, 'Cached results stay usable after refresh failure');
  assert.ok(findAll(list.ListHeaderComponent, 'Text').some(node => node.props.children.includes('Offline')));
  lookupError = undefined;
  results = places.slice(0, 2);
  action(list.ListHeaderComponent, 'Qayta urinish').onPress();
  await screen.flush();
  list = renderList();
  assert.equal(list.data.length, 2);
  assert.equal(list.ListFooterComponent, undefined, 'Two results do not need pagination');

  results = [];
  list.onRefresh();
  await screen.flush();
  list = renderList();
  assert.equal(list.data.length, 0);
  assert.equal(map(list).places.length, 0);
  assert.equal(list.ListFooterComponent, undefined);
  assert.ok(findAll(list.ListHeaderComponent, 'Text').some(node => node.props.children === 'Bu joyga yaqin masjid topilmadi.'));

  action(list.ListHeaderComponent, 'GPS').onPress();
  await screen.flush();
  list = renderList();
  assert.equal(permissionRequests, 1);
  assert.ok(action(list.ListHeaderComponent, 'Ruxsat berish'));
  permissionGranted = true;
  results = places.slice(0, 5);
  action(list.ListHeaderComponent, 'Ruxsat berish').onPress();
  await screen.flush();
  list = renderList();
  assert.equal(list.data.length, 3, 'A new GPS lookup resets to the closest three');
  assert.equal(map(list).isUserLocation, true);
  assert.deepEqual({ ...map(list).center }, { latitude: 41.2, longitude: 69.2 });
  assert.equal(findAll(list.ListHeaderComponent, 'ActivityIndicator').length, 0);

  console.log('PASS: simplified mosque screen: nearest three, explicit batches of three, matching map markers, final/empty states, refresh/GPS resets, cached failure recovery, bookmarks, selection and directions; search/filter controls removed.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
