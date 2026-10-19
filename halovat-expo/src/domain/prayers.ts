import { CalculationMethod, Coordinates, Madhab, PrayerTimes } from 'adhan';

export const PRAYERS = [
  { id: 'fajr', name: 'Bomdod', icon: 'sunrise', color: '#E8A84E' },
  { id: 'dhuhr', name: 'Peshin', icon: 'sun', color: '#E5B84D' },
  { id: 'asr', name: 'Asr', icon: 'sun-medium', color: '#DB8B57' },
  { id: 'maghrib', name: 'Shom', icon: 'sunset', color: '#D87B72' },
  { id: 'isha', name: 'Xufton', icon: 'moon', color: '#8777C2' },
] as const;

export type PrayerId = (typeof PRAYERS)[number]['id'];
export type PrayerStatus = 'done' | 'missed';
export type PrayerClock = { id: PrayerId; name: string; at: Date; color: string };
export type City = { id: string; name: string; latitude: number; longitude: number; region?: string };

export const CITIES: City[] = [
  { id: 'toshkent', name: 'Toshkent', latitude: 41.3111, longitude: 69.2797, region: 'Toshkent shahri' },
  { id: 'andijon', name: 'Andijon', latitude: 40.7821, longitude: 72.3442, region: 'Andijon viloyati' },
  { id: 'fargona', name: 'Farg‘ona', latitude: 40.3864, longitude: 71.7864, region: 'Farg‘ona viloyati' },
  { id: 'samarqand', name: 'Samarqand', latitude: 39.6542, longitude: 66.9597, region: 'Samarqand viloyati' },
  { id: 'qoqon', name: 'Qo‘qon', latitude: 40.5286, longitude: 70.9425, region: 'Farg‘ona viloyati' },
  { id: 'buxoro', name: 'Buxoro', latitude: 39.7678, longitude: 64.455, region: 'Buxoro viloyati' },
  { id: 'jizzax', name: 'Jizzax', latitude: 40.1158, longitude: 67.8422, region: 'Jizzax viloyati' },
  { id: 'qarshi', name: 'Qarshi', latitude: 38.8606, longitude: 65.789, region: 'Qashqadaryo viloyati' },
  { id: 'navoiy', name: 'Navoiy', latitude: 40.0844, longitude: 65.3792, region: 'Navoiy viloyati' },
  { id: 'namangan', name: 'Namangan', latitude: 40.9983, longitude: 71.6726, region: 'Namangan viloyati' },
  { id: 'nukus', name: 'Nukus', latitude: 42.4619, longitude: 59.6166, region: 'Qoraqalpog‘iston' },
  { id: 'termiz', name: 'Termiz', latitude: 37.2242, longitude: 67.2783, region: 'Surxondaryo viloyati' },
  { id: 'urganch', name: 'Urganch', latitude: 41.55, longitude: 60.6333, region: 'Xorazm viloyati' },
  { id: 'guliston', name: 'Guliston', latitude: 40.4897, longitude: 68.7842, region: 'Sirdaryo viloyati' },
  { id: 'margilon', name: 'Marg‘ilon', latitude: 40.4711, longitude: 71.7246, region: 'Farg‘ona viloyati' },
  { id: 'angren', name: 'Angren', latitude: 41.0169, longitude: 70.1436, region: 'Toshkent viloyati' },
];

export const UZ_MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
export const UZ_WEEKDAYS = ['yakshanba', 'dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba'];
export const formatUzDate = (date: Date, includeWeekday = false) => includeWeekday
  ? `${UZ_WEEKDAYS[date.getDay()]}, ${date.getDate()} ${UZ_MONTHS[date.getMonth()]}`
  : `${date.getDate()} ${UZ_MONTHS[date.getMonth()]}`;
export const formatUzShortMonth = (date: Date) => UZ_MONTHS[date.getMonth()].slice(0, 3);

export type CalendarMonth = {
  cityId: string;
  year: number;
  month: number;
  days: Record<string, string[]>;
  sourceUrl: string;
  fetchedAt: number;
};

export const prayerKey = (date: Date, prayer: PrayerId) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}:${prayer}`;
export const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const pad = (n: number) => String(n).padStart(2, '0');

const setTime = (day: Date, value: string) => {
  const [hour, minute] = value.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
};

export function getPrayerTimes(city: City, day: Date, months: Record<string, CalendarMonth> = {}): PrayerClock[] {
  const monthId = `${city.id}:${day.getFullYear()}-${pad(day.getMonth() + 1)}`;
  const savedTimes = months[monthId]?.days[String(day.getDate())];
  if (savedTimes && savedTimes.length >= 6) {
    // namozvaqti.uz lists Bomdod, Quyosh, Peshin, Asr, Shom, Xufton, then Qamar.
    const values = [savedTimes[0], savedTimes[2], savedTimes[3], savedTimes[4], savedTimes[5]];
    return PRAYERS.map((prayer, i) => ({ ...prayer, at: setTime(day, values[i]) }));
  }

  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = Madhab.Hanafi;
  const times = new PrayerTimes(new Coordinates(city.latitude, city.longitude), day, params);
  const values: Record<PrayerId, Date> = {
    fajr: times.fajr,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha,
  };
  return PRAYERS.map(prayer => ({ ...prayer, at: values[prayer.id] }));
}

export async function fetchCalendarMonth(city: City, year: number, month: number): Promise<CalendarMonth> {
  const url = `https://namozvaqti.uz/uz/oylik/${month}/${city.id}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let html: string;
  try {
  const response = await fetch(url, {
    signal: controller.signal,
    headers: { Accept: 'text/html', 'User-Agent': 'Halovat/1.0 (local prayer calendar)' },
  });
  if (!response.ok) throw new Error(`Jadval sahifasi ${response.status} qaytardi`);
  html = await response.text();
  } finally { clearTimeout(timeout); }
  const expectedMonth = UZ_MONTHS[month - 1];
  if (!html.toLowerCase().includes(String(year)) || !html.toLowerCase().includes(expectedMonth)) {
    throw new Error('Sahifadagi kalendar tanlangan oyga mos kelmadi');
  }
  const days: Record<string, string[]> = {};
  const rows = html.match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  for (const row of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(match => decodeCell(match[1]));
    if (cells.length < 7) continue;
    const day = Number(cells[0].match(/^\s*(\d{1,2})\b/)?.[1]);
    if (!day || day > new Date(year, month, 0).getDate()) continue;
    const times = cells.slice(1).map(value => value.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/)?.[0]).filter(Boolean) as string[];
    if (times.length >= 6) days[String(day)] = times.slice(0, 6);
  }
  if (Object.keys(days).length < 28) throw new Error('Oylik namoz jadvali sahifadan to‘liq o‘qilmadi');
  return { cityId: city.id, year, month, days, sourceUrl: url, fetchedAt: Date.now() };
}

function decodeCell(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&#039;|&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
}

export const startOfWeek = (date: Date) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
};

export const formatTime = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;

export const nearestCity = (latitude: number, longitude: number) => {
  if (latitude < 36.5 || latitude > 46.7 || longitude < 55.8 || longitude > 73.2) return null;
  return CITIES.reduce((best, city) => {
  const distance = (city.latitude - latitude) ** 2 + (city.longitude - longitude) ** 2;
  return distance < best.distance ? { city, distance } : best;
  }, { city: CITIES[0], distance: Infinity }).city;
};
