import { useThemedStyles, useThemeColors } from '../../ui/useAppTheme';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../ui/AppText';
import { ChevronRight, Compass, Landmark, LocateFixed } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import Svg, { Circle as SvgCircle, G, Line, Path } from 'react-native-svg';
import { AppTopBar } from '../../components/AppTopBar';
import { Screen } from '../../components/Screen';
import { useHalovat } from '../../context/AppContext';
import { nearestCity } from '../../domain/prayers';

const GREEN = '#003527';
const EMERALD = '#006C49';
const MINT = '#B0F0D6';
const INK = '#1B1C1A';
const MUTED = '#707974';
const KAABA = { latitude: 21.4225, longitude: 39.8262 };
const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function radians(degrees: number) { return degrees * Math.PI / 180; }

function qiblaBearing(latitude: number, longitude: number) {
  const lat = radians(latitude);
  const kaabaLat = radians(KAABA.latitude);
  const deltaLongitude = radians(KAABA.longitude - longitude);
  const y = Math.sin(deltaLongitude) * Math.cos(kaabaLat);
  const x = Math.cos(lat) * Math.sin(kaabaLat) - Math.sin(lat) * Math.cos(kaabaLat) * Math.cos(deltaLongitude);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function distanceToKaaba(latitude: number, longitude: number) {
  const dLatitude = radians(KAABA.latitude - latitude);
  const dLongitude = radians(KAABA.longitude - longitude);
  const a = Math.sin(dLatitude / 2) ** 2 + Math.cos(radians(latitude)) * Math.cos(radians(KAABA.latitude)) * Math.sin(dLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function QiblaScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { city, data, setCity } = useHalovat();
  const { width } = useWindowDimensions();
  const [coordinates, setCoordinates] = useState({ latitude: city.latitude, longitude: city.longitude });
  const [heading, setHeading] = useState<number | null>(null);
  const [headingAccuracy, setHeadingAccuracy] = useState(0);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [sensorUnavailable, setSensorUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | undefined;
    const startCompass = async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status === 'granted') {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (active) {
            const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            setCoordinates(point);
            setGpsAccuracy(position.coords.accuracy);
            const closestCity = nearestCity(point.latitude, point.longitude);
            if (closestCity && closestCity.id !== city.id) void setCity(closestCity.id);
          }
        }
      } catch { /* Saved city remains available when GPS cannot be read. */ }
      try {
        const compassSubscription = await Location.watchHeadingAsync(result => {
          if (!active) return;
          setHeading(result.trueHeading >= 0 ? result.trueHeading : result.magHeading);
          setHeadingAccuracy(result.accuracy);
        });
        if (active) subscription = compassSubscription;
        else compassSubscription.remove();
      } catch {
        if (active) setSensorUnavailable(true);
      }
    };
    void startCompass();
    return () => { active = false; subscription?.remove(); };
  }, [city.id, setCity]);

  const bearing = useMemo(() => qiblaBearing(coordinates.latitude, coordinates.longitude), [coordinates]);
  const distance = useMemo(() => distanceToKaaba(coordinates.latitude, coordinates.longitude), [coordinates]);
  const relativeBearing = heading === null ? bearing : (bearing - heading + 360) % 360;
  const aligned = heading !== null && headingAccuracy > 0 && Math.min(relativeBearing, 360 - relativeBearing) <= 8;
  const direction = DIRECTIONS[Math.round(bearing / 45) % 8];
  const dialSize = Math.min(width - 70, 300);
  const indicatorRadius = dialSize * 0.32;
  const indicatorAngle = radians(relativeBearing);
  const indicatorLeft = dialSize / 2 + Math.sin(indicatorAngle) * indicatorRadius - 18;
  const indicatorTop = dialSize / 2 - Math.cos(indicatorAngle) * indicatorRadius - 18;
  const openMosques = () => router.push('/(tabs)/mosque' as never);
  const showCalibration = () => Alert.alert('Kompasni sozlash', 'Telefonni tekis ushlang va uni havoda sakkiz shaklida sekin harakatlantiring. Kompas sensori telefon yo‘nalishini kuzatadi.');

  return <Screen header={<AppTopBar subtitle="Qibla" />} contentStyle={styles.content}>
    <View style={styles.segment}>
      <View style={[styles.segmentItem, styles.segmentActive]}><Compass size={18} color={colors.green} /><Text style={styles.segmentActiveText}>Qibla kompas</Text></View>
      <Pressable onPress={openMosques} style={styles.segmentItem}><Landmark size={18} color={colors.muted} /><Text style={styles.segmentText}>Yaqin masjidlar</Text></Pressable>
    </View>

    <Pressable onPress={() => router.push('/(tabs)/settings' as never)} style={styles.locationCard}>
      <View style={styles.locationIcon}><LocateFixed size={18} color={EMERALD} /></View>
      <View style={styles.locationDetails}><Text style={styles.locationTitle}>{city.name}, O‘zbekiston</Text><Text style={styles.locationStatus}>{gpsAccuracy === null ? 'Shahar bo‘yicha yo‘nalish' : `GPS orqali aniqlandi · ±${Math.round(gpsAccuracy)} m`}</Text></View>
      <Text style={styles.changeText}>O‘zgartirish</Text>
    </Pressable>

    <View style={styles.compassSection}>
      <View style={[styles.compassOuter, { width: dialSize, height: dialSize, borderRadius: dialSize / 2 }]}>
        <Svg width={dialSize} height={dialSize} viewBox="0 0 300 300" style={styles.compassTrack}>
          <SvgCircle cx="150" cy="150" r="139" fill="none" stroke="#DCE6DF" strokeWidth="1.5" strokeDasharray="1 7" />
          <SvgCircle cx="150" cy="150" r="126" fill="none" stroke="#E3EAE5" strokeWidth="1" />
          <SvgCircle cx="150" cy="150" r="110" fill={colors.canvas} stroke="#E7EBE7" strokeWidth="1" />
          <Line x1="150" y1="60" x2="150" y2="240" stroke="#BFC9C3" strokeWidth="0.8" strokeDasharray="3 4" />
          <Line x1="60" y1="150" x2="240" y2="150" stroke="#BFC9C3" strokeWidth="0.8" strokeDasharray="3 4" />
          <G transform={`rotate(${relativeBearing} 150 150)`}>
            <Path d="M150 69 L163 158 L150 144 L137 158 Z" fill={colors.green} />
            <Path d="M150 231 L163 142 L150 156 L137 142 Z" fill="#BFC9C3" />
          </G>
          <SvgCircle cx="150" cy="150" r="18" fill={colors.paper} stroke="#DDE8E0" strokeWidth="2" />
          <SvgCircle cx="150" cy="150" r="8" fill={EMERALD} />
        </Svg>
        <Text style={[styles.cardinal, styles.north]}>N</Text><Text style={[styles.cardinal, styles.east]}>E</Text><Text style={[styles.cardinal, styles.south]}>S</Text><Text style={[styles.cardinal, styles.west]}>W</Text>
        <View style={[styles.kaabaBadge, { left: indicatorLeft, top: indicatorTop }]}><Landmark size={17} color={MINT} /></View>
      </View>
      <View style={[styles.alignmentBadge, aligned && styles.alignmentBadgeActive]}><View style={[styles.alignmentDot, aligned && styles.alignmentDotActive]} /><Text style={[styles.alignmentText, aligned && styles.alignmentTextActive]}>{aligned ? 'Qibla tomoni to‘g‘rilandi' : sensorUnavailable ? 'Kompas sensori topilmadi' : heading === null ? 'Kompas ulanmoqda' : headingAccuracy === 0 ? 'Kompas aniqligi past' : 'Telefonni Qibla tomoniga buring'}</Text></View>
    </View>

    <View style={styles.reading}>
      <View style={styles.degreeRow}><Text style={styles.degree}>{Math.round(bearing)}°</Text><Text style={styles.direction}>{direction}</Text></View>
      <Text style={styles.readingTitle}>Makkai Mukarrama yo‘nalishi</Text>
      <Text style={styles.readingDetail}>{city.name}dan Ka’bagacha masofa: <Text style={styles.distance}>{Math.round(distance).toLocaleString('uz-UZ')} km</Text></Text>
    </View>

    <View style={styles.calibrationGroup}>
      <Pressable onPress={showCalibration} style={styles.calibrationButton}><Compass size={19} color={EMERALD} /><Text style={styles.calibrationText}>Kompasni qayta sozlash</Text></Pressable>
      <Text style={styles.calibrationHint}>Telefoningizni sakkiz (8) shaklida ohista aylantiring</Text>
    </View>

    <View style={styles.mosqueCard}>
      <View style={styles.mosqueHead}><View style={styles.mosqueHeadLeft}><LocateFixed size={19} color={EMERALD} /><Text style={styles.mosqueTitle}>Yaqin atrofdagi masjidlar</Text></View><Pressable onPress={openMosques}><Text style={styles.allText}>Barchasi</Text></Pressable></View>
      <Pressable onPress={openMosques} style={styles.mosqueRow}><View style={styles.mosqueIcon}><Landmark size={20} color={MINT} /></View><View style={styles.mosqueInfo}><Text numberOfLines={1} style={styles.mosqueName}>{data.mosqueName || 'Masjidlarni xaritada ko‘ring'}</Text><Text style={styles.mosqueSubtitle}>Joylashuvingiz atrofidagi masjidlar</Text></View><ChevronRight size={20} color={EMERALD} /></Pressable>
    </View>
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, gap: 15 },
  segment: { flexDirection: 'row', padding: 4, borderRadius: 24, backgroundColor: '#EFEEEA', gap: 3 },
  segmentItem: { flex: 1, minHeight: 39, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segmentActive: { backgroundColor: '#FFFFFF', elevation: 2, shadowColor: GREEN, shadowOpacity: 0.06, shadowRadius: 5 },
  segmentActiveText: { color: GREEN, fontSize: 13, fontWeight: '700' }, segmentText: { color: MUTED, fontSize: 13, fontWeight: '600' },
  locationCard: { minHeight: 59, backgroundColor: '#F4F4F0', borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBF4E7', alignItems: 'center', justifyContent: 'center' },
  locationDetails: { flex: 1, gap: 2 }, locationTitle: { color: INK, fontSize: 13, fontWeight: '700' }, locationStatus: { color: EMERALD, fontSize: 10, fontWeight: '600' }, changeText: { color: MUTED, fontSize: 10, fontWeight: '600' },
  compassSection: { alignItems: 'center', gap: 6 },
  compassOuter: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', elevation: 7, shadowColor: GREEN, shadowOpacity: 0.11, shadowRadius: 25, shadowOffset: { width: 0, height: 9 } },
  compassTrack: { position: 'absolute' }, cardinal: { position: 'absolute', color: MUTED, fontSize: 12, fontWeight: '700' }, north: { top: 16, color: GREEN }, east: { right: 17 }, south: { bottom: 16 }, west: { left: 17 },
  kaabaBadge: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },
  alignmentBadge: { minHeight: 28, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#E9F2EC', flexDirection: 'row', alignItems: 'center', gap: 6 }, alignmentBadgeActive: { backgroundColor: EMERALD },
  alignmentDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: EMERALD }, alignmentDotActive: { backgroundColor: MINT }, alignmentText: { color: GREEN, fontSize: 11, fontWeight: '600' }, alignmentTextActive: { color: '#FFFFFF' },
  reading: { alignItems: 'center', gap: 2 }, degreeRow: { flexDirection: 'row', alignItems: 'baseline', gap: 5 }, degree: { color: GREEN, fontSize: 38, lineHeight: 44, letterSpacing: -1.3, fontWeight: '700' }, direction: { color: EMERALD, fontSize: 17, fontWeight: '600' },
  readingTitle: { color: INK, fontSize: 15, fontWeight: '600' }, readingDetail: { color: MUTED, fontSize: 12, textAlign: 'center' }, distance: { color: INK, fontWeight: '700' },
  calibrationGroup: { gap: 6, alignItems: 'center' }, calibrationButton: { height: 49, width: '100%', borderRadius: 25, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#E6EBE7' }, calibrationText: { color: GREEN, fontSize: 14, fontWeight: '700' }, calibrationHint: { color: MUTED, fontSize: 10, textAlign: 'center' },
  mosqueCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 13, gap: 9, borderWidth: 1, borderColor: '#EDF0EC' }, mosqueHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, mosqueHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 }, mosqueTitle: { color: INK, fontSize: 14, fontWeight: '700' }, allText: { color: EMERALD, fontSize: 11, fontWeight: '700' },
  mosqueRow: { minHeight: 54, borderRadius: 14, backgroundColor: '#F4F4F0', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 }, mosqueIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' }, mosqueInfo: { flex: 1, gap: 2 }, mosqueName: { color: INK, fontSize: 13, fontWeight: '700' }, mosqueSubtitle: { color: MUTED, fontSize: 10 },
});
