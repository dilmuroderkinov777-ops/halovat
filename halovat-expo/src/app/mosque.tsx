import { useLanguage } from '../context/LanguageContext';
import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';
import { Typography } from '../ui/theme';
import * as Location from 'expo-location';
import { useFocusEffect, useIsFocused } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, Landmark, LocateFixed, MapPin, Navigation, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Keyboard, Linking, Pressable, Share, StyleSheet, Switch, TextInput, View, type ListRenderItemInfo } from 'react-native';
import { Text } from '../ui/AppText';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeAction } from '../components/NativeAction';
import { NativeSegments } from '../components/NativeSegments';
import { NativeSheet } from '../components/NativeSheet';
import { Screen } from '../components/Screen';
import { MosqueMap } from '../components/MosqueMap';
import { useHalovat } from '../context/AppContext';
import { cachedMosques, lookupNearbyMosques, type MosqueLookup, type MosqueResult, type Point } from '../services/mosques';
import { foregroundLocation } from '../services/foregroundLocation';
import { mosquePhoto, mosquePhotoCredit } from '../services/mosquePhotos';

const MAP_MARKER_LIMIT = 35;
const BOOKMARKS_KEY = 'halovat:mosque-bookmarks';
const GREEN = '#003527';
const EMERALD = '#006C49';
const INK = '#1B1C1A';
const MUTED = '#707974';
function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export default function MosqueScreen() {
  const { t, language } = useLanguage();
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { city, data, setMosque } = useHalovat();
  const focused = useIsFocused();
  const [center, setCenter] = useState<Point>({ latitude: city.latitude, longitude: city.longitude });
  const [isUserLocation, setIsUserLocation] = useState(false);
  const [locating, setLocating] = useState(false);
  const requests = useRef(0);
  const locationRequests = useRef(0);
  const [places, setPlaces] = useState<MosqueResult[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [sourceInfo, setSourceInfo] = useState<Pick<MosqueLookup, 'source' | 'updatedAt'> | null>(null);
  const [nearbyOnly, setNearbyOnly] = useState(false);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [sortByName, setSortByName] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(8);
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(BOOKMARKS_KEY).then(value => {
      if (!active || !value) return;
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) setSavedIds(parsed.filter((id): id is string => typeof id === 'string'));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const loadPlaces = useCallback(async (point: Point, force = false) => {
    const request = ++requests.current;
    setBusy(true);
    setError('');
    setSourceInfo(null);
    setVisibleLimit(8);
    if (force) setFailedPhotos(new Set());
    let cached: MosqueResult[] | null = null;
    try {
      cached = await cachedMosques(point);
      if (request !== requests.current) return;
      setPlaces(cached ?? []);
      const result = await lookupNearbyMosques(point, force);
      if (request !== requests.current) return;
      const found = result.places;
      setPlaces(found);
      setSourceInfo({ source: result.source, updatedAt: result.updatedAt });
      setSelectedId(current => current && found.some(item => item.id === current) ? current : found[0]?.id);
      setError(result.warning ?? (!found.length ? 'Bu joyga yaqin masjid topilmadi.' : ''));
    } catch (reason) {
      if (request !== requests.current) return;
      const message = reason instanceof Error ? reason.message : 'Masjidlarni yuklab bo‘lmadi.';
      setError(cached?.length ? 'Saqlangan masjidlar ko‘rsatilmoqda. ' + message : message);
    } finally { if (request === requests.current) setBusy(false); }
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    const fallback = { latitude: city.latitude, longitude: city.longitude };
    const locationRequest = ++locationRequests.current;
    setLocating(false);
    setCenter(fallback);
    setIsUserLocation(false);
    void loadPlaces(fallback);
    // Use existing permission on entry; the locate button can request it.
    void Location.getForegroundPermissionsAsync().then(async permission => {
      if (!permission.granted || !active) return;
      const position = await foregroundLocation();
      if (!active || locationRequest !== locationRequests.current) return;
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCenter(point);
      setIsUserLocation(true);
      void loadPlaces(point);
    }).catch(reason => {
      if (active && locationRequest === locationRequests.current) setError(reason instanceof Error ? reason.message : 'Joylashuv aniqlanmadi.');
    });
    return () => { active = false; requests.current++; locationRequests.current++; };
  }, [city.latitude, city.longitude, loadPlaces]));

  const filteredPlaces = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return places
      .filter(place => (!term || place.name.toLocaleLowerCase().includes(term) || place.address?.toLocaleLowerCase().includes(term)) && (!nearbyOnly || place.distanceMeters < 5000) && (!bookmarksOnly || savedIds.includes(place.id)))
      .sort((a, b) => sortByName ? a.name.localeCompare(b.name) : a.distanceMeters - b.distanceMeters);
  }, [places, query, nearbyOnly, bookmarksOnly, savedIds, sortByName]);
  const selectedPlace = filteredPlaces.find(place => place.id === selectedId) ?? filteredPlaces[0];
  const mapPlaces = useMemo(() => {
    const markers = filteredPlaces.slice(0, MAP_MARKER_LIMIT);
    if (selectedPlace && !markers.some(place => place.id === selectedPlace.id)) {
      return [...markers.slice(0, MAP_MARKER_LIMIT - 1), selectedPlace];
    }
    return markers;
  }, [filteredPlaces, selectedPlace]);
  const updatedDate = sourceInfo ? new Date(sourceInfo.updatedAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-GB' : 'uz-UZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const locate = async () => {
    const request = ++locationRequests.current;
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error('Yaqin masjidlarni aniq qidirish uchun joylashuv ruxsati kerak.');
      const position = await foregroundLocation({ fresh: true });
      if (request !== locationRequests.current) return;
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCenter(point);
      setIsUserLocation(true);
      await loadPlaces(point);
    } catch (reason) {
      if (request === locationRequests.current) setError(reason instanceof Error ? reason.message : 'Joylashuv aniqlanmadi.');
    } finally { if (request === locationRequests.current) setLocating(false); }
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

  const renderPlace = ({ item: place }: ListRenderItemInfo<MosqueResult>) => {
    const selected = place.id === selectedPlace?.id || (!selectedId && place.name === data.mosqueName);
    const bookmarked = savedIds.includes(place.id);
    const photo = failedPhotos.has(place.id) ? undefined : mosquePhoto(place);
    const credit = photo ? mosquePhotoCredit(place) : undefined;
    return <View key={place.id} style={[styles.placeCard, selected && styles.placeCardSelected]}>
      <View style={[styles.placeHero, !photo && styles.placeHeroCompact]}>
        {photo ? <><Image source={photo} resizeMode="cover" onError={event => { console.warn('Halovat mosque photo', place.id, event.nativeEvent.error); setFailedPhotos(current => new Set(current).add(place.id)); }} style={StyleSheet.absoluteFill} /><LinearGradient pointerEvents="none" colors={['#00352712', '#00352788']} style={StyleSheet.absoluteFill} /></> : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Landmark size={20} color={EMERALD} /><Text style={styles.photoMissing}>{failedPhotos.has(place.id) ? 'Surat yuklanmadi' : 'Surat mavjud emas'}</Text></View>}
        <View style={styles.distancePill}><LocateFixed size={13} color={colors.green} /><Text style={styles.distancePillText}>{formatDistance(place.distanceMeters)}</Text></View>
        <View style={styles.bookmarkButton}><NativeAction label={bookmarked ? 'Saqlangan' : 'Saqlash'} compact variant="outlined" onPress={() => toggleBookmark(place.id)} /></View>
      </View>
      <View style={styles.cardBody}>
        {credit ? <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL(credit.source); }}><Text translate={false} numberOfLines={2} style={styles.sourceText}>{`${credit.artist} · ${credit.license} · Wikimedia Commons · kesilgan`}</Text></Pressable> : null}
        <View style={styles.nameRow}><Text numberOfLines={2} style={styles.placeName}>{place.name}</Text>{selected ? <View style={styles.selectedPill}><Check size={11} color={colors.green} /><Text style={styles.selectedPillText}>Tanlangan</Text></View> : null}</View>
        {place.address ? <View style={styles.addressRow}><MapPin size={14} color={colors.muted} /><Text numberOfLines={2} style={styles.addressText}>{place.address}</Text></View> : null}
        {place.amenities.length ? <View style={styles.amenities}>{place.amenities.map(item => <Text key={item} style={styles.amenity}>{item}</Text>)}</View> : null}
        <View style={styles.cardActions}>
          <NativeAction label={selected ? 'Tanlangan' : 'Tanlash'} compact variant="outlined" onPress={() => selectPlace(place)} />
          <NativeAction label="Yo‘nalish" compact onPress={() => openDirections(place)} />
          <NativeAction label="Ulashish" compact variant="text" onPress={() => sharePlace(place)} />
        </View>
      </View>
    </View>;
  };

  return <Screen scroll={false} contentStyle={styles.content}>
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      data={filteredPlaces.slice(0, visibleLimit)}
      keyExtractor={place => place.id}
      renderItem={renderPlace}
      initialNumToRender={2}
      maxToRenderPerBatch={2}
      windowSize={5}
      removeClippedSubviews={false}
      ListHeaderComponent={<View style={styles.listHeader}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={19} color={EMERALD} />
            <TextInput accessibilityLabel={t('Masjid qidirish')} clearButtonMode="while-editing" value={query} onChangeText={value => { setQuery(value); setVisibleLimit(8); }} onSubmitEditing={() => Keyboard.dismiss()} placeholder={t('Masjid nomi yoki manzil bo‘yicha...')} placeholderTextColor="#8B9690" style={styles.searchInput} returnKeyType="search" />
          </View>
          <NativeAction label="Filtr" compact variant="outlined" onPress={() => { Keyboard.dismiss(); setFilterOpen(true); }} />
        </View>

        <View style={styles.map}>
          {focused && <MosqueMap center={center} isUserLocation={isUserLocation} selectedId={selectedPlace?.id} places={mapPlaces} onSelect={id => { const place = places.find(item => item.id === id); if (place) selectPlace(place); }} />}
          <View pointerEvents="none" style={styles.liveMapPill}><View style={styles.liveDot} /><Text style={styles.liveMapText}>{isUserLocation ? 'Joylashuvingiz atrofida' : 'Shahar markazi bo‘yicha'}</Text></View>
          <View style={styles.mapLocate}><NativeAction label={locating ? 'Aniqlanmoqda' : 'GPS'} disabled={locating} compact variant="outlined" onPress={() => void locate()} /></View>
          {busy ? <View pointerEvents="none" style={styles.loading}><ActivityIndicator size="small" color={EMERALD} /><Text style={styles.loadingText}>Masjidlar qidirilmoqda</Text></View> : null}
          {selectedPlace ? <View style={styles.mapSelection}>
            <View style={styles.mapSelectionIcon}><Navigation size={20} color={colors.green} /></View>
            <View style={styles.mapSelectionCopy}><Text numberOfLines={1} style={styles.mapSelectionName}>{selectedPlace.name}</Text><Text style={styles.mapSelectionDistance}>{formatDistance(selectedPlace.distanceMeters)} uzoqlikda</Text></View>
            <NativeAction label="Yo‘l" onPress={() => openDirections(selectedPlace)} compact variant="outlined" />
          </View> : null}
        </View>

        <View style={styles.resultsHead}>
          <View style={styles.resultsTitleRow}><Text style={styles.resultsTitle}>Yaqin atrofdagi masjidlar</Text><Text style={styles.resultCount}>{busy ? 'Yuklanmoqda' : filteredPlaces.length + ' ta topildi'}</Text></View>
          <NativeAction label={sortByName ? 'Nom bo‘yicha' : 'Masofa bo‘yicha'} compact variant="text" onPress={() => setSortByName(value => !value)} />
        </View>

        <View style={styles.sourceRow}>
          <Text style={styles.sourceText}>{sourceInfo ? `${t(sourceInfo.source === 'live' ? 'Yangilangan ro‘yxat' : 'Saqlangan ro‘yxat')} · ${updatedDate}` : busy ? 'Masjidlar qidirilmoqda' : ''}</Text>
          <NativeAction label={busy ? 'Yuklanmoqda' : 'Yangilash'} onPress={() => void loadPlaces(center, true)} compact variant="outlined" disabled={busy} />
        </View>

        {error ? <View style={styles.messageCard}><Text style={styles.messageText}>{error}</Text>{!busy ? <NativeAction label={error.includes('joylashuv ruxsati') ? 'Ruxsat berish' : 'Qayta urinish'} variant="outlined" onPress={() => void (error.includes('joylashuv ruxsati') ? locate() : loadPlaces(center, true))} /> : null}</View> : null}
        {!busy && !error && filteredPlaces.length === 0 ? <View style={styles.messageCard}><Text style={styles.messageText}>Bu mezonlarga mos masjid topilmadi.</Text></View> : null}
      </View>}
      ItemSeparatorComponent={MosqueSeparator}
      ListFooterComponent={<View style={styles.listFooter}>
        {visibleLimit < filteredPlaces.length ? <NativeAction label="Yana ko‘rsatish" onPress={() => setVisibleLimit(limit => limit + 8)} variant="outlined" /> : null}
        <Text style={styles.attributionNote}>Xarita va masjidlar OpenStreetMap’dan. Ma’lumotlar hududga qarab farq qilishi mumkin.</Text>
      </View>}
    />

    <NativeSheet visible={filterOpen} onClose={() => setFilterOpen(false)} title="Masjidlarni filtrlash" compact>
      <Text style={styles.filterLabel}>Masofa</Text>
      <NativeSegments value={nearbyOnly ? 'nearby' : 'all'} options={[{ value: 'nearby', label: '5 km ichida' }, { value: 'all', label: 'Barchasi' }]}
        onChange={value => setNearbyOnly(value === 'nearby')} />
      <Text style={styles.filterLabel}>Saralash</Text>
      <NativeSegments value={sortByName ? 'name' : 'distance'} options={[{ value: 'distance', label: 'Eng yaqin' }, { value: 'name', label: 'Nom bo‘yicha' }]}
        onChange={value => setSortByName(value === 'name')} />
      <View style={styles.savedFilter}><Text style={styles.savedFilterText}>Faqat saqlanganlar</Text>
        <Switch accessibilityLabel={t('Faqat saqlanganlar')} value={bookmarksOnly} onValueChange={setBookmarksOnly} />
      </View>
      <NativeAction label="Tozalash" variant="outlined" onPress={() => { setNearbyOnly(false); setBookmarksOnly(false); setSortByName(false); }} />
      <NativeAction label="Qo‘llash" onPress={() => setFilterOpen(false)} />
    </NativeSheet>
  </Screen>;
}

function MosqueSeparator() {
  return <View style={baseStyles.separator} />;
}

const baseStyles = StyleSheet.create({
  content: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0 },
  list: { flex: 1, width: '100%' },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  listHeader: { gap: 14, paddingBottom: 14 },
  listFooter: { gap: 14, paddingTop: 14 },
  separator: { height: 14 },
  searchRow: { flexDirection: 'row', gap: 8, height: 48 },
  searchBox: { flex: 1, borderRadius: 16, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#ECEFEA' },
  searchInput: { flex: 1, color: INK, fontSize: 12, paddingVertical: 0 },
  map: { height: 250, borderRadius: 19, overflow: 'hidden', position: 'relative', backgroundColor: '#DDEBE2' },
  liveMapPill: { position: 'absolute', top: 12, left: 12, height: 27, borderRadius: 14, paddingHorizontal: 9, backgroundColor: '#FFFFFFED', flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: EMERALD },
  liveMapText: { color: INK, fontSize: 10, fontWeight: '600' },
  mapLocate: { position: 'absolute', top: 8, right: 8 },
  loading: { position: 'absolute', top: 46, left: 12, backgroundColor: '#FFFFFFEB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingText: { color: GREEN, fontSize: 10, fontWeight: '600' },
  mapSelection: { position: 'absolute', bottom: 12, left: 12, right: 12, minHeight: 55, borderRadius: 15, backgroundColor: '#FFFFFFF5', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 9 },
  mapSelectionIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#B0F0D6', alignItems: 'center', justifyContent: 'center' },
  mapSelectionCopy: { flex: 1, gap: 2 },
  mapSelectionName: { color: INK, fontSize: 12, fontWeight: '700' },
  mapSelectionDistance: { color: MUTED, fontSize: 10 },
  resultsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  resultsTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' },
  resultsTitle: { ...Typography.sectionTitle, color: INK },
  resultCount: { color: MUTED, fontSize: 10 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -7 },
  sourceText: { flex: 1, color: MUTED, fontSize: 10, lineHeight: 15 },
  messageCard: { backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13, gap: 7 },
  messageText: { color: MUTED, fontSize: 12, lineHeight: 17 },
  placeCard: { borderRadius: 19, backgroundColor: '#FFFFFF', padding: 12, borderWidth: 1, borderColor: '#ECEFEA', gap: 11 },
  placeCardSelected: { borderColor: '#BFDBC8' },
  photoMissing: { color: MUTED, fontSize: 10 },
  placeHeroCompact: { height: 66, paddingTop: 32 },
  placeHero: { height: 132, borderRadius: 13, overflow: 'hidden', position: 'relative', alignItems: 'center', justifyContent: 'center' },
  distancePill: { position: 'absolute', top: 9, left: 9, minHeight: 24, borderRadius: 13, backgroundColor: '#FFFFFFEA', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  distancePillText: { color: GREEN, fontSize: 10, fontWeight: '700' },
  bookmarkButton: { position: 'absolute', top: 8, right: 8 },
  cardBody: { gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  placeName: { flex: 1, color: INK, fontSize: 15, fontWeight: '700' },
  selectedPill: { borderRadius: 10, backgroundColor: '#B0F0D6', flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3 },
  selectedPillText: { color: GREEN, fontSize: 9, fontWeight: '700' },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addressText: { flex: 1, color: MUTED, fontSize: 11 },
  amenities: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  amenity: { backgroundColor: '#E5F6EB', color: GREEN, fontSize: 9, fontWeight: '600', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  cardActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  attributionNote: { color: MUTED, fontSize: 9, lineHeight: 13, textAlign: 'center' },
  filterLabel: { color: MUTED, fontSize: 11, fontWeight: '700' },
  savedFilter: { minHeight: 45, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: '#FFFFFF', borderRadius: 13, paddingHorizontal: 12 },
  savedFilterText: { flex: 1, color: INK, fontSize: 12, fontWeight: '600' },
});

