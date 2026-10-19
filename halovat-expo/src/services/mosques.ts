import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MosquePlace } from '../components/mosqueMap.types';
import catalogue from '../data/mosques-uzbekistan.json';

export type Point = { latitude: number; longitude: number };
export type MosqueResult = MosquePlace & { address?: string; amenities: string[] };
type Cache = { point: Point; createdAt: number; places: MosqueResult[] };
export type MosqueLookup = { places: MosqueResult[]; source: 'live' | 'cache' | 'bundled'; updatedAt: number; warning?: string };
type Element = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };
const CACHE_KEY = 'halovat:mosques:v2';
const UNNAMED = 'Nomi ko‘rsatilmagan masjid';
const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
let memory: Cache | undefined;
const pending = new Map<string, Promise<MosqueLookup>>();
const retryAfter = new Map<string, number>();
const bundled = catalogue.places.map<MosqueResult>(place => ({ ...place, amenities: [], distanceMeters: 0 }));
const catalogueUpdatedAt = Date.parse(catalogue.osmTimestamp);
const localResults = new Map<string, MosqueResult[]>();

function validatePoint(point: Point) {
  if (!validPoint(point)) {
    throw new Error('Joylashuv koordinatalari noto‘g‘ri.');
  }
}
function validPoint(point: Point | undefined) {
  return !!point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude)
    && Math.abs(point.latitude) <= 90 && Math.abs(point.longitude) <= 180;
}

export function distanceBetween(a: Point, b: Point) {
  const rad = (value: number) => value * Math.PI / 180;
  const h = Math.sin(rad(b.latitude - a.latitude) / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(rad(b.longitude - a.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}
function rank(places: MosqueResult[], point: Point) {
  return places.map(place => ({ ...place, distanceMeters: distanceBetween(point, place) }))
    .filter(place => place.distanceMeters <= 7000).sort((a, b) => a.distanceMeters - b.distanceMeters);
}
function deduplicate(places: MosqueResult[]) {
  const result: MosqueResult[] = [];
  for (const place of places) {
    const duplicate = result.findIndex(p => p.id === place.id || (distanceBetween(p, place) < 35
      && (p.name.toLocaleLowerCase() === place.name.toLocaleLowerCase() || p.name === UNNAMED || place.name === UNNAMED)));
    if (duplicate < 0) result.push(place);
    else if (result[duplicate].name === UNNAMED && place.name !== UNNAMED) result[duplicate] = place;
    else if (!result[duplicate].address && place.address) result[duplicate].address = place.address;
  }
  return result;
}
export function bundledMosques(point: Point) {
  validatePoint(point);
  const key = `${point.latitude},${point.longitude}`;
  const saved = localResults.get(key);
  if (saved) return saved;
  // Only nearby records need trigonometry and duplicate comparison. Reuse the
  // result when the screen checks cache and then performs the same lookup.
  const latSpan = 7000 / 110_000;
  const lonSpan = latSpan / Math.max(0.01, Math.cos(point.latitude * Math.PI / 180));
  const candidates = bundled.filter(place => Math.abs(place.latitude - point.latitude) <= latSpan
    && Math.abs(place.longitude - point.longitude) <= lonSpan);
  const places = rank(deduplicate(rank(candidates, point)), point).slice(0, 100);
  if (localResults.size >= 12) localResults.delete(localResults.keys().next().value!);
  localResults.set(key, places);
  return places;
}
function usable(cache: Cache | undefined, point: Point, maxAge: number): cache is Cache {
  const age = cache ? Date.now() - cache.createdAt : Infinity;
  return !!cache && age >= 0 && age < maxAge && distanceBetween(cache.point, point) < 350;
}
export async function cachedMosques(point: Point) {
  validatePoint(point);
  if (!memory) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      const candidate = raw ? JSON.parse(raw) as Cache : undefined;
      if (candidate && validPoint(candidate.point)
        && Number.isFinite(candidate.createdAt) && Array.isArray(candidate.places)
        && candidate.places.every(p => typeof p.id === 'string' && typeof p.name === 'string'
          && validPoint(p) && Array.isArray(p.amenities))) memory = candidate;
    } catch { /* A corrupt cache does not prevent a network search. */ }
  }
  const saved = usable(memory, point, 7 * 24 * 3600_000) ? rank(memory.places, point) : [];
  const local = bundledMosques(point);
  return saved.length ? saved : local.length ? local : null;
}

function parsePlaces(elements: Element[], point: Point) {
  const places: MosqueResult[] = [];
  for (const element of elements) {
    const coords = element.center ?? { lat: element.lat, lon: element.lon };
    if (typeof coords.lat !== 'number' || typeof coords.lon !== 'number' || !validPoint({ latitude: coords.lat, longitude: coords.lon })
      || !Number.isFinite(element.id) || !['node', 'way', 'relation'].includes(element.type)) continue;
    const tags = element.tags ?? {};
    const name = [tags['name:uz-Latn'], tags['name:uz'], tags.name, tags['name:ru'], tags['official_name'], tags['alt_name']].map(value => value?.trim()).find(Boolean) ?? UNNAMED;
    const address = [tags['addr:street'], tags['addr:housenumber'], tags['addr:district'] || tags['addr:city']].filter(Boolean).join(', ');
    const place: MosqueResult = { id: `${element.type}/${element.id}`, name, latitude: coords.lat, longitude: coords.lon, distanceMeters: 0, address: address || undefined, amenities: [] };
    places.push(place);
  }
  return rank(deduplicate(places), point).slice(0, 100);
}

export async function fetchNearbyMosques(point: Point, force = false): Promise<MosqueResult[]> {
  return (await lookupNearbyMosques(point, force)).places;
}

export async function lookupNearbyMosques(point: Point, force = false): Promise<MosqueLookup> {
  validatePoint(point);
  await cachedMosques(point);
  if (!force && usable(memory, point, 30 * 60_000)) {
    const saved = rank(memory.places, point);
    if (saved.length) return { places: saved, source: 'cache', updatedAt: memory.createdAt };
  }
  // The country extract works instantly without relying on overloaded public APIs.
  const local = bundledMosques(point);
  if (!force && local.length) return { places: local, source: 'bundled', updatedAt: catalogueUpdatedAt };
  const key = `${point.latitude.toFixed(4)},${point.longitude.toFixed(4)}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = search(point);
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}

async function search(point: Point): Promise<MosqueLookup> {
  const around = `around:7350,${point.latitude.toFixed(6)},${point.longitude.toFixed(6)}`;
  const query = `[out:json][timeout:6];(nwr["amenity"="place_of_worship"]["religion"~"muslim|islam",i](${around});nwr["building"="mosque"](${around}););out center tags;`;
  let lastError = new Error('Xarita xizmati band. Birozdan so‘ng qayta urinib ko‘ring.');
  for (const endpoint of endpoints) {
    if (Date.now() < (retryAfter.get(endpoint) ?? 0)) continue;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        Accept: 'application/json',
        'User-Agent': 'Halovat/1.0 (+https://github.com/dilmuroderkinov777-ops/halovat)',
      }, body: `data=${encodeURIComponent(query)}`, signal: controller.signal });
      if (response.status === 429 || response.status === 406) {
        const header = response.headers.get('Retry-After');
        const seconds = header ? Number(header) : NaN;
        const wait = Number.isFinite(seconds) ? seconds * 1000 : header ? Date.parse(header) - Date.now() : 30_000;
        retryAfter.set(endpoint, Date.now() + Math.max(30_000, Number.isFinite(wait) ? wait : 30_000));
        throw new Error('Xarita xizmati band. Birozdan so‘ng qayta urinib ko‘ring.');
      }
      if (!response.ok) throw new Error('Masjidlar xizmati vaqtincha javob bermadi.');
      const payload = await response.json() as { elements?: Element[]; remark?: string };
      if (!Array.isArray(payload.elements) || payload.remark) throw new Error('Masjidlar xizmati to‘liq javob bermadi.');
      const places = parsePlaces(payload.elements, point);
      if (!places.length && bundledMosques(point).length) throw new Error('Masjidlar xizmati bo‘sh javob qaytardi.');
      memory = { point, createdAt: Date.now(), places };
      void AsyncStorage.setItem(CACHE_KEY, JSON.stringify(memory)).catch(() => {});
      return { places, source: 'live', updatedAt: memory.createdAt };
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') lastError = error;
      // Back off this endpoint; an independent mirror may still be available.
      if (!retryAfter.has(endpoint) || (retryAfter.get(endpoint) ?? 0) <= Date.now()) retryAfter.set(endpoint, Date.now() + 30_000);
    } finally { clearTimeout(timeout); }
  }
  const saved = usable(memory, point, 7 * 24 * 3600_000) ? rank(memory.places, point) : [];
  const local = bundledMosques(point);
  if (saved.length || local.length) return {
    places: saved.length ? saved : local,
    source: saved.length ? 'cache' : 'bundled',
    updatedAt: saved.length ? memory!.createdAt : catalogueUpdatedAt,
    warning: 'Ro‘yxat yangilanmadi. Saqlangan masjidlar ko‘rsatilmoqda.',
  };
  throw lastError;
}
