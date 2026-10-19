const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies) {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const box = { exports: {}, Date, setTimeout, clearTimeout, AbortController, require: name => {
    if (name in dependencies) return dependencies[name]; throw new Error('Unexpected import: ' + name);
  } };
  vm.runInNewContext(output, box); return box.exports;
}
const prayers = load('src/domain/prayers.ts', { adhan: require('adhan') });
const stored = new Map();
const installed = new Map();
let scheduled = 0, cancelled = 0, fail = false, registrationFails = false, granted = true, windows = [], task;
const notifications = {
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily' },
  getPermissionsAsync: async () => ({ granted }),
  getAllScheduledNotificationsAsync: async () => [...installed.values()],
  scheduleNotificationAsync: async item => { if (fail) throw Error('Storage failed'); scheduled++; installed.set(item.identifier, item); },
  cancelScheduledNotificationAsync: async id => { cancelled++; installed.delete(id); },
};
const scheduler = load('src/services/prayerScheduler.ts', {
  '@react-native-async-storage/async-storage': { __esModule: true, default: { getItem: async key => stored.get(key) ?? null, setItem: async (key, value) => stored.set(key, value) } },
  'react-native': { Platform: { OS: 'android' } },
  'expo-background-task': { BackgroundTaskResult: { Success: 1, Failed: 2 }, registerTaskAsync: async () => { if (registrationFails) throw Error('WorkManager unavailable'); }, unregisterTaskAsync: async () => {} },
  'expo-task-manager': { defineTask: (name, callback) => { task = callback; }, isTaskRegisteredAsync: async () => false },
  'expo-notifications': notifications, '../domain/prayers': prayers,
  './focusControl': { focusControl: { setPrayerQuietWindows: json => { windows = JSON.parse(json); }, getStatus: () => ({ exactAlarmAccess: true }) } },
  './reminders': { CHECKIN_CHANNEL: 'checkin', REMINDER_CHANNEL: 'time', notificationsAllowed: p => p.granted,
    prepareReminderChannels: async () => {}, reminderAlertContent: value => value,
    isPrayerReminder: value => value.content.data?.halovatTimeReminder || value.content.data?.halovatPrayerCheckin || value.content.data?.halovatDuaReminder },
});
const now = new Date(2026, 9, 17, 0, 0);
const snapshot = { city: prayers.CITIES[0], months: {}, labels: {}, data: {
  prayerAutoQuiet: true, prayerTimeReminderEnabled: true, reminderEnabled: true, duaReminderEnabled: false, reminderMinutes: 15, prayerStatus: {},
} };
async function main() {
  assert.equal(typeof task, 'function', 'Headless task must be registered at module scope');
  const plan = scheduler.plannedReminders(snapshot, now);
  assert.equal(plan.length, 300); assert.equal(new Set(plan.map(item => item.identifier)).size, plan.length);
  const firstTime = plan.find(item => item.identifier.startsWith('halovat-v2-time'));
  const firstCheck = plan.find(item => item.identifier.startsWith('halovat-v2-checkin'));
  assert.equal(firstCheck.at - firstTime.at, 26 * 60000, 'Check-in must follow quiet mode');
  const early = scheduler.quietWindows(snapshot, now);
  const later = scheduler.quietWindows(snapshot, new Date(2026, 10, 25));
  assert.equal(later.length, 150); assert.ok(later[0].start > early.at(-1).end, 'Renewed windows must extend beyond the old 30-day horizon');
  assert.equal(early[0].start - firstTime.at, 10000);
  await scheduler.applyPrayerSchedule(snapshot, now);
  assert.equal(scheduled, 300); assert.equal(windows.length, 150);
  await scheduler.applyPrayerSchedule(snapshot, now);
  assert.equal(scheduled, 300, 'Unchanged alarms must not be rewritten on every foreground');
  installed.set('halovat-v2-time:old', { identifier: 'halovat-v2-time:old', content: { data: { halovatTimeReminder: true } } });
  fail = true;
  await assert.rejects(scheduler.applyPrayerSchedule({ ...snapshot, labels: { 'Bomdod vaqti kirdi': 'Changed title' } }, now), /Storage failed/);
  assert.equal(cancelled, 0, 'Failed replacements must retain the old schedule');
  fail = false; granted = false; windows = [];
  await assert.rejects(scheduler.applyPrayerSchedule(snapshot, now), /ruxsati/);
  assert.equal(windows.length, 150, 'Notification denial must not disable DND scheduling');
  granted = true;
  await scheduler.applyPrayerSchedule({ ...snapshot, data: { ...snapshot.data, prayerAutoQuiet: false, prayerTimeReminderEnabled: false, reminderEnabled: false } }, now);
  assert.equal(windows.length, 0); assert.equal(installed.size, 0);
  registrationFails = true;
  const result = await scheduler.updatePrayerSchedule(snapshot);
  assert.equal(windows.length, 150, 'Background registration failure must not block quiet windows');
  assert.ok(installed.size > 0, 'Background registration failure must not block reminders');
  assert.match(result.error, /Fon yangilanishi/);
  console.log('PASS: rolling 30-day schedule, quiet lead-in, check-in timing, stable alarm reuse, atomic replacement, notification denial and disabling.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
