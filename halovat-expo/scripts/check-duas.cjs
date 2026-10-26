// Headless behavior checks. Native views are mocked; device rendering is not measured.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

let hooks;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.length === 1 ? children[0] : children } }),
  memo: component => component,
  useState: initial => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], value => { hooks.slots[index] = typeof value === 'function' ? value(hooks.slots[index]) : value; }];
  },
  useRef: initial => {
    const index = hooks.index++;
    if (!(index in hooks.slots)) hooks.slots[index] = { current: initial };
    return hooks.slots[index];
  },
  useMemo: (create, deps) => {
    const index = hooks.index++;
    const previous = hooks.slots[index];
    if (!previous || deps.some((value, position) => !Object.is(value, previous.deps[position]))) hooks.slots[index] = { deps, value: create() };
    return hooks.slots[index].value;
  },
  useCallback: (callback, deps) => react.useMemo(() => callback, deps),
};

function load(file, requireModule = name => { throw new Error('Unexpected import: ' + name); }) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, require: requireModule });
  return exports;
}

const catalog = load('src/data/duas.ts');
const { translate } = load('src/i18n/translations.ts');
const first = catalog.DUAS[0], second = catalog.DUAS[1];
const store = {
  data: { savedDuas: [first.title, second.title], arabicFontSize: 24 },
  toggleSavedDua: title => {
    store.data = { ...store.data, savedDuas: store.data.savedDuas.includes(title)
      ? store.data.savedDuas.filter(value => value !== title) : [...store.data.savedDuas, title] };
  },
};
function requireModule(name) {
  if (name === 'react') return react;
  if (name === 'react-native') return { FlatList: 'FlatList', View: 'View', StyleSheet: { create: value => value } };
  if (name === 'lucide-react-native') return Object.fromEntries(['Bookmark', 'GraduationCap', 'Moon', 'Sunrise'].map(value => [value, value]));
  if (name.endsWith('/useAppTheme')) return { useThemedStyles: value => value, useThemeColors: () => ({ green: '#006C49' }) };
  if (name.endsWith('/AppText')) return { Text: 'Text' };
  if (name.endsWith('/AppContext')) return { useHalovat: () => store };
  if (name.endsWith('/data/duas')) return catalog;
  for (const component of ['NativeAction', 'NativeSelect', 'NativeSegments', 'Screen']) {
    if (name.endsWith('/' + component)) return { [component]: component };
  }
  throw new Error('Unexpected import: ' + name);
}
function findAll(node, type) {
  if (Array.isArray(node)) return node.flatMap(child => findAll(child, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...findAll(node.props?.children, type)];
}
const Duas = load('src/app/duas.tsx', requireModule).default;
let screenHooks = { slots: [], index: 0 };
const render = () => {
  hooks = screenHooks;
  hooks.index = 0;
  return findAll(Duas(), 'FlatList')[0].props;
};
const collectionControl = list => findAll(list.ListHeaderComponent, 'NativeSegments')[0].props;
const categoryControl = list => findAll(list.ListHeaderComponent, 'NativeSelect')[0].props;
const emptyAction = list => findAll(list.ListEmptyComponent, 'NativeAction')[0].props;
const cardAction = (list, dua) => {
  const card = list.renderItem({ item: dua });
  return findAll(card.type(card.props), 'NativeAction')[0].props;
};

let list = render();
assert.equal(list.data.length, catalog.DUAS.length, 'All bundled duas must remain available');
const scrolls = [];
list.ref.current = { scrollToOffset: options => scrolls.push(options.offset) };
collectionControl(list).onChange('saved');
list = render();
assert.equal(list.data.length, 2, 'Existing bookmarks must be visible without saving them again');
assert.ok(list.data.every(dua => store.data.savedDuas.includes(dua.title)));
categoryControl(list).onChange(first.category);
list = render();
assert.equal(list.data.length, 1, 'Collection and category filters must apply together');
assert.equal(list.data[0].title, first.title);

categoryControl(list).onChange('Taom');
list = render();
assert.equal(list.data.length, 0);
assert.equal(emptyAction(list).label, 'Barcha kategoriyalar', 'An empty category must offer recovery within saved duas');
emptyAction(list).onPress();
list = render();
assert.equal(collectionControl(list).value, 'saved');
assert.equal(list.data.length, 2);

cardAction(list, first).onPress();
list = render();
assert.equal(list.data.length, 1, 'Unsave must immediately remove a row from the saved collection');
assert.equal(list.data[0].title, second.title);
cardAction(list, second).onPress();
list = render();
assert.equal(list.data.length, 0);
assert.equal(emptyAction(list).label, 'Barcha duolarni ko‘rish', 'Removing the last bookmark must offer access to all duas');
assert.ok(findAll(list.ListEmptyComponent, 'Text').some(node => node.props.children === 'Hali saqlangan duolar yo‘q'));
emptyAction(list).onPress();
list = render();
assert.equal(list.data.length, catalog.DUAS.length);
assert.equal(collectionControl(list).value, 'all');
assert.equal(cardAction(list, first).label, 'Saqlash');
cardAction(list, first).onPress();
list = render();
assert.equal(cardAction(list, first).label, 'Saqlangan');
assert.equal(cardAction(list, first).variant, 'filled');
collectionControl(list).onChange('saved');
assert.equal(render().data.length, 1);

// Simulate restored app data and a new screen mount, preserving existing title-based identifiers.
store.data = JSON.parse(JSON.stringify(store.data));
screenHooks = { slots: [], index: 0 };
list = render();
collectionControl(list).onChange('saved');
list = render();
assert.equal(list.data.length, 1);
assert.equal(list.data[0].title, first.title);
store.data = { ...store.data, savedDuas: ['Unavailable legacy dua'] };
list = render();
assert.equal(list.data.length, 0);
assert.equal(emptyAction(list).label, 'Barcha duolarni ko‘rish', 'Unknown legacy identifiers must not trap the empty state');
assert.ok(scrolls.length >= 5 && scrolls.every(offset => offset === 0), 'Changing filters must reset the list position');

for (const text of [
  'Barcha duolar', 'Saqlanganlar', 'Hali saqlangan duolar yo‘q', 'Bu kategoriyada duo topilmadi', 'Barcha kategoriyalar',
  'Kerakli duodagi «Saqlash» tugmasini bosing. U shu ro‘yxatda ko‘rinadi.',
  'Boshqa kategoriya tanlang yoki barcha kategoriyalarni ko‘ring.',
  'Duoni ro‘yxatdan chiqarish uchun «Saqlangan» tugmasini qayta bosing.',
]) {
  assert.equal(translate(text, 'uz'), text);
  for (const language of ['uz-Cyrl', 'ru', 'en']) assert.notEqual(translate(text, language), text, language + ' translation missing: ' + text);
}
console.log('PASS: mocked dua component behavior — existing/restored bookmarks, collection/category filters, add/remove and last-item removal, empty-state recovery, scroll reset and four-language copy.');
