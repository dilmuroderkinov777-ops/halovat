const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(path, resolver) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: resolver, Date });
  return exports;
}
const prayers = load('src/domain/prayers.ts', require);
const sharedThemes = load('src/data/prayerHeroThemes.ts', require);
const themes = load('src/data/prayerHero.ts', name => name.endsWith('/prayerHeroThemes') ? sharedThemes : name).PRAYER_HERO;
const react = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  useMemo: callback => callback(),
  useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}],
};
let now;
let refreshed = 0;
const navigated = [];
const schedule = [[5, 30], [12, 15], [15, 40], [17, 25], [18, 40]];
function timesFor(day) {
  return prayers.PRAYERS.map((prayer, index) => ({ ...prayer,
    at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), ...schedule[index]),
  }));
}
function resolver(name) {
  if (name === 'react') return react;
  if (name === 'react-native') return { Image: 'Image', View: 'View', Pressable: 'Pressable', Share: {}, Platform: { OS: 'ios' }, StyleSheet: { create: x => x } };
  if (name === 'expo-linear-gradient') return { LinearGradient: 'LinearGradient' };
  if (name === 'expo-router') return { router: { navigate: path => navigated.push(path) }, useIsFocused: () => true };
  if (name === 'lucide-react-native') return Object.fromEntries(['ArrowUpRight', 'CalendarDays', 'Clock3'].map(x => [x, x]));
  if (name.endsWith('/useAppTheme')) return { useThemedStyles: x => x, useThemeColors: () => ({}) };
  if (name.endsWith('/theme')) return { Colors: {}, Typography: {} };
  if (name.endsWith('/AppText')) return { Text: 'Text' };
  if (name.endsWith('/LanguageContext')) return { useLanguage: () => ({ t: x => x }) };
  if (name.endsWith('/LaunchAnimationContext')) return { useAppLoading: () => false };
  if (name.endsWith('/AppContext')) return { useHalovat: () => ({ hydrated: true, onboardingComplete: true, data: { prayerStatus: {}, reminderEnabled: false, reminderMinutes: 20 }, timesFor }) };
  if (name.endsWith('/useForegroundClock')) return { useForegroundClock: () => ({ now, refresh: () => refreshed++ }) };
  if (name.endsWith('/data/prayerHero')) return { PRAYER_HERO: themes };
  if (name.endsWith('/domain/prayers')) return prayers;
  if (name.endsWith('.png')) return name;
  for (const component of ['NativeAction', 'PrayerCheckinSheet', 'PrayerTimeCard', 'NativeCountdown', 'Screen']) {
    if (name.endsWith('/' + component)) return { [component]: component };
  }
  throw new Error('Unexpected import: ' + name);
}
function find(node, type) {
  if (Array.isArray(node)) return node.flatMap(x => find(x, type));
  if (!node || typeof node !== 'object') return [];
  return [...(node.type === type ? [node] : []), ...find(node.props?.children, type)];
}
const Home = load('src/app/(tabs)/(home)/index.tsx', resolver).default;
function render(day, hour, minute, second = 0) {
  now = new Date(2026, 9, day, hour, minute, second);
  const content = Home();
  return content.type(content.props);
}
function check(day, hour, minute, second, id, nextDay, nextIndex) {
  const tree = render(day, hour, minute, second);
  const hero = find(tree, 'LinearGradient')[0];
  assert.equal(hero.props.colors, themes[id].colors);
  assert.equal(find(hero, 'Image')[0].props.source, themes[id].image);
  const countdown = find(hero, 'NativeCountdown')[0];
  assert.equal(countdown.props.labelColor, themes[id].accent);
  assert.equal(countdown.props.until, timesFor(new Date(2026, 9, nextDay))[nextIndex].at.getTime());
  countdown.props.onComplete();
}
// Boundaries use local prayer schedules, including before dawn and midnight.
check(29, 5, 29, 59, 'isha', 29, 0);
for (let index = 0; index < schedule.length; index++) {
  const [hour, minute] = schedule[index];
  check(29, hour, minute, 0, prayers.PRAYERS[index].id, index === 4 ? 30 : 29, (index + 1) % 5);
}
check(30, 0, 0, 0, 'isha', 30, 0);
check(30, 6, 0, 0, 'fajr', 30, 1);
assert.equal(refreshed, 8);
const cards = find(render(29, 12, 30), 'Pressable');
assert.deepEqual(cards.map(x => x.props.accessibilityLabel), ['Duolar', 'Masjidlar', 'Namozlar', 'Tasbeh']);
for (const card of cards) {
  assert.equal(card.props.accessibilityRole, 'button');
  const art = find(card, 'Image')[0].props;
  assert.equal(art.resizeMode, 'contain');
  assert.ok(fs.existsSync('src/app/(tabs)/(home)/' + art.source));
  card.props.onPress();
}
assert.deepEqual(navigated, ['/duas', '/(tabs)/(home)/mosque', '/(tabs)/tracker', '/(tabs)/tasbeeh']);
assert.equal(new Set(Object.values(themes).map(x => x.colors.join(','))).size, 5);
for (const id of Object.keys(themes)) assert.ok(fs.existsSync('assets/prayer-hero/' + id + '.png'));
console.log('PASS: five current-prayer themes, exact prayer boundaries, midnight/foreground refresh, next-prayer countdown and destination navigation.');
