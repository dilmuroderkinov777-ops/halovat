// Run after Expo's build-layout-registry.mjs and build-bundle.mjs. Exercise the
// exact isolated widget runtime: an app render cannot catch missing globals here.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const registryFile = process.argv[2] ?? '.expo/PrayerWidgetLayoutRegistry.json';
const runtimeFile = process.argv[3] ?? '.expo/PrayerWidgetRuntime.bundle';
const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8')).widgets.HalovatPrayerCountdown;
assert.ok(registry?.layout, 'Build the iOS widget layout registry first');
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(runtimeFile, 'utf8'), context);
context.__expoWidgetLayout = vm.runInContext('(' + registry.layout + ')', context);
const nativeRenderer = fs.readFileSync('node_modules/expo-widgets/ios/Widgets/ViewRenderer.swift', 'utf8');
const supportedTypes = new Set([...nativeRenderer.matchAll(/case "([^"]+)":/g)].map(match => match[1]));

function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!node || typeof node !== 'object') return [];
  assert.ok(supportedTypes.has(node.type), 'Unsupported native widget view: ' + node.type);
  return [node, ...nodes(node.props.children)];
}
const startsAt = new Date('2026-10-30T13:00:00+05:00').getTime();
const endsAt = startsAt + 3_600_000;
for (const id of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']) {
  const imageUri = `file:///shared/prayer-hero/${id}.png`;
  const props = { ...registry.initialProps, startsAt, endsAt, imageUri, city: 'Toshkent', nextName: id, currentLabel: id + ' vaqti', until: '14:00 gacha' };
  const tree = context.__expoWidgetRender(props, { timestamp: startsAt + 1, widgetFamily: 'systemMedium', colorScheme: 'dark' });
  const all = nodes(tree);
  const timer = all.find(node => node.type === 'TextView' && node.props.timerInterval);
  assert.ok(timer, 'The countdown must be a native timer, not a JS-formatted snapshot');
  assert.equal(timer.props.timerInterval.lower, startsAt);
  assert.equal(timer.props.timerInterval.upper, endsAt);
  assert.equal(timer.props.countsDown, true);
  const progress = all.find(node => node.type === 'ProgressView');
  assert.equal(progress.props.timerInterval.upper, endsAt);
  assert.equal(progress.props.countsDown, false);
  assert.ok(all.some(node => node.type === 'ImageView' && node.props.uiImage === imageUri));
  assert.ok(all.some(node => node.type === 'TextView' && node.props.text === id));
  assert.ok(tree.props.modifiers.some(modifier => modifier.$type === 'widgetURL' && modifier.url === 'halovat-expo:///'));
}
const empty = nodes(context.__expoWidgetRender(registry.initialProps, { widgetFamily: 'systemMedium' }));
assert.ok(!empty.some(node => node.props.timerInterval), 'An expired schedule must not keep a zero countdown');
assert.ok(empty.some(node => node.props.text === registry.initialProps.openLabel));
console.log('PASS: iOS isolated widget runtime, supported native views, live timer/progress, shared artwork, home link and expiry.');
