import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useFocusEffect, useIsFocused } from 'expo-router';
import { Bookmark, Landmark, MapPin } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { MosqueMap } from '../components/MosqueMap';
import { NativeAction } from '../components/NativeAction';
import { Screen } from '../components/Screen';
import { useHalovat } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { foregroundLocation } from '../services/foregroundLocation';
import { cachedMosques, lookupNearbyMosques, type MosqueResult, type Point } from '../services/mosques';
import { Text } from '../ui/AppText';
import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';

const PAGE_SIZE = 3;
const BOOKMARKS_KEY = 'halovat:mosque-bookmarks';
const INK = '#1B1C1A';
const MUTED = '#707974';
function formatDistance(meters: number) {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export default function MosqueScreen() {
  const { t } = useLanguage();
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
  const [selectedId, setSelectedId] = useState<string>();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [visibleLimit, setVisibleLimit] = useState(PAGE_SIZE);

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
    setVisibleLimit(PAGE_SIZE);
    let cached: MosqueResult[] | null = null;
    try {
      cached = await cachedMosques(point);
      if (request !== requests.current) return;
      setPlaces(cached ?? []);
      const result = await lookupNearbyMosques(point, force);
      if (request !== requests.current) return;
      setPlaces(result.places);
      setSelectedId(current => current && result.places.some(item => item.id === current) ? current : undefined);
      setError(result.warning ?? '');
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

  const nearbyPlaces = useMemo(() => [...places].sort((a, b) => a.distanceMeters - b.distanceMeters), [places]);
  const visiblePlaces = useMemo(() => nearbyPlaces.slice(0, visibleLimit), [nearbyPlaces, visibleLimit]);
  const selectedPlace = visiblePlaces.find(place => place.id === selectedId)
    ?? visiblePlaces.find(place => place.name === data.mosqueName)
    ?? visiblePlaces[0];

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

  const renderPlace = ({ item: place }: ListRenderItemInfo<MosqueResult>) => {
    const selected = place.name === data.mosqueName
      && (data.mosqueLatitude === undefined || (place.latitude === data.mosqueLatitude && place.longitude === data.mosqueLongitude));
    const bookmarked = savedIds.includes(place.id);
    return <View style={[styles.placeCard, selected && styles.placeCardSelected]}>
      <View style={styles.placeHeading}>
        <View style={styles.placeIcon}><Landmark size={20} color={colors.green} /></View>
        <View style={styles.placeCopy}>
          <Text numberOfLines={2} style={styles.placeName}>{place.name}</Text>
          <Text translate={false} style={styles.distance}>{formatDistance(place.distanceMeters)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t(bookmarked ? 'Saqlanganlardan olib tashlash' : 'Saqlash')}: ${place.name}`}
          accessibilityState={{ selected: bookmarked }} onPress={() => toggleBookmark(place.id)} style={styles.bookmarkButton}>
          <Bookmark size={19} color={colors.green} fill={bookmarked ? colors.green : 'transparent'} />
        </Pressable>
      </View>
      {place.address ? <Text numberOfLines={1} style={styles.address}>{place.address}</Text> : null}
      <View style={styles.cardActions}>
        <View style={styles.action}><NativeAction label={selected ? 'Tanlangan' : 'Tanlash'} appearance="minimal" variant="outlined" onPress={() => selectPlace(place)} /></View>
        <View style={styles.action}><NativeAction label="Yo‘nalish" appearance="minimal" variant="outlined" onPress={() => openDirections(place)} /></View>
      </View>
    </View>;
  };

  return <Screen scroll={false} contentStyle={styles.content}>
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      contentInsetAdjustmentBehavior="automatic"
      data={visiblePlaces}
      keyExtractor={place => place.id}
      renderItem={renderPlace}
      initialNumToRender={PAGE_SIZE}
      maxToRenderPerBatch={PAGE_SIZE}
      windowSize={5}
      removeClippedSubviews={false}
      refreshing={busy && places.length > 0}
      onRefresh={() => void loadPlaces(center, true)}
      ListHeaderComponent={<View style={styles.listHeader}>
        <View style={styles.locationRow}>
          <MapPin size={18} color={colors.green} />
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>{isUserLocation ? 'Joylashuvingiz atrofida' : city.name}</Text>
            {!isUserLocation ? <Text style={styles.locationHint}>Shahar markazi bo‘yicha</Text> : null}
          </View>
          <NativeAction label={locating ? 'Aniqlanmoqda' : 'GPS'} accessibilityLabel="GPS orqali avtomatik aniqlash" disabled={locating} compact appearance="minimal" variant="outlined" onPress={() => void locate()} />
        </View>
        <View style={styles.map}>
          {focused && <MosqueMap center={center} isUserLocation={isUserLocation} selectedId={selectedPlace?.id} places={visiblePlaces}
            onSelect={id => { const place = visiblePlaces.find(item => item.id === id); if (place) selectPlace(place); }} />}
        </View>
        <Text accessibilityRole="header" style={styles.resultsTitle}>Yaqin atrofdagi masjidlar</Text>
        {busy ? <View style={styles.loading}><ActivityIndicator size="small" color={colors.green} /><Text style={styles.messageText}>Masjidlar qidirilmoqda</Text></View> : null}
        {error ? <View style={styles.messageCard}><Text style={styles.messageText}>{error}</Text>{!busy ? <NativeAction label={error.includes('joylashuv ruxsati') ? 'Ruxsat berish' : 'Qayta urinish'} appearance="minimal" variant="outlined" onPress={() => void (error.includes('joylashuv ruxsati') ? locate() : loadPlaces(center, true))} /> : null}</View> : null}
        {!busy && !error && visiblePlaces.length === 0 ? <View style={styles.messageCard}><Landmark size={24} color={colors.muted} /><Text style={styles.messageText}>Bu joyga yaqin masjid topilmadi.</Text><NativeAction label="Yangilash" appearance="minimal" variant="outlined" onPress={() => void loadPlaces(center, true)} /></View> : null}
      </View>}
      ItemSeparatorComponent={MosqueSeparator}
      ListFooterComponent={visibleLimit < nearbyPlaces.length ? <View style={styles.listFooter}>
        <NativeAction label="Yana ko‘rsatish" disabled={busy} appearance="minimal" variant="outlined" onPress={() => setVisibleLimit(limit => limit + PAGE_SIZE)} />
      </View> : undefined}
    />
  </Screen>;
}

function MosqueSeparator() {
  return <View style={baseStyles.separator} />;
}

const baseStyles = StyleSheet.create({
  content: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0 },
  list: { flex: 1, width: '100%' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 },
  listHeader: { gap: 14, paddingBottom: 12 },
  listFooter: { paddingTop: 14 },
  separator: { height: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationCopy: { flex: 1, gap: 2 },
  locationTitle: { color: INK, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  locationHint: { color: MUTED, fontSize: 11, lineHeight: 16 },
  map: { height: 180, borderRadius: 16, overflow: 'hidden', backgroundColor: '#E9F2EC' },
  resultsTitle: { color: INK, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  messageCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 14, gap: 10 },
  messageText: { color: MUTED, fontSize: 13, lineHeight: 19 },
  placeCard: { borderRadius: 16, backgroundColor: '#FFFFFF', padding: 12, borderWidth: 1, borderColor: '#ECEFEA', gap: 10 },
  placeCardSelected: { borderColor: '#BFDBC8' },
  placeHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  placeIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#E9F2EC', alignItems: 'center', justifyContent: 'center' },
  placeCopy: { flex: 1, gap: 3 },
  placeName: { color: INK, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  distance: { color: MUTED, fontSize: 12, lineHeight: 16 },
  bookmarkButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ECEFEA', borderRadius: 10 },
  address: { color: MUTED, fontSize: 12, lineHeight: 17 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  action: { flex: 1 },
});
