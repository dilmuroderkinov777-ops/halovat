import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { type City, type CalendarMonth, type PrayerStatus, PRAYERS, dateKey, getPrayerTimes, fetchCalendarMonth } from '../domain/prayers';
import { focusControl } from './focusControl';
import { CHECKIN_CHANNEL, REMINDER_CHANNEL, isPrayerReminder, notificationsAllowed, prepareReminderChannels, reminderAlertContent } from './reminders';

const SNAPSHOT = 'halovat.schedule.v2';
const DIAGNOSTICS = 'halovat.schedule.diagnostics.v2';
const TASK = 'halovat-renew-prayer-schedule-v2';
export type ScheduleData = {
  prayerAutoQuiet: boolean; prayerTimeReminderEnabled: boolean; reminderEnabled: boolean;
  duaReminderEnabled: boolean; reminderMinutes: number; prayerStatus: Record<string, PrayerStatus>;
};
export type ScheduleSnapshot = {
  data: ScheduleData; city: City; months: Record<string, CalendarMonth>;
  labels: Record<string, string>;
};
export function scheduleLabels(t: (text: string) => string) {
  const values = ['Namoz vaqti haqida sokin eslatma.', 'Bugungi ibodatingizni belgilab qo‘ying.', 'Tonggi zikr va duolar', 'Kechki zikr va duolar', 'Bir necha daqiqani zikr va duoga ajrating.', 'Yopish', 'Vibratsiya · {seconds} soniya', 'Vibratsiya tugadi',
    ...PRAYERS.flatMap(prayer => [`${prayer.name} vaqti kirdi`, `${prayer.name} namozini o‘qidingizmi?`])];
  return Object.fromEntries(values.map(value => [value, t(value)]));
}

export function quietWindows(snapshot: ScheduleSnapshot, now = new Date()) {
  if (!snapshot.data.prayerAutoQuiet) return [];
  return Array.from({ length: 30 }, (_, offset) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    return getPrayerTimes(snapshot.city, day, snapshot.months).map(prayer => ({
      start: prayer.at.getTime() + (snapshot.data.prayerTimeReminderEnabled ? 10_000 : 0),
      end: prayer.at.getTime() + 25 * 60_000,
      leadInMs: snapshot.data.prayerTimeReminderEnabled ? 10_000 : 0,
    }));
  }).flat();
}

type PlannedReminder = { identifier: string; content: Notifications.NotificationContentInput; trigger: Notifications.NotificationTriggerInput; at?: number };
export function plannedReminders(snapshot: ScheduleSnapshot, now = new Date()): PlannedReminder[] {
  const { data, city, months, labels } = snapshot;
  const t = (value: string) => labels[value] ?? value;
  const result: PlannedReminder[] = [];
  const add = (item: PlannedReminder) => {
    const content = reminderAlertContent({ ...item.content, data: { ...item.content.data,
      halovatPopupClose: t('Yopish'), halovatPopupVibration: t('Vibratsiya · {seconds} soniya').replace(/\{[^}]+\}/, '{seconds}'), halovatPopupFinished: t('Vibratsiya tugadi') } });
    const signature = JSON.stringify([content, item.at ?? item.trigger]);
    result.push({ ...item, content: { ...content, data: { ...content.data, halovatPlanSignature: signature } } });
  };
  if (data.prayerTimeReminderEnabled || data.reminderEnabled) {
    for (let offset = 0; offset < (Platform.OS === 'android' ? 30 : 7); offset++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      for (const prayer of getPrayerTimes(city, day, months)) {
        if (data.prayerTimeReminderEnabled && prayer.at.getTime() > now.getTime() + 10_000) add({
          identifier: `halovat-v2-time:${dateKey(day)}:${prayer.id}`,
          content: { title: t(`${prayer.name} vaqti kirdi`), body: t('Namoz vaqti haqida sokin eslatma.'), data: { halovatTimeReminder: true } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayer.at, channelId: REMINDER_CHANNEL }, at: prayer.at.getTime(),
        });
        const at = prayer.at.getTime() + Math.max(data.reminderMinutes, data.prayerAutoQuiet ? 26 : 0) * 60_000;
        if (data.reminderEnabled && offset < (Platform.OS === 'android' ? 30 : 3) && at > now.getTime() + 10_000 && !data.prayerStatus[`${dateKey(day)}:${prayer.id}`]) add({
          identifier: `halovat-v2-checkin:${dateKey(day)}:${prayer.id}`,
          content: { title: t(`${prayer.name} namozini o‘qidingizmi?`), body: t('Bugungi ibodatingizni belgilab qo‘ying.'), categoryIdentifier: 'prayer-checkin', data: { halovatPrayerCheckin: true, prayer: prayer.id, date: dateKey(day) } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(at), channelId: CHECKIN_CHANNEL }, at,
        });
      }
    }
  }
  if (data.duaReminderEnabled) for (const [hour, title] of [[7, 'Tonggi zikr va duolar'], [19, 'Kechki zikr va duolar']] as const) add({
    identifier: `halovat-v2-dua:${hour}`, content: { title: t(title), body: t('Bir necha daqiqani zikr va duoga ajrating.'), data: { halovatDuaReminder: true } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: hour === 7 ? 0 : 30, channelId: REMINDER_CHANNEL },
  });
  return result;
}

let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.catch(() => undefined).then(action); queue = next; return next;
}
export async function applyPrayerSchedule(snapshot: ScheduleSnapshot, now = new Date()) {
  // DND scheduling does not depend on notification permission.
  focusControl?.setPrayerQuietWindows(JSON.stringify(quietWindows(snapshot, now)));
  const plan = plannedReminders(snapshot, now);
  const allowed = notificationsAllowed(await Notifications.getPermissionsAsync());
  if (plan.length && !allowed) throw new Error('Bildirishnoma ruxsati berilmagan.');
  await prepareReminderChannels();
  const installed = await Notifications.getAllScheduledNotificationsAsync();
  const existing = new Map(installed.map(item => [item.identifier, item]));
  for (const item of plan) {
    if (existing.get(item.identifier)?.content.data?.halovatPlanSignature === item.content.data?.halovatPlanSignature) continue;
    await Notifications.scheduleNotificationAsync({ identifier: item.identifier, content: item.content, trigger: item.trigger });
  }
  // Only remove old entries once every replacement has succeeded.
  const desired = new Set(plan.map(item => item.identifier));
  for (const item of installed) if (isPrayerReminder(item) && !desired.has(item.identifier)) await Notifications.cancelScheduledNotificationAsync(item.identifier);
  const nextAt = plan.reduce<number | null>((min, item) => item.at === undefined ? min : Math.min(min ?? Infinity, item.at), null);
  const exact = Platform.OS !== 'android' || focusControl?.getStatus().exactAlarmAccess;
  const error = (plan.length || snapshot.data.prayerAutoQuiet) && !exact ? 'Aniq vaqt ruxsati yo‘q. Eslatmalar kechikishi mumkin.' : null;
  await AsyncStorage.setItem(DIAGNOSTICS, JSON.stringify({ updatedAt: Date.now(), through: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 29).toISOString(), error }));
  return { count: plan.length, nextAt, busy: false, error };
}

export function updatePrayerSchedule(snapshot: ScheduleSnapshot) {
  return serialize(async () => {
    await AsyncStorage.setItem(SNAPSHOT, JSON.stringify(snapshot));
    let backgroundError: string | null = null;
    try { if (Platform.OS === 'android') {
      const enabled = snapshot.data.prayerAutoQuiet || snapshot.data.prayerTimeReminderEnabled || snapshot.data.reminderEnabled || snapshot.data.duaReminderEnabled;
      const registered = await TaskManager.isTaskRegisteredAsync(TASK);
      if (enabled && !registered) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 12 * 60 });
      else if (!enabled && registered) await BackgroundTask.unregisterTaskAsync(TASK);
    } } catch {
      backgroundError = 'Fon yangilanishi sozlanmadi. Jadvalni yangilash uchun ilovani ochib turing.';
    }
    // A WorkManager registration failure must not prevent the current 30-day
    // alarms and quiet windows from being installed.
    const result = await applyPrayerSchedule(snapshot);
    if (backgroundError) {
      const raw = await AsyncStorage.getItem(DIAGNOSTICS);
      await AsyncStorage.setItem(DIAGNOSTICS, JSON.stringify({ ...(raw ? JSON.parse(raw) : {}), backgroundError }));
      return { ...result, error: [result.error, backgroundError].filter(Boolean).join(' ') };
    }
    return result;
  });
}

export function renewPrayerSchedule() {
  return serialize(async () => {
    const raw = await AsyncStorage.getItem(SNAPSHOT);
    if (!raw) return;
    const snapshot = JSON.parse(raw) as ScheduleSnapshot;
    const now = new Date();
    // Offline Adhan calculations remain available if a calendar request fails.
    for (const offset of [0, 1]) {
      const month = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      try {
        const calendar = await fetchCalendarMonth(snapshot.city, month.getFullYear(), month.getMonth() + 1);
        const key = `${snapshot.city.id}:${calendar.year}-${String(calendar.month).padStart(2, '0')}`;
        snapshot.months[key] = calendar;
        await AsyncStorage.setItem(`halovat.expo.calendar.v1:${key}`, JSON.stringify(calendar));
      } catch { /* Retain cached months and the local calculation fallback. */ }
    }
    await AsyncStorage.setItem(SNAPSHOT, JSON.stringify(snapshot));
    return applyPrayerSchedule(snapshot, now);
  });
}

export async function scheduleDiagnostics() {
  const raw = await AsyncStorage.getItem(DIAGNOSTICS);
  return { ...(raw ? JSON.parse(raw) : {}), backgroundRegistered: Platform.OS === 'android' && await TaskManager.isTaskRegisteredAsync(TASK) };
}

if (Platform.OS === 'android') TaskManager.defineTask(TASK, async () => {
  try { await renewPrayerSchedule(); return BackgroundTask.BackgroundTaskResult.Success; }
  catch (error) {
    await AsyncStorage.setItem(DIAGNOSTICS, JSON.stringify({ failedAt: Date.now(), error: error instanceof Error ? error.message : String(error) })).catch(() => undefined);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});
