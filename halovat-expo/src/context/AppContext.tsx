import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Platform, Vibration } from 'react-native';
import { CalendarMonth, CITIES, City, dateKey, fetchCalendarMonth, getPrayerTimes, nearestCity, PrayerId, PrayerStatus, prayerKey } from '../domain/prayers';
import tashkentOctober2026 from '../data/toshkent-2026-10.json';
import { ROUND_TARGET, ZIKR } from '../data/zikr';
import { focusControl } from '../services/focusControl';
import { ensureAutomaticQuietAccess } from '../services/automaticQuiet';
import { useLanguage } from './LanguageContext';
import { CHECKIN_CHANNEL, REMINDER_CHANNEL, ensureReminderAlarmAccess, ensureReminderFlashAccess, ensureReminderPopupAccess, isPrayerReminder, prepareReminderChannels, type ReminderPlan } from '../services/reminders';

const STORAGE_KEY = 'halovat.expo.state.v1';
const CALENDAR_PREFIX = 'halovat.expo.calendar.v1:';
const ONBOARDING_KEY = 'halovat.expo.onboarding.complete.v3.language-and-six-pages';

type AppData = {
  displayName: string;
  firstOpenedAt: number;
  darkMode: boolean;
  arabicFontSize: number;
  cityId: string;
  locationAttempted: boolean;
  cityManuallySelected: boolean;
  reminderEnabled: boolean;
  prayerTimeReminderEnabled: boolean;
  prayerAutoQuiet: boolean;
  duaReminderEnabled: boolean;
  reminderMinutes: number;
  prayerStatus: Record<string, PrayerStatus>;
  tasbeehId: string;
  tasbeehCounts: Record<string, number>;
  tasbeehTotal: number;
  tasbeehRounds: number;
  tasbeehStreak: number;
  tasbeehLastDate: string;
  tasbeehTapHaptics: boolean;
  tasbeehUndo?: { id: string; counts: Record<string, number>; rounds: number; total: number };
  savedDuas: string[];
  mosqueName: string;
  mosqueLatitude?: number;
  mosqueLongitude?: number;
  mosqueAutoQuiet: boolean;
};

const DEFAULT_DATA: AppData = {
  displayName: 'Halovat',
  firstOpenedAt: Date.now(),
  darkMode: false,
  arabicFontSize: 23,
  cityId: 'toshkent',
  locationAttempted: false,
  cityManuallySelected: false,
  reminderEnabled: false,
  prayerTimeReminderEnabled: false,
  prayerAutoQuiet: false,
  duaReminderEnabled: false,
  reminderMinutes: 30,
  prayerStatus: {},
  tasbeehId: 'subhanallah',
  tasbeehCounts: {},
  tasbeehTotal: 0,
  tasbeehRounds: 0,
  tasbeehStreak: 0,
  tasbeehLastDate: '',
  tasbeehTapHaptics: true,
  savedDuas: [],
  mosqueName: '',
  mosqueAutoQuiet: false,
};

type ContextShape = {
  data: AppData;
  reminderPlan: ReminderPlan;
  refreshReminders: () => void;
  sendReminderPreview: () => Promise<void>;
  hydrated: boolean;
  onboardingComplete: boolean;
  setOnboardingComplete: (value: boolean) => Promise<void>;
  city: City;
  months: Record<string, CalendarMonth>;
  calendarBusy: boolean;
  calendarError: string | null;
  calendarAttribution: string;
  now: Date;
  setCity: (id: string) => Promise<void>;
  detectCity: () => Promise<void>;
  setReminderEnabled: (value: boolean) => Promise<void>;
  setPrayerTimeReminderEnabled: (value: boolean) => Promise<void>;
  setDuaReminderEnabled: (value: boolean) => Promise<void>;
  setReminderMinutes: (value: number) => void;
  setPrayerStatus: (day: Date, prayer: PrayerId, status: PrayerStatus) => void;
  togglePrayerStatus: (day: Date, prayer: PrayerId) => void;
  setTasbeehId: (id: string) => void;
  countTasbeeh: () => void;
  undoTasbeeh: () => void;
  setTasbeehTapHaptics: (value: boolean) => void;
  toggleSavedDua: (title: string) => void;
  setDisplayName: (name: string) => void;
  setDarkMode: (enabled: boolean) => void;
  setArabicFontSize: (size: number) => void;
  resetTasbeeh: () => void;
  setMosque: (name: string, latitude: number, longitude: number) => void;
  setMosqueAutoQuiet: (enabled: boolean) => Promise<void>;
  setPrayerAutoQuiet: (enabled: boolean) => Promise<void>;
  refreshCalendar: () => Promise<void>;
  timesFor: (day: Date) => ReturnType<typeof getPrayerTimes>;
};

const AppContext = createContext<ContextShape | null>(null);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export function AppProvider({ children }: React.PropsWithChildren) {
  const { t } = useLanguage();
  const [data, setData] = useState<AppData>(DEFAULT_DATA);
  const [onboardingComplete, setOnboardingCompleteState] = useState(false);
  const [months, setMonths] = useState<Record<string, CalendarMonth>>({
    'toshkent:2026-10': tashkentOctober2026 as CalendarMonth,
  });
  const [hydrated, setHydrated] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [reminderPlan, setReminderPlan] = useState<ReminderPlan>({ count: 0, nextAt: null, busy: false, error: null });
  const [reminderRevision, setReminderRevision] = useState(0);
  const refreshReminders = useCallback(() => setReminderRevision(value => value + 1), []);
  const [now, setNow] = useState(new Date());
  const autoLocationStarted = useRef(false);
  const notificationQueue = useRef<Promise<void>>(Promise.resolve());
  const mosqueQuietQueue = useRef<Promise<void>>(Promise.resolve());
  const previousRounds = useRef<number | null>(null);
  const notificationDay = dateKey(now);
  const city = CITIES.find(item => item.id === data.cityId) ?? CITIES[0];

  useEffect(() => {
    let active = true;
    AsyncStorage.multiGet([STORAGE_KEY, ONBOARDING_KEY]).then(entries => {
      const saved = entries[0]?.[1];
      const onboarding = entries[1]?.[1];
      if (active && saved) {
        const restored = JSON.parse(saved) as Partial<AppData>;
        setData({
          ...DEFAULT_DATA,
          ...restored,
          // Keep a city saved by an older app version instead of replacing it on upgrade.
          cityManuallySelected: restored.cityManuallySelected ?? typeof restored.cityId === 'string',
        });
      }
      if (active) setOnboardingCompleteState(onboarding === 'true');
    }).catch(() => undefined).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => undefined);
  }, [data, hydrated]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') { setNow(new Date()); refreshReminders(); }
    });
    return () => { clearInterval(timer); listener.remove(); };
  }, [refreshReminders]);

  const loadCachedMonths = useCallback(async (selected: City) => {
    const today = new Date();
    const candidates = [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
    const loaded = await Promise.all(candidates.map(async date => {
      const key = `${selected.id}:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const cached = await AsyncStorage.getItem(CALENDAR_PREFIX + key);
      return cached ? [key, JSON.parse(cached) as CalendarMonth] as const : null;
    }));
    return Object.fromEntries(loaded.filter(Boolean) as [string, CalendarMonth][]);
  }, []);

  const refreshCalendar = useCallback(async () => {
    const selected = CITIES.find(item => item.id === data.cityId) ?? CITIES[0];
    setCalendarBusy(true);
    setCalendarError(null);
    const today = new Date();
    const targets = [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
    try {
      for (const date of targets) {
        const key = `${selected.id}:${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        let existing = months[key];
        if (!existing) {
          const cached = await AsyncStorage.getItem(CALENDAR_PREFIX + key);
          if (cached) {
            existing = JSON.parse(cached) as CalendarMonth;
            setMonths(current => ({ ...current, [key]: existing! }));
          }
        }
        // Refresh cached schedules once a day. A saved month remains usable offline.
        if (existing && Date.now() - existing.fetchedAt < 24 * 60 * 60 * 1000) continue;
        const downloaded = await fetchCalendarMonth(selected, date.getFullYear(), date.getMonth() + 1);
        setMonths(current => ({ ...current, [key]: downloaded }));
        await AsyncStorage.setItem(CALENDAR_PREFIX + key, JSON.stringify(downloaded));
      }
    } catch (error) {
      setCalendarError(error instanceof Error ? error.message : 'Namoz jadvaliga ulanib bo‘lmadi');
    } finally {
      setCalendarBusy(false);
    }
  }, [data.cityId, months]);

  useEffect(() => {
    if (!hydrated) return;
    const selected = CITIES.find(item => item.id === data.cityId) ?? CITIES[0];
    loadCachedMonths(selected).then(saved => {
      setMonths(current => ({ ...current, ...saved }));
      void refreshCalendar();
    });
  }, [data.cityId, hydrated]); // eslint-disable-line react-hooks/exhaustive-deps

  const setCity = useCallback(async (id: string) => {
    if (!CITIES.some(item => item.id === id)) return;
    setData(current => ({ ...current, cityId: id, locationAttempted: true, cityManuallySelected: true }));
    try { await Haptics.selectionAsync(); } catch { /* haptics are optional on web */ }
  }, []);

  const setOnboardingComplete = useCallback(async (value: boolean) => {
    try { await AsyncStorage.setItem(ONBOARDING_KEY, String(value)); } catch { /* onboarding can still continue if storage is unavailable */ }
    setOnboardingCompleteState(value);
  }, []);

  const detectCity = useCallback(async (options: { silent?: boolean; automatic?: boolean } = {}) => {
    const notify = (title: string, message: string) => {
      if (!options.silent) Alert.alert(title, message);
    };
    const applyDetectedCity = (id: string) => {
      setData(current => {
        if (options.automatic && current.cityManuallySelected) return current;
        return { ...current, cityId: id, locationAttempted: true };
      });
    };
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) return notify('Joylashuv topilmadi', 'Shaharni ro‘yxatdan tanlang.');
      navigator.geolocation.getCurrentPosition(position => {
        const closest = nearestCity(position.coords.latitude, position.coords.longitude);
        if (closest) applyDetectedCity(closest.id);
        else notify('Shahar aniqlanmadi', 'Avtomatik aniqlash hozircha O‘zbekiston shaharlari uchun ishlaydi. Ro‘yxatdan shahar tanlang.');
      }, () => notify('Joylashuv ruxsati kerak', 'Brauzer sozlamalaridan joylashuvga ruxsat bering.'));
      return;
    }
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      setData(current => ({ ...current, locationAttempted: true }));
      if (permission.status !== 'granted') return notify('Joylashuv ruxsati kerak', 'Shaharni avtomatik tanlash uchun joylashuvga ruxsat bering.');
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const closest = nearestCity(location.coords.latitude, location.coords.longitude);
      if (!closest) return notify('Shahar aniqlanmadi', 'Avtomatik aniqlash hozircha O‘zbekiston shaharlari uchun ishlaydi. Shaharni qo‘lda tanlang.');
      applyDetectedCity(closest.id);
    } catch {
      setData(current => ({ ...current, locationAttempted: true }));
      notify('Joylashuv aniqlanmadi', 'Shaharni qo‘lda tanlab davom etishingiz mumkin.');
    }
  }, []);

  useEffect(() => {
    if (!hydrated || !onboardingComplete || Platform.OS === 'web' || data.locationAttempted || data.cityManuallySelected || autoLocationStarted.current) return;
    autoLocationStarted.current = true;
    void detectCity({ silent: true, automatic: true });
  }, [data.cityManuallySelected, data.locationAttempted, detectCity, hydrated, onboardingComplete]);

  const ensureNotificationPermission = useCallback(async () => {
    if (Platform.OS === 'web') {
      globalThis.alert('Bildirishnomalar telefon ilovasida ishlaydi. Kompyuterdagi web preview faqat ekranlarni ko‘rsatadi.');
      return false;
    }
    try {
      await prepareReminderChannels();
      const current = await Notifications.getPermissionsAsync();
      const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Bildirishnoma yoqilmadi', 'Eslatmalarni olish uchun bildirishnoma ruxsati kerak.');
        return false;
      }
      if (!await ensureReminderAlarmAccess()) return false;
      await ensureReminderPopupAccess();
      await ensureReminderFlashAccess(t);
      return true;
    } catch (error) {
      Alert.alert('Eslatma yoqilmadi', error instanceof Error ? error.message : 'Qayta urinib ko‘ring.');
      return false;
    }
  }, [t]);

  const setPrayerTimeReminderEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !await ensureNotificationPermission()) return;
    setData(current => ({ ...current, prayerTimeReminderEnabled: enabled }));
    refreshReminders();
  }, [ensureNotificationPermission, refreshReminders]);

  const setDuaReminderEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !await ensureNotificationPermission()) return;
    setData(current => ({ ...current, duaReminderEnabled: enabled }));
    refreshReminders();
  }, [ensureNotificationPermission, refreshReminders]);

  const setReminderEnabled = useCallback(async (enabled: boolean) => {
    if (enabled && !await ensureNotificationPermission()) return;
    setData(current => ({ ...current, reminderEnabled: enabled }));
    refreshReminders();
  }, [ensureNotificationPermission, refreshReminders]);

  const sendReminderPreview = useCallback(async () => {
    if (!await ensureNotificationPermission()) return;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: 'halovat-reminder-preview',
        content: { title: t('Halovat eslatmasi'), body: t('Bildirishnomalar ishlayapti. Bu sinov eslatmasi.'), sound: 'default', priority: Notifications.AndroidNotificationPriority.HIGH, vibrate: [0, 10_000], data: { halovatReminderPreview: true, halovatPopupClose: t('Yopish'), halovatPopupVibration: t('Vibratsiya · {seconds} soniya').replace(/\{[^}]+\}/, '{seconds}'), halovatPopupFinished: t('Vibratsiya tugadi') } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 10_000), channelId: REMINDER_CHANNEL },
      });
      Alert.alert(t('Eslatma rejalashtirildi'), t('10 soniyadan keyin bildirishnoma keladi. Ilovani yopib yoki ekranini qulflab ko‘rishingiz mumkin. Bezovta qilmang rejimi yoqilgan bo‘lsa, pop-up va ovoz cheklanadi.'));
      refreshReminders();
    } catch (error) {
      Alert.alert('Eslatma yaratilmagan', error instanceof Error ? error.message : 'Qayta urinib ko‘ring.');
    }
  }, [ensureNotificationPermission, refreshReminders, t]);

  const setPrayerStatus = useCallback((day: Date, prayer: PrayerId, status: PrayerStatus) => {
    const key = prayerKey(day, prayer);
    setData(current => ({ ...current, prayerStatus: { ...current.prayerStatus, [key]: status } }));
  }, []);

  const togglePrayerStatus = useCallback((day: Date, prayer: PrayerId) => {
    const key = prayerKey(day, prayer);
    setData(current => {
      const present = current.prayerStatus[key];
      const next = present === undefined ? 'done' : present === 'done' ? 'missed' : undefined;
      const prayerStatus = { ...current.prayerStatus };
      if (next) prayerStatus[key] = next; else delete prayerStatus[key];
      return { ...current, prayerStatus };
    });
    void Haptics.selectionAsync().catch(() => undefined);
  }, []);

  const setTasbeehId = useCallback((id: string) => setData(current => ({ ...current, tasbeehId: id, tasbeehUndo: undefined })), []);
  const countTasbeeh = useCallback(() => {
    const today = dateKey(new Date());
    const yesterday = dateKey(new Date(Date.now() - 86_400_000));
    setData(current => {
      const count = (current.tasbeehCounts[current.tasbeehId] ?? 0) + 1;
      const complete = count >= ROUND_TARGET;
      const index = Math.max(0, ZIKR.findIndex(item => item.id === current.tasbeehId));
      const nextId = complete ? ZIKR[(index + 1) % ZIKR.length].id : current.tasbeehId;
      return {
        ...current,
        tasbeehUndo: { id: current.tasbeehId, counts: current.tasbeehCounts, rounds: current.tasbeehRounds, total: current.tasbeehTotal },
        tasbeehTotal: current.tasbeehTotal + 1,
        tasbeehRounds: current.tasbeehRounds + (complete ? 1 : 0),
        tasbeehStreak: current.tasbeehLastDate === today ? current.tasbeehStreak : current.tasbeehLastDate === yesterday ? current.tasbeehStreak + 1 : 1,
        tasbeehLastDate: today,
        tasbeehId: nextId,
        tasbeehCounts: complete ? { ...current.tasbeehCounts, [current.tasbeehId]: 0, [nextId]: 0 } : { ...current.tasbeehCounts, [current.tasbeehId]: count },
      };
    });
    if (data.tasbeehTapHaptics) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, [data.tasbeehTapHaptics]);
  useEffect(() => {
    if (!hydrated) return;
    if (previousRounds.current !== null && data.tasbeehRounds > previousRounds.current) {
      if (Platform.OS === 'android') Vibration.vibrate([0, 420, 160, 420]);
      else void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
    }
    previousRounds.current = data.tasbeehRounds;
  }, [data.tasbeehRounds, hydrated]);
  const undoTasbeeh = useCallback(() => setData(current => {
    if (current.tasbeehUndo) {
      const previous = current.tasbeehUndo;
      return { ...current, tasbeehId: previous.id, tasbeehCounts: previous.counts, tasbeehRounds: previous.rounds, tasbeehTotal: previous.total, tasbeehUndo: undefined };
    }
    const count = current.tasbeehCounts[current.tasbeehId] ?? 0;
    return count > 0 ? { ...current, tasbeehTotal: Math.max(0, current.tasbeehTotal - 1), tasbeehCounts: { ...current.tasbeehCounts, [current.tasbeehId]: count - 1 } } : current;
  }), []);
  const resetTasbeeh = useCallback(() => setData(current => ({ ...current, tasbeehUndo: undefined, tasbeehCounts: { ...current.tasbeehCounts, [current.tasbeehId]: 0 } })), []);
  const setMosque = useCallback((name: string, latitude: number, longitude: number) => setData(current => ({ ...current, mosqueName: name, mosqueLatitude: latitude, mosqueLongitude: longitude })), []);
  const setPrayerAutoQuiet = useCallback(async (enabled: boolean) => {
    if (enabled && !await ensureAutomaticQuietAccess(true)) return;
    if (!enabled) focusControl?.setPrayerQuietWindows('[]');
    setData(current => ({ ...current, prayerAutoQuiet: enabled }));
  }, []);
  const setMosqueAutoQuiet = useCallback(async (enabled: boolean) => {
    if (enabled) {
      if (data.mosqueLatitude === undefined || data.mosqueLongitude === undefined) {
        Alert.alert('Masjidni tanlang', 'Masjidlar xaritasidan kerakli masjidni tanlang. Ovozsiz rejim shu masjidning 150 metr hududida ishlaydi.', [
          { text: 'Hozir emas', style: 'cancel' }, { text: 'Masjidlarni ochish', onPress: () => router.push('/(tabs)/mosque') },
        ]);
        return;
      }
      if (!await ensureAutomaticQuietAccess(false)) return;
      const foreground = await Location.requestForegroundPermissionsAsync();
      if (!foreground.granted || foreground.android?.accuracy === 'coarse') { Alert.alert('Aniq joylashuv kerak', 'Masjid hududini aniqlash uchun aniq joylashuv ruxsatini bering.'); return; }
      const proceed = await new Promise<boolean>(resolve => Alert.alert('Masjid hududini aniqlash', 'Keyingi oynada joylashuvga “Har doim ruxsat berish”ni tanlang. Halovat faqat tanlangan masjidga kirish va undan chiqishni aniqlaydi.', [
        { text: 'Hozir emas', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Davom etish', onPress: () => resolve(true) },
      ], { cancelable: true, onDismiss: () => resolve(false) }));
      if (!proceed) return;
      const background = await Location.requestBackgroundPermissionsAsync();
      if (!background.granted) return;
    }
    try {
      await focusControl?.setMosqueRegion(data.mosqueLatitude ?? 0, data.mosqueLongitude ?? 0, enabled);
      setData(current => ({ ...current, mosqueAutoQuiet: enabled }));
    } catch { Alert.alert('Masjid hududi ulanmagan', 'GPS va Google Play xizmatlarini tekshirib, qayta urinib ko‘ring.'); }
  }, [data.mosqueLatitude, data.mosqueLongitude]);
  const timesFor = useCallback((day: Date) => getPrayerTimes(city, day, months), [city, months]);

  useEffect(() => {
    if (!hydrated || !focusControl) return;
    const startDay = new Date(`${notificationDay}T00:00:00`);
    const windows = data.prayerAutoQuiet ? Array.from({ length: 30 }, (_, offset) => {
      const day = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + offset);
      return timesFor(day).map(prayer => ({ start: prayer.at.getTime() + (data.prayerTimeReminderEnabled ? 10_000 : 0), end: prayer.at.getTime() + 25 * 60_000, leadInMs: data.prayerTimeReminderEnabled ? 10_000 : 0 }));
    }).flat() : [];
    try { focusControl.setPrayerQuietWindows(JSON.stringify(windows)); }
    catch (error) { Alert.alert('Ovozsiz rejim jadvali saqlanmadi', error instanceof Error ? error.message : 'Qayta urinib ko‘ring.'); }
  }, [hydrated, data.prayerAutoQuiet, data.prayerTimeReminderEnabled, timesFor, notificationDay, reminderRevision]);

  useEffect(() => {
    if (!hydrated || !focusControl) return;
    const native = focusControl;
    const latitude = data.mosqueLatitude ?? 0;
    const longitude = data.mosqueLongitude ?? 0;
    const enabled = data.mosqueAutoQuiet;
    mosqueQuietQueue.current = mosqueQuietQueue.current.catch(() => undefined).then(async () => {
      try { await native.setMosqueRegion(latitude, longitude, enabled); }
      catch { setData(current => ({ ...current, mosqueAutoQuiet: false })); }
    });
  }, [hydrated, data.mosqueAutoQuiet, data.mosqueLatitude, data.mosqueLongitude]);

  useEffect(() => {
    if (!hydrated || Platform.OS === 'web') return;
    Notifications.setNotificationCategoryAsync('prayer-checkin', [
      { identifier: 'read', buttonTitle: t('O‘qidim'), options: { opensAppToForeground: true } },
      { identifier: 'missed', buttonTitle: t('Qazo'), options: { opensAppToForeground: true } },
    ]).catch(() => undefined);
    let active = true;
    const handleResponse = (response: Notifications.NotificationResponse) => {
      if (!active) return;
      const payload = response.notification.request.content.data as { date?: string; prayer?: PrayerId; halovatDuaReminder?: boolean; halovatTimeReminder?: boolean };
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      if (payload.halovatDuaReminder) { router.push('/(tabs)/duas'); return; }
      if (payload.halovatTimeReminder) { router.push('/(tabs)'); return; }
      if (!payload.date || !payload.prayer) return;
      if (!['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].includes(payload.prayer)) return;
      const target = new Date(`${payload.date}T12:00:00`);
      if (!Number.isFinite(target.getTime())) return;
      if (response.actionIdentifier === 'read') setPrayerStatus(target, payload.prayer, 'done');
      if (response.actionIdentifier === 'missed') setPrayerStatus(target, payload.prayer, 'missed');
      router.push('/(tabs)/tracker');
      void Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const listener = Notifications.addNotificationResponseReceivedListener(handleResponse);
    void Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) handleResponse(response);
    }).catch(() => undefined);
    return () => { active = false; listener.remove(); };
  }, [hydrated, setPrayerStatus, t]);

  useEffect(() => {
    if (!hydrated || Platform.OS === 'web') return;
    let active = true;
    // Serialise cancellation and scheduling so rapid setting changes cannot leave stale alarms.
    notificationQueue.current = notificationQueue.current.catch(() => undefined).then(async () => {
      if (!active) return;
      setReminderPlan(previous => ({ ...previous, busy: true, error: null }));
      const permission = await Notifications.getPermissionsAsync();
      const anyEnabled = data.prayerTimeReminderEnabled || data.reminderEnabled || data.duaReminderEnabled;
      if (!permission.granted && anyEnabled) throw new Error('Bildirishnoma ruxsati berilmagan.');
      await prepareReminderChannels();
      const desired = new Set<string>();
      let count = 0;
      let nextAt: number | null = null;
      const failures: string[] = [];
      // Install replacements first. A failed update must not erase the working queue.
      const schedule = async (identifier: string, content: Notifications.NotificationContentInput, trigger: Notifications.NotificationTriggerInput, at?: number) => {
        desired.add(identifier);
        try {
          await Notifications.scheduleNotificationAsync({ identifier, content: { ...content, priority: Notifications.AndroidNotificationPriority.HIGH, vibrate: [0, 10_000], data: { ...content.data, halovatPopupClose: t('Yopish'), halovatPopupVibration: t('Vibratsiya · {seconds} soniya').replace(/\{[^}]+\}/, '{seconds}'), halovatPopupFinished: t('Vibratsiya tugadi') } }, trigger });
          count += 1;
          if (at !== undefined) nextAt = Math.min(nextAt ?? Infinity, at);
        } catch (error) { failures.push(error instanceof Error ? error.message : 'Eslatma saqlanmadi.'); }
      };
      const current = new Date();
      for (let offset = 0; offset < (Platform.OS === 'android' ? 30 : 7); offset += 1) {
        const day = new Date(current.getFullYear(), current.getMonth(), current.getDate() + offset);
        for (const prayer of getPrayerTimes(city, day, months)) {
          if (!active) return;
          if (data.prayerTimeReminderEnabled && prayer.at.getTime() > current.getTime() + 10_000) {
            await schedule(`halovat-v2-time:${dateKey(day)}:${prayer.id}`,  { title: t(`${prayer.name} vaqti kirdi`), body: t('Namoz vaqti haqida sokin eslatma.'), sound: 'default', data: { halovatTimeReminder: true } },
              { type: Notifications.SchedulableTriggerInputTypes.DATE, date: prayer.at, channelId: REMINDER_CHANNEL }, prayer.at.getTime());
          }
          const status = data.prayerStatus[`${dateKey(day)}:${prayer.id}`];
          const triggerAt = new Date(prayer.at.getTime() + Math.max(data.reminderMinutes, data.prayerAutoQuiet ? 26 : 0) * 60_000);
          if (!active) return;
          if (!data.reminderEnabled || offset >= (Platform.OS === 'android' ? 30 : 3) || triggerAt.getTime() <= current.getTime() + 10_000 || status) continue;
          await schedule(`halovat-v2-checkin:${dateKey(day)}:${prayer.id}`, {
              title: t(`${prayer.name} namozini o‘qidingizmi?`), body: t('Bugungi ibodatingizni belgilab qo‘ying.'),
              sound: 'default', categoryIdentifier: 'prayer-checkin', data: { halovatPrayerCheckin: true, prayer: prayer.id, date: dateKey(day) },
            },
            { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerAt, channelId: CHECKIN_CHANNEL }, triggerAt.getTime());
        }
      }
      if (data.duaReminderEnabled) {
        for (const [hour, minute, title] of [[7, 0, 'Tonggi zikr va duolar'], [19, 30, 'Kechki zikr va duolar']] as const) {
          if (!active) return;
          await schedule(`halovat-v2-dua:${hour}`, { title: t(title), body: t('Bir necha daqiqani zikr va duoga ajrating.'), sound: 'default', data: { halovatDuaReminder: true } },
            { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: REMINDER_CHANNEL });
        }
      }
      if (!active) return;
      if (failures.length) throw new Error(`${failures.length} ta eslatma saqlanmadi. ${failures[0]}`);
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      for (const item of scheduled.filter(item => isPrayerReminder(item) && !desired.has(item.identifier))) {
        if (!active) return;
        await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
      const exact = Platform.OS !== 'android' || focusControl?.getStatus().exactAlarmAccess;
      setReminderPlan({ count, nextAt, busy: false, error: anyEnabled && !exact ? 'Aniq vaqt ruxsati yo‘q. Eslatmalar kechikishi mumkin.' : null });
    }).catch(async error => {
      const installed = await Notifications.getAllScheduledNotificationsAsync().catch(() => null);
      if (active) setReminderPlan(previous => ({ ...previous, count: installed ? installed.filter(isPrayerReminder).length : previous.count, busy: false, error: error instanceof Error ? error.message : 'Eslatma jadvali yaratilmagan.' }));
    });
    return () => { active = false; };
  }, [data.reminderEnabled, data.reminderMinutes, data.prayerAutoQuiet, data.prayerStatus, data.prayerTimeReminderEnabled, data.duaReminderEnabled, city, months, hydrated, notificationDay, reminderRevision, t]);

  const calendarAttribution = useMemo(() => {
    const key = `${city.id}:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return months[key]?.sourceUrl ?? `https://namozvaqti.uz/uz/oylik/${now.getMonth() + 1}/${city.id}`;
  }, [city, months, now]);

  const value: ContextShape = {
    data, reminderPlan, refreshReminders, sendReminderPreview, hydrated, onboardingComplete, setOnboardingComplete, city, months, calendarBusy, calendarError,
    calendarAttribution, now, setCity, detectCity, setReminderEnabled, setPrayerTimeReminderEnabled, setDuaReminderEnabled,
    setReminderMinutes: value => setData(current => ({ ...current, reminderMinutes: value })),
    setPrayerStatus, togglePrayerStatus, setTasbeehId, countTasbeeh, resetTasbeeh, undoTasbeeh,
    setTasbeehTapHaptics: value => setData(current => ({ ...current, tasbeehTapHaptics: value })),
    toggleSavedDua: title => setData(current => ({ ...current, savedDuas: current.savedDuas.includes(title) ? current.savedDuas.filter(item => item !== title) : [...current.savedDuas, title] })),
    setDisplayName: name => setData(current => ({ ...current, displayName: name.trim().slice(0, 40) || 'Halovat' })),
    setDarkMode: enabled => setData(current => ({ ...current, darkMode: enabled })),
    setArabicFontSize: size => setData(current => ({ ...current, arabicFontSize: Math.max(20, Math.min(30, size)) })),
    setMosque, setMosqueAutoQuiet, setPrayerAutoQuiet, refreshCalendar, timesFor,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useHalovat() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useHalovat must be used within AppProvider');
  return context;
}
