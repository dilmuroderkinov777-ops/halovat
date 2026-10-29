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
const navigations = [], selections = [], writes = [];
let photoCalls = 0;
const store = { city: { latitude: 41, longitude: 69 }, data: { mosqueName: '' }, setMosque: (...args) => selections.push(args) };
function requireModule(name) {
  if (name === 'react') return react;
  if (name === 'react-native') return {
    ...Object.fromEntries(['ActivityIndicator', 'FlatList', 'Image', 'Pressable', 'Switch', 'TextInput', 'View'].map(type => [type, type])),
    StyleSheet: { create: value => value, absoluteFill: {} }, Keyboard: { dismiss() {} },
    Linking: { openURL: async () => {} }, Share: { share: async () => {} },
  };
  if (name === 'expo-router') return { router: { navigate: route => navigations.push(route) }, useIsFocused: () => true, useFocusEffect: callback => react.useEffect(callback, [callback]) };
  if (name === 'expo-location') return { getForegroundPermissionsAsync: async () => ({ granted: false }) };
  if (name === '@react-native-async-storage/async-storage') return {
    getItem: async () => JSON.stringify(['node/1']),
    setItem: async (key, value) => { writes.push({ key, value: JSON.parse(value) }); },
  };
  if (name === 'lucide-react-native') return Object.fromEntries(['Check', 'ChevronRight', 'Landmark', 'LocateFixed', 'MapPin', 'Navigation', 'Search'].map(type => [type, type]));
  if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
  if (name.endsWith('/LanguageContext')) return { useLanguage: () => ({ t: text => text, language: 'uz' }) };
  if (name.endsWith('/useAppTheme')) return { useThemedStyles: styles => styles, useThemeColors: () => ({ green: '#006C49', muted: '#707974' }) };
  if (name.endsWith('/theme')) return { Typography: {} };
  if (name.endsWith('/AppText')) return { Text: 'Text' };
  if (name.endsWith('/AppContext')) return { useHalovat: () => store };
  if (name.endsWith('/services/mosques')) return {
    cachedMosques: async () => places,
    lookupNearbyMosques: async () => ({ places, source: 'bundled', updatedAt: Date.now() }),
  };
  if (name.endsWith('/foregroundLocation')) return {};
  if (name.endsWith('/mosquePhotos')) return { mosquePhoto: () => { photoCalls++; return undefined; }, mosquePhotoCredit: () => undefined };
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
  vm.runInNewContext(output, { exports, require: requireModule, console });
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
  await screen.flush();
  const renderList = () => findAll(screen.render(), 'FlatList')[0].props;
  let list = renderList();
  assert.equal(list.data.length, 8);
  assert.equal(list.initialNumToRender, 2);
  assert.equal(list.maxToRenderPerBatch, 2);
  assert.equal(photoCalls, 0, 'Building the screen/header must not eagerly build mosque cards');
  assert.equal(findAll(list.ListHeaderComponent, 'MosqueMap')[0].props.places.length, 35);
  assert.equal(list.keyExtractor(places[0]), places[0].id);
  let row = list.renderItem({ item: places[1] });
  assert.equal(photoCalls, 1, 'Card work must happen through the virtual list renderer');
  action(row, 'Saqlangan').onPress();
  list = renderList();
  row = list.renderItem({ item: places[1] });
  action(row, 'Saqlash').onPress();
  assert.equal(writes.at(-1).key, 'halovat:mosque-bookmarks');
  assert.deepEqual(Array.from(writes.at(-1).value), ['node/1']);
  list = renderList();
  action(list.ListFooterComponent, 'Yana ko‘rsatish').onPress();
  assert.equal(renderList().data.length, 16);

  const search = () => findAll(renderList().ListHeaderComponent, 'TextInput')[0].props;
  search().onChangeText('Maxsus manzil');
  list = renderList();
  assert.equal(list.data.length, 1, 'Search must still match addresses');
  assert.equal(list.data[0].id, places[10].id);
  search().onChangeText('');
  list = renderList();
  assert.equal(list.data.length, 8, 'Search must reset pagination');
  findAll(list.ListHeaderComponent, 'MosqueMap')[0].props.onSelect(places[7].id);
  assert.deepEqual(selections.at(-1), [places[7].name, places[7].latitude, places[7].longitude]);
  list = renderList();
  assert.equal(findAll(list.ListHeaderComponent, 'MosqueMap')[0].props.selectedId, places[7].id);
  assert.ok(action(list.renderItem({ item: places[7] }), 'Tanlangan'));

  tree = screen.render();
  findAll(tree, 'Switch')[0].props.onValueChange(true);
  list = renderList();
  assert.equal(list.data.length, 1, 'Saved-only filtering must survive list virtualization');
  action(list.renderItem({ item: places[1] }), 'Saqlangan').onPress();
  assert.equal(renderList().data.length, 0);
  tree = screen.render();
  action(findAll(tree, 'NativeSheet')[0], 'Tozalash').onPress();
  assert.equal(renderList().data.length, 8);
  search().onChangeText('missing mosque');
  list = renderList();
  assert.equal(list.data.length, 0);
  assert.ok(findAll(list.ListHeaderComponent, 'Text').some(node => node.props.children === 'Bu mezonlarga mos masjid topilmadi.'));
  console.log('PASS: mocked Qibla native-button navigation and mosque lazy rows, stable keys, pagination/search, restored bookmarks, selection/map markers, filters and empty results.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
