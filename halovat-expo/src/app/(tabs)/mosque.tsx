import { useLanguage } from '../../context/LanguageContext';
import { useThemedStyles, useThemeColors } from '../../ui/useAppTheme';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bookmark, Car, Check, ChevronRight, Droplets, Landmark, LocateFixed, MapPin, Navigation, Search, Share2, SlidersHorizontal, Users, VolumeX, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, Keyboard, Linking, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '../../ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTopBar } from '../../components/AppTopBar';
import { Screen } from '../../components/Screen';
import { MosqueMap } from '../../components/MosqueMap';
import type { MosquePlace } from '../../components/mosqueMap.types';
import { useHalovat } from '../../context/AppContext';
import { nearestCity } from '../../domain/prayers';

const SEARCH_RADIUS_METERS = 7000;
const MAP_MARKER_LIMIT = 35;
const BOOKMARKS_KEY = 'halovat:mosque-bookmarks';
const GREEN = '#003527';
const EMERALD = '#006C49';
const INK = '#1B1C1A';
const MUTED = '#707974';
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

type OSMElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

type MosqueResult = MosquePlace & { address?: string; amenities: string[] };
type MosqueCache = { point: { latitude: number; longitude: number }; createdAt: number; places: MosqueResult[] };
let mosqueCache: MosqueCache | undefined;

function distanceBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const dLatitude = toRadians(b.latitude - a.latitude);
  const dLongitude = toRadians(b.longitude - a.longitude);
  const latitudeA = toRadians(a.latitude);
  const latitudeB = toRadians(b.latitude);
  const haversine = Math.sin(dLatitude / 2) ** 2 + Math.cos(latitudeA) * Math.cos(latitudeB) * Math.sin(dLongitude / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function mosquePhoto(name: string): ImageSourcePropType | undefined {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (normalized.includes('minor')) return require('../../../assets/mosque-minor.jpg');
  if (normalized.includes('hazrati imom') || normalized.includes('hastimom') || normalized.includes('hazrati imam')) return require('../../../assets/mosque-hazrati-imom.jpg');
  if (normalized.includes('kokcha') || normalized.includes('ko kcha') || normalized.includes('shayx zayniddin')) return require('../../../assets/mosque-kokcha.jpg');
  return undefined;
}

async function fetchNearbyMosques(point: { latitude: number; longitude: number }) {
  if (mosqueCache && Date.now() - mosqueCache.createdAt < 5 * 60_000 && distanceBetween(point, mosqueCache.point) < 600) {
    return mosqueCache.places;
  }

  const latitude = point.latitude.toFixed(6);
  const longitude = point.longitude.toFixed(6);
  const query = `[out:json][timeout:15];(nwr["amenity"="place_of_worship"]["religion"~"muslim|islam",i](around:${SEARCH_RADIUS_METERS},${latitude},${longitude});nwr["building"="mosque"](around:${SEARCH_RADIUS_METERS},${latitude},${longitude}););out center tags;`;
  const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' };
  if (Platform.OS !== 'web') headers['User-Agent'] = 'Halovat/1.0 (Android/iOS mosque finder)';
  let lastError: Error | undefined;

  for (const endpoint of OVERPASS_URLS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18_000);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      if (!response.ok) {
        lastError = new Error(response.status === 406 || response.status === 429
          ? `Xarita xizmati so‘rovni vaqtincha chekladi (${response.status}). 30 soniyadan so‘ng qayta urinib ko‘ring.`
          : `Xarita xizmati vaqtincha javob bermadi (${response.status}).`);
        // Overpass asks clients to back off after rate-limit / policy responses.
        // Do not immediately retry the same user request against another mirror.
        if (response.status === 406 || response.status === 429) break;
        continue;
      }

      const result = await response.json() as { elements?: OSMElement[] };
      const unique = new Map<string, MosqueResult>();
      for (const element of result.elements ?? []) {
        const coordinates = element.center ?? (typeof element.lat === 'number' && typeof element.lon === 'number' ? { lat: element.lat, lon: element.lon } : undefined);
        if (!coordinates) continue;
        const tags = element.tags ?? {};
        const distanceMeters = distanceBetween(point, { latitude: coordinates.lat, longitude: coordinates.lon });
        const name = tags['name:uz'] || tags.name || tags['name:ru'] || 'Nomi ko‘rsatilmagan masjid';
        const id = `${element.type}/${element.id}`;
        const address = [tags['addr:street'], tags['addr:district'] || tags['addr:city']].filter(Boolean).join(', ');
        const amenities = [
          (tags.toilets === 'yes' || tags['toilets:access'] === 'yes') && 'Tahoratxona',
          (tags['female'] === 'yes' || tags['gender_segregation'] === 'yes') && 'Ayollar xonasi',
          (tags.parking === 'yes' || tags['parking'] === 'surface') && 'Avtoturargoh',
        ].filter((item): item is string => Boolean(item));
        unique.set(id, { id, name, latitude: coordinates.lat, longitude: coordinates.lon, distanceMeters, address: address || undefined, amenities });
      }

      const places = Array.from(unique.values()).sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 100);
      mosqueCache = { point, createdAt: Date.now(), places };
      return places;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Masjidlarni yuklab bo‘lmadi.');
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError?.name === 'AbortError' || /fetch request has been canceled|aborted|timeout/i.test(lastError?.message ?? '')) {
    throw new Error('Masjidlar ro‘yxatini yuklash kechikdi. Internetni tekshirib qayta urinib ko‘ring.');
  }
  throw lastError ?? new Error('Masjidlarni yuklab bo‘lmadi.');
}

export default function MosqueScreen() {
  const { t } = useLanguage();
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { city, data, setCity, setMosque } = useHalovat();
  const [initialCenter] = useState(() => ({ latitude: city.latitude, longitude: city.longitude }));
  const [center, setCenter] = useState(initialCenter);
  const [places, setPlaces] = useState<MosqueResult[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [nearbyOnly, setNearbyOnly] = useState(true);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [amenityFilter, setAmenityFilter] = useState<string | null>(null);
  const [sortByName, setSortByName] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(8);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(BOOKMARKS_KEY).then(value => {
      if (!active || !value) return;
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) setSavedIds(parsed.filter((id): id is string => typeof id === 'string'));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const loadPlaces = useCallback(async (point: { latitude: number; longitude: number }) => {
    setBusy(true);
    setError('');
    try {
      const found = await fetchNearbyMosques(point);
      setPlaces(found);
      setSelectedId(current => current && found.some(item => item.id === current) ? current : found[0]?.id);
      if (!found.length) setError('Bu joyga yaqin masjid OpenStreetMap’da topilmadi.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Masjidlarni yuklab bo‘lmadi.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetchNearbyMosques(initialCenter)
      .then(found => {
        if (!active) return;
        setPlaces(found);
        setSelectedId(found[0]?.id);
        if (!found.length) setError('Bu joyga yaqin masjid OpenStreetMap’da topilmadi.');
      })
      .catch(reason => {
        if (active) setError(reason instanceof Error ? reason.message : 'Masjidlarni yuklab bo‘lmadi.');
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => { active = false; };
  }, [initialCenter]);

  const filteredPlaces = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return places
      .filter(place => (!term || place.name.toLocaleLowerCase().includes(term) || place.address?.toLocaleLowerCase().includes(term)) && (!nearbyOnly || place.distanceMeters < 5000) && (!bookmarksOnly || savedIds.includes(place.id)) && (!amenityFilter || place.amenities.includes(amenityFilter)))
      .sort((a, b) => sortByName ? a.name.localeCompare(b.name) : a.distanceMeters - b.distanceMeters);
  }, [places, query, nearbyOnly, bookmarksOnly, amenityFilter, savedIds, sortByName]);
  const selectedPlace = filteredPlaces.find(place => place.id === selectedId) ?? filteredPlaces[0];

  const locate = async () => {
    setBusy(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') throw new Error('Yaqin masjidlarni aniq qidirish uchun joylashuv ruxsati kerak.');
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCenter(point);
      const closestCity = nearestCity(point.latitude, point.longitude);
      if (closestCity && closestCity.id !== city.id) await setCity(closestCity.id);
      await loadPlaces(point);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Joylashuv aniqlanmadi.');
      setBusy(false);
    }
  };

  const selectPlace = (place: MosqueResult) => {
    setSelectedId(place.id);
    setMosque(place.name, place.latitude, place.longitude);
  };

  const openDirections = (place: MosqueResult) => {
    selectPlace(place);
    const destination = `${place.latitude},${place.longitude}`;
    void Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`);
  };

  const toggleBookmark = (id: string) => {
    const next = savedIds.includes(id) ? savedIds.filter(saved => saved !== id) : [...savedIds, id];
    setSavedIds(next);
    void AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next)).catch(() => {});
  };

  const sharePlace = (place: MosqueResult) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.latitude},${place.longitude}`)}`;
    void Share.share({ message: `${place.name}\n${url}` });
  };

  return <Screen header={<AppTopBar subtitle="Masjidlar" />} contentStyle={styles.content}>
    <View style={styles.searchRow}>
      <View style={styles.searchBox}>
        <Search size={19} color={EMERALD} />
        <TextInput value={query} onChangeText={value => { setQuery(value); setVisibleLimit(8); }} onSubmitEditing={() => Keyboard.dismiss()} placeholder={t('Masjid nomi yoki manzil bo‘yicha...')} placeholderTextColor="#8B9690" style={styles.searchInput} returnKeyType="search" />
        {query ? <Pressable onPress={() => setQuery('')} accessibilityLabel="Qidiruvni tozalash"><X size={17} color={colors.muted} /></Pressable> : null}
      </View>
      <Pressable onPress={() => setFilterOpen(true)} style={styles.filterButton} accessibilityLabel="Masjidlarni filtrlash"><SlidersHorizontal size={19} color={colors.green} /></Pressable>
    </View>

    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chips}>
      <Pressable onPress={() => setNearbyOnly(value => !value)} style={[styles.chip, nearbyOnly && styles.chipActive]}><Navigation size={14} color={nearbyOnly ? '#FFFFFF' : EMERALD} /><Text style={[styles.chipText, nearbyOnly && styles.chipTextActive]}>Yaqin atrofda (&lt;5 km)</Text></Pressable>
      {([{ title: 'Tahoratxona', icon: Droplets }, { title: 'Ayollar xonasi', icon: Users }, { title: 'Avtoturargoh', icon: Car }] as const).map(item => { const Icon = item.icon; const active = amenityFilter === item.title; return <Pressable key={item.title} onPress={() => setAmenityFilter(active ? null : item.title)} style={[styles.chip, active && styles.chipActive]}><Icon size={14} color={active ? '#FFFFFF' : EMERALD} /><Text style={[styles.chipText, active && styles.chipTextActive]}>{item.title}</Text></Pressable>; })}
    </ScrollView>

    <View style={styles.map}>
      <MosqueMap center={center} places={filteredPlaces.slice(0, MAP_MARKER_LIMIT)} onSelect={id => { const place = places.find(item => item.id === id); if (place) selectPlace(place); }} />
      <View pointerEvents="none" style={styles.liveMapPill}><View style={styles.liveDot} /><Text style={styles.liveMapText}>Jonli xarita rejimi</Text></View>
      <Pressable onPress={() => void locate()} style={styles.mapLocate} accessibilityLabel="Hozirgi joylashuv"><LocateFixed size={20} color={colors.green} /></Pressable>
      {busy ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator size="small" color={EMERALD} /><Text style={styles.loadingText}>Masjidlar qidirilmoqda</Text></View> : null}
      {selectedPlace ? <View style={styles.mapSelection}>
        <View style={styles.mapSelectionIcon}><Navigation size={20} color={colors.green} /></View>
        <View style={styles.mapSelectionCopy}><Text numberOfLines={1} style={styles.mapSelectionName}>{selectedPlace.name}</Text><Text style={styles.mapSelectionDistance}>{formatDistance(selectedPlace.distanceMeters)} uzoqlikda</Text></View>
        <Pressable onPress={() => openDirections(selectedPlace)} style={styles.mapSelectionAction} accessibilityLabel="Tanlangan masjidga yo‘nalish"><Text style={styles.mapSelectionActionText}>Yo‘l</Text><ChevronRight size={16} color="#FFFFFF" /></Pressable>
      </View> : null}
    </View>

    <Pressable accessibilityRole="button" accessibilityLabel="Namoz jim rejimini ochish" onPress={() => router.push('/prayer-mode' as never)} style={styles.quietCard}>
      <View style={styles.quietIcon}><VolumeX size={18} color="#B0F0D6" /></View>
      <View style={styles.quietCopy}><Text style={styles.quietTitle}>Ovozsiz namoz rejimi</Text><Text style={styles.quietSubtitle}>Masjidga kirganda qo‘lda yoqing</Text></View>
      <ChevronRight size={19} color="#B0F0D6" />
    </Pressable>

    <View style={styles.resultsHead}>
      <View style={styles.resultsTitleRow}><Text style={styles.resultsTitle}>Yaqin atrofdagi masjidlar</Text><Text style={styles.resultCount}>{busy ? 'Yuklanmoqda' : filteredPlaces.length + ' ta topildi'}</Text></View>
      <Pressable onPress={() => setSortByName(value => !value)}><Text style={styles.sortText}>{sortByName ? 'Nom bo‘yicha' : 'Masofa bo‘yicha'}</Text></Pressable>
    </View>

    {error ? <View style={styles.messageCard}><Text style={styles.messageText}>{error}</Text>{!busy ? <Pressable onPress={() => void (error.includes('joylashuv ruxsati') ? locate() : loadPlaces(center))}><Text style={styles.retryText}>{error.includes('joylashuv ruxsati') ? 'Ruxsat berish' : 'Qayta urinish'}</Text></Pressable> : null}</View> : null}
    {!busy && !error && filteredPlaces.length === 0 ? <View style={styles.messageCard}><Text style={styles.messageText}>Bu mezonlarga mos masjid topilmadi.</Text></View> : null}

    {filteredPlaces.slice(0, visibleLimit).map(place => {
      const selected = place.id === selectedPlace?.id || (!selectedId && place.name === data.mosqueName);
      const bookmarked = savedIds.includes(place.id);
      const photo = mosquePhoto(place.name);
      return <Pressable key={place.id} onPress={() => selectPlace(place)} style={[styles.placeCard, selected && styles.placeCardSelected]}>
        <View style={styles.placeHero}>
          {photo ? <><Image source={photo} resizeMode="cover" style={StyleSheet.absoluteFill} /><LinearGradient pointerEvents="none" colors={['#00352712', '#00352788']} style={StyleSheet.absoluteFill} /></> : <LinearGradient colors={selected ? ['#D8F1E4', '#98CBB0', '#0E5C43'] : ['#E5F1E9', '#BFDBC8', '#709C81']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}><View style={styles.heroCircleLarge} /><View style={styles.heroCircleSmall} /><Landmark size={66} color="#FFFFFF" strokeWidth={1.2} style={styles.heroMosqueIcon} /></LinearGradient>}
          <View style={styles.distancePill}><LocateFixed size={13} color={colors.green} /><Text style={styles.distancePillText}>{formatDistance(place.distanceMeters)}</Text></View>
          <Pressable onPress={event => { event.stopPropagation(); toggleBookmark(place.id); }} style={styles.bookmarkButton} accessibilityLabel={bookmarked ? 'Saqlanganlardan olib tashlash' : 'Masjidni saqlash'}><Bookmark size={20} color={colors.green} fill={bookmarked ? GREEN : 'none'} /></Pressable>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.nameRow}><Text numberOfLines={2} style={styles.placeName}>{place.name}</Text>{selected ? <View style={styles.selectedPill}><Check size={11} color={colors.green} /><Text style={styles.selectedPillText}>Tanlangan</Text></View> : null}</View>
          {place.address ? <View style={styles.addressRow}><MapPin size={14} color={colors.muted} /><Text numberOfLines={2} style={styles.addressText}>{place.address}</Text></View> : null}
          {place.amenities.length ? <View style={styles.amenities}>{place.amenities.map(item => <Text key={item} style={styles.amenity}>{item}</Text>)}</View> : null}
          <View style={styles.cardActions}>
            <Pressable onPress={event => { event.stopPropagation(); openDirections(place); }} style={[styles.directionsButton, selected && styles.directionsButtonActive]}><Navigation size={18} color={selected ? '#FFFFFF' : GREEN} /><Text style={[styles.directionsText, selected && styles.directionsTextActive]}>Yo‘nalish olish</Text></Pressable>
            <Pressable onPress={event => { event.stopPropagation(); sharePlace(place); }} style={styles.shareButton} accessibilityLabel="Masjidni ulashish"><Share2 size={18} color={colors.green} /></Pressable>
          </View>
        </View>
      </Pressable>;
    })}
    {visibleLimit < filteredPlaces.length ? <Pressable onPress={() => setVisibleLimit(limit => limit + 8)} style={styles.moreButton}><Text style={styles.moreText}>Yana ko‘rsatish</Text></Pressable> : null}
    <Text style={styles.attributionNote}>Xarita va masjidlar OpenStreetMap’dan. Ma’lumotlar hududga qarab farq qilishi mumkin.</Text>

    <Modal transparent visible={filterOpen} animationType="fade" onRequestClose={() => setFilterOpen(false)}>
      <View style={styles.modalShade}>
        <Pressable onPress={() => setFilterOpen(false)} style={styles.modalBackdrop} accessibilityLabel="Filtrni yopish" />
        <View style={styles.filterSheet}>
          <View style={styles.filterSheetHead}><Text style={styles.filterSheetTitle}>Masjidlarni filtrlash</Text><Pressable onPress={() => setFilterOpen(false)} accessibilityLabel="Yopish"><X size={21} color={colors.muted} /></Pressable></View>
          <Text style={styles.filterLabel}>Masofa</Text>
          <View style={styles.filterOptions}><Pressable onPress={() => setNearbyOnly(true)} style={[styles.filterOption, nearbyOnly && styles.filterOptionActive]}><Text style={[styles.filterOptionText, nearbyOnly && styles.filterOptionTextActive]}>5 km ichida</Text></Pressable><Pressable onPress={() => setNearbyOnly(false)} style={[styles.filterOption, !nearbyOnly && styles.filterOptionActive]}><Text style={[styles.filterOptionText, !nearbyOnly && styles.filterOptionTextActive]}>Barchasi</Text></Pressable></View>
          <Text style={styles.filterLabel}>Saralash</Text>
          <View style={styles.filterOptions}><Pressable onPress={() => setSortByName(false)} style={[styles.filterOption, !sortByName && styles.filterOptionActive]}><Text style={[styles.filterOptionText, !sortByName && styles.filterOptionTextActive]}>Eng yaqin</Text></Pressable><Pressable onPress={() => setSortByName(true)} style={[styles.filterOption, sortByName && styles.filterOptionActive]}><Text style={[styles.filterOptionText, sortByName && styles.filterOptionTextActive]}>Nom bo‘yicha</Text></Pressable></View>
          <Pressable onPress={() => setBookmarksOnly(value => !value)} style={styles.savedFilter}><Bookmark size={18} color={EMERALD} fill={bookmarksOnly ? EMERALD : 'none'} /><Text style={styles.savedFilterText}>Faqat saqlanganlar</Text><View style={[styles.filterCheck, bookmarksOnly && styles.filterCheckActive]}>{bookmarksOnly ? <Check size={13} color="#FFFFFF" /> : null}</View></Pressable>
          <View style={styles.filterActions}><Pressable onPress={() => { setNearbyOnly(false); setBookmarksOnly(false); setSortByName(false); setAmenityFilter(null); }} style={styles.clearButton}><Text style={styles.clearText}>Tozalash</Text></Pressable><Pressable onPress={() => setFilterOpen(false)} style={styles.applyButton}><Text style={styles.applyText}>Qo‘llash</Text></Pressable></View>
        </View>
      </View>
    </Modal>
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 26, gap: 14 },
  searchRow: { flexDirection: 'row', gap: 8, height: 48 },
  searchBox: { flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ECEFEA' },
  searchInput: { flex: 1, color: INK, fontSize: 12, paddingVertical: 0, fontFamily: 'PlusJakartaSans_400Regular' },
  filterButton: { width: 46, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ECEFEA' },
  chipScroll: { flexGrow: 0, marginRight: -14 },
  chips: { flexDirection: 'row', gap: 7, paddingRight: 14 },
  chip: { minHeight: 32, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEFEA', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10 },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN }, chipText: { color: GREEN, fontSize: 10, fontWeight: '600' }, chipTextActive: { color: '#FFFFFF' },
  map: { height: 250, borderRadius: 19, overflow: 'hidden', position: 'relative', backgroundColor: '#DDEBE2' },
  liveMapPill: { position: 'absolute', top: 12, left: 12, height: 27, borderRadius: 14, paddingHorizontal: 9, backgroundColor: '#FFFFFFED', flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: EMERALD }, liveMapText: { color: INK, fontSize: 10, fontWeight: '600' },
  mapLocate: { position: 'absolute', top: 11, right: 11, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFFF0', alignItems: 'center', justifyContent: 'center' },
  loading: { position: 'absolute', top: 46, left: 12, backgroundColor: '#FFFFFFEB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingText: { color: GREEN, fontSize: 10, fontWeight: '600' },
  mapSelection: { position: 'absolute', bottom: 12, left: 12, right: 12, minHeight: 55, borderRadius: 15, backgroundColor: '#FFFFFFF5', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mapSelectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#B0F0D6', alignItems: 'center', justifyContent: 'center' },
  mapSelectionCopy: { flex: 1, gap: 2 }, mapSelectionName: { color: INK, fontSize: 12, fontWeight: '700' }, mapSelectionDistance: { color: MUTED, fontSize: 10 },
  mapSelectionAction: { height: 33, paddingHorizontal: 12, borderRadius: 10, backgroundColor: GREEN, flexDirection: 'row', alignItems: 'center', gap: 2 }, mapSelectionActionText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  quietCard: { minHeight: 63, borderRadius: 16, backgroundColor: GREEN, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  quietIcon: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#FFFFFF16', alignItems: 'center', justifyContent: 'center' },
  quietCopy: { flex: 1, gap: 3 }, quietTitle: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }, quietSubtitle: { color: '#A9D8C2', fontSize: 10 },
  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultsTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }, resultsTitle: { color: INK, fontSize: 17, fontWeight: '700' }, resultCount: { color: MUTED, fontSize: 10 },
  sortText: { color: EMERALD, fontSize: 10, fontWeight: '600' },
  messageCard: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13, gap: 7 }, messageText: { color: MUTED, fontSize: 12, lineHeight: 17 }, retryText: { color: EMERALD, fontSize: 12, fontWeight: '700' },
  placeCard: { borderRadius: 19, backgroundColor: '#FFFFFF', padding: 12, borderWidth: 1, borderColor: '#ECEFEA', gap: 11 },
  placeCardSelected: { borderColor: '#BFDBC8' },
  placeHero: { height: 132, borderRadius: 13, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  heroCircleLarge: { position: 'absolute', width: 190, height: 190, borderRadius: 95, backgroundColor: '#FFFFFF25', right: -55, top: -60 },
  heroCircleSmall: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFFFFF20', left: -26, bottom: -60 },
  heroMosqueIcon: { opacity: 0.9 },
  distancePill: { position: 'absolute', top: 9, left: 9, minHeight: 24, borderRadius: 13, backgroundColor: '#FFFFFFEA', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  distancePillText: { color: GREEN, fontSize: 10, fontWeight: '700' },
  bookmarkButton: { position: 'absolute', top: 8, right: 8, width: 29, height: 29, borderRadius: 15, backgroundColor: '#FFFFFFEB', alignItems: 'center', justifyContent: 'center' },
  cardBody: { gap: 8 }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, placeName: { flex: 1, color: INK, fontSize: 15, fontWeight: '700' },
  selectedPill: { borderRadius: 10, backgroundColor: '#B0F0D6', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3 },
  selectedPillText: { color: GREEN, fontSize: 9, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 }, addressText: { flex: 1, color: MUTED, fontSize: 11 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  amenity: { backgroundColor: '#E5F6EB', color: GREEN, fontSize: 9, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  directionsButton: { flex: 1, height: 39, borderRadius: 11, backgroundColor: '#EFEEEA', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  directionsButtonActive: { backgroundColor: GREEN }, directionsText: { color: GREEN, fontSize: 12, fontWeight: '700' }, directionsTextActive: { color: '#FFFFFF' },
  shareButton: { width: 39, height: 39, borderRadius: 11, backgroundColor: '#EFEEEA', alignItems: 'center', justifyContent: 'center' },
  moreButton: { alignSelf: 'center', paddingHorizontal: 18, minHeight: 35, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }, moreText: { color: GREEN, fontSize: 11, fontWeight: '700' },
  attributionNote: { color: MUTED, fontSize: 9, lineHeight: 13, textAlign: 'center' },
  modalShade: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#12302466' }, modalBackdrop: { ...StyleSheet.absoluteFill },
  filterSheet: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 32, backgroundColor: '#FAF9F5', gap: 13 },
  filterSheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }, filterSheetTitle: { color: INK, fontSize: 19, fontWeight: '700' },
  filterLabel: { color: MUTED, fontSize: 11, fontWeight: '700' }, filterOptions: { flexDirection: 'row', gap: 8 },
  filterOption: { flex: 1, height: 37, borderRadius: 19, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DCE5DE', alignItems: 'center', justifyContent: 'center' },
  filterOptionActive: { backgroundColor: GREEN, borderColor: GREEN }, filterOptionText: { color: GREEN, fontSize: 12, fontWeight: '600' }, filterOptionTextActive: { color: '#FFFFFF' },
  savedFilter: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFFFFF', borderRadius: 13, paddingHorizontal: 12 }, savedFilterText: { flex: 1, color: INK, fontSize: 12, fontWeight: '600' },
  filterCheck: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#A9C0B2', alignItems: 'center', justifyContent: 'center' }, filterCheckActive: { backgroundColor: EMERALD, borderColor: EMERALD },
  filterActions: { flexDirection: 'row', gap: 9, marginTop: 4 }, clearButton: { flex: 1, height: 43, borderRadius: 22, backgroundColor: '#EFEEEA', alignItems: 'center', justifyContent: 'center' }, clearText: { color: GREEN, fontSize: 13, fontWeight: '700' },
  applyButton: { flex: 1, height: 43, borderRadius: 22, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }, applyText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});

