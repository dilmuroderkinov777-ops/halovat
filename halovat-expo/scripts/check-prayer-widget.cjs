const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  const exports = {};
  cache.set(file, exports);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, Date, Intl, require(name) {
    if (!name.startsWith('.')) return require(name);
    return load(path.resolve(path.dirname(file), name + '.ts'));
  } });
  return exports;
}
const { CITIES, getPrayerTimes, formatTime } = load(path.resolve('src/domain/prayers.ts'));
const { createPrayerWidgetSnapshot, prayerWidgetFrame, prayerWidgetTimeline } = load(path.resolve('src/domain/prayerWidget.ts'));
const month = require('../src/data/toshkent-2026-10.json');
const months = { 'toshkent:2026-10': month };
const now = new Date(2026, 9, 30, 20, 0, 0);
const snapshot = createPrayerWidgetSnapshot(CITIES[0], months, text => text, now);
assert.equal(snapshot.prayers.length, 33 * 5);
assert.ok(snapshot.prayers.every((p, i, list) => Number.isFinite(p.at) && (i === 0 || list[i - 1].at < p.at)));
for (let dayOffset = 0; dayOffset < 31; dayOffset++) {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
  const official = getPrayerTimes(CITIES[0], day, months);
  for (const prayer of official) {
    const before = prayerWidgetFrame(snapshot.prayers, prayer.at.getTime() - 1);
    assert.equal(before.next.id, prayer.id);
    assert.equal(before.next.at, prayer.at.getTime());
    assert.equal(before.next.time, formatTime(prayer.at));
    const after = prayerWidgetFrame(snapshot.prayers, prayer.at.getTime());
    assert.equal(after.current.id, prayer.id);
    assert.equal(after.progress, 0);
    assert.ok(after.next.at > after.current.at);
  }
}
const overnight = prayerWidgetFrame(snapshot.prayers, new Date(2026, 9, 31, 0, 0).getTime());
assert.equal(overnight.current.id, 'isha'); assert.equal(overnight.next.id, 'fajr');
const entries = prayerWidgetTimeline(snapshot, now.getTime());
assert.equal(entries[0].at, now.getTime());
assert.ok(entries[0].frame.next.at > now.getTime());
assert.equal(entries.at(-1).frame, null, 'An expired schedule must show the open-app state');
assert.equal(prayerWidgetFrame([], now.getTime()), null);
assert.equal(prayerWidgetFrame(snapshot.prayers, snapshot.prayers[0].at - 1), null);
const translated = createPrayerWidgetSnapshot(CITIES[1], months, text => 'translated:' + text, now);
assert.equal(translated.city, CITIES[1].name);
assert.ok(translated.nextLabel.startsWith('translated:'));
assert.ok(translated.prayers.every(p => p.name.startsWith('translated:') && p.currentLabel.startsWith('translated:')));
assert.notEqual(translated.prayers[5].at, snapshot.prayers[5].at, 'Changing city must replace widget times');
console.log('PASS: widget/home calendar parity across 31 days, all prayer boundaries, midnight, expiry, city and language changes.');
