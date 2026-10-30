import { PRAYER_HERO_THEMES } from '../data/prayerHeroThemes';
import { getPrayerTimes, formatTime, type CalendarMonth, type City, type PrayerId } from './prayers';

export type WidgetPrayer = { id: PrayerId; name: string; currentLabel: string; at: number; time: string };
export type PrayerWidgetSnapshot = {
  version: 1;
  generatedAt: number;
  timeZone: string;
  city: string;
  nextLabel: string;
  untilLabel: string;
  units: string[];
  openLabel: string;
  themes: typeof PRAYER_HERO_THEMES;
  prayers: WidgetPrayer[];
};
export type PrayerWidgetFrame = {
  current: WidgetPrayer;
  next: WidgetPrayer;
  progress: number;
};

/** Keep the widget on the same calendar/Adhan calculation as the home card. */
export function createPrayerWidgetSnapshot(city: City, months: Record<string, CalendarMonth>, t: (text: string) => string, now = new Date()): PrayerWidgetSnapshot {
  const prayers = Array.from({ length: 33 }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + index - 1);
    return getPrayerTimes(city, day, months).map(prayer => ({
      id: prayer.id, name: t(prayer.name), currentLabel: t(`${prayer.name} vaqti`), at: prayer.at.getTime(), time: formatTime(prayer.at),
    }));
  }).flat().filter(prayer => Number.isFinite(prayer.at)).sort((a, b) => a.at - b.at);
  return {
    version: 1, generatedAt: now.getTime(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    city: city.name, nextLabel: t('Keyingi namoz:'), untilLabel: t('{time} gacha'),
    units: ['SOAT', 'DAQIQA', 'SONIYA'].map(t), openLabel: t('Namoz vaqtlarini ko‘rish uchun Halovatni oching.'),
    themes: PRAYER_HERO_THEMES, prayers,
  };
}

export function prayerWidgetFrame(prayers: WidgetPrayer[], now: number): PrayerWidgetFrame | null {
  const nextIndex = prayers.findIndex(prayer => prayer.at > now);
  if (nextIndex < 1) return null;
  const current = prayers[nextIndex - 1], next = prayers[nextIndex];
  return { current, next, progress: Math.max(0, Math.min(1, (now - current.at) / Math.max(1, next.at - current.at))) };
}

/** Include an expiry entry rather than leaving a finished counter on screen indefinitely. */
export function prayerWidgetTimeline(snapshot: PrayerWidgetSnapshot, now = Date.now()) {
  const dates = [now, ...snapshot.prayers.filter(prayer => prayer.at > now).map(prayer => prayer.at)];
  return dates.map(at => ({ at, frame: prayerWidgetFrame(snapshot.prayers, at) }));
}
