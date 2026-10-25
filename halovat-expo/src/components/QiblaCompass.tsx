import { router } from 'expo-router';
import { LocateFixed } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle as SvgCircle, Line } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { type City, nearestCity } from '../domain/prayers';
import { qiblaBearing, relativeBearing } from '../domain/qibla';
import { useCompass } from '../hooks/useCompass';
import { Text } from '../ui/AppText';
import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';
import { CompassCalibrationGuide } from './CompassCalibrationGuide';
import { KaabaIcon } from './KaabaIcon';
import { NativeAction } from './NativeAction';
import { QiblaNeedle } from './QiblaNeedle';

const GREEN = '#003527';
const EMERALD = '#006C49';
const MINT = '#B0F0D6';
const INK = '#1B1C1A';
const MUTED = '#707974';

export const QiblaCompass = memo(function QiblaCompass({ city }: { city: City }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [guideRevision, setGuideRevision] = useState(0);
  const { coordinates, heading, animatedHeading, headingAccuracy, gpsAccuracy, status, trueNorth, restart } = useCompass(city);
  const { latitude, longitude } = coordinates;
  const locationName = useMemo(() => gpsAccuracy === null ? city.name : (nearestCity(latitude, longitude)?.name ?? city.name),
    [city.name, gpsAccuracy, latitude, longitude]);
  const bearing = useMemo(() => qiblaBearing(latitude, longitude), [latitude, longitude]);
  const hasHeading = status === 'ready' && heading !== null && Number.isFinite(heading) && headingAccuracy > 0;
  const qiblaAngle = hasHeading ? relativeBearing(bearing, heading) : 0;
  const aligned = hasHeading && headingAccuracy >= 3 && trueNorth && Math.abs(qiblaAngle) <= 8;
  const dialSize = Math.min(width - 70, 300);
  const kaabaSize = dialSize * 0.16;
  const marker = useMemo(() => <View pointerEvents="none" accessibilityLabel={t('Qibla')} style={[styles.qiblaMarker, {
    width: kaabaSize, height: kaabaSize,
    left: (dialSize - kaabaSize) / 2, top: (dialSize - kaabaSize) / 2 - dialSize * 0.32,
  }]}><KaabaIcon size={kaabaSize} /></View>, [dialSize, kaabaSize, styles, t]);
  const showCalibration = useCallback(() => {
    restart();
    setGuideRevision(value => value + 1);
  }, [restart]);

  const locationCard = useMemo(() => <Pressable onPress={() => router.push('/(tabs)/settings' as never)} style={styles.locationCard}>
    <View style={styles.locationIcon}><LocateFixed size={18} color={EMERALD} /></View>
    <View style={styles.locationDetails}><Text style={styles.locationTitle}>{locationName}, O‘zbekiston</Text><Text style={styles.locationStatus}>{gpsAccuracy === null ? 'Shahar bo‘yicha yo‘nalish' : `GPS orqali aniqlandi · ±${Math.round(gpsAccuracy)} m`}</Text></View>
    <Text style={styles.changeText}>O‘zgartirish</Text>
  </Pressable>, [gpsAccuracy, locationName, styles]);

  const dial = useMemo(() => {
    return <View style={[styles.compassOuter, { width: dialSize, height: dialSize, borderRadius: dialSize / 2 }]}>
      <Svg width={dialSize} height={dialSize} viewBox="0 0 300 300" style={styles.compassTrack}>
        <SvgCircle cx="150" cy="150" r="139" fill="none" stroke="#DCE6DF" strokeWidth="1.5" strokeDasharray="1 7" />
        <Line x1="150" y1="60" x2="150" y2="240" stroke="#BFC9C3" strokeWidth="0.8" strokeDasharray="3 4" />
        <Line x1="60" y1="150" x2="240" y2="150" stroke="#BFC9C3" strokeWidth="0.8" strokeDasharray="3 4" />
        <SvgCircle cx="150" cy="150" r="18" fill={colors.paper} stroke="#DDE8E0" strokeWidth="2" />
        <SvgCircle cx="150" cy="150" r="8" fill={EMERALD} />
      </Svg>
      <QiblaNeedle heading={animatedHeading} bearing={bearing} ready={hasHeading} size={dialSize} color={colors.green} />
      {/* Top is the alignment target, not geographic north; only the Qibla needle rotates. */}
      {marker}
    </View>;
  }, [animatedHeading, bearing, hasHeading, dialSize, colors.paper, colors.green, marker, styles]);

  const calibrationGroup = useMemo(() => <View style={styles.calibrationGroup}>
    <NativeAction label="Kompasni qayta sozlash" onPress={showCalibration} variant="outlined" />
    <Text style={styles.calibrationHint}>Telefoningizni sakkiz (8) shaklida ohista aylantiring</Text>
  </View>, [showCalibration, styles]);

  return <>
    {locationCard}
    <View style={styles.compassSection}>
      {dial}
      <View style={[styles.alignmentBadge, aligned && styles.alignmentBadgeActive]}><View style={[styles.alignmentDot, aligned && styles.alignmentDotActive]} /><Text style={[styles.alignmentText, aligned && styles.alignmentTextActive]}>{aligned ? 'Qibla tomoni to‘g‘rilandi' : status === 'permission' ? 'Kompas uchun joylashuv ruxsati kerak' : status === 'unavailable' ? 'Kompas ma’lumoti olinmadi' : status === 'no_sensor' ? 'Kompas sensori topilmadi' : heading === null || status !== 'ready' ? 'Kompas ulanmoqda' : headingAccuracy < 3 ? 'Kompas aniqligi past' : !trueNorth ? 'Magnit shimol bo‘yicha taxminiy yo‘nalish' : 'Telefonni Qibla tomoniga buring'}</Text></View>
    </View>
    <View style={styles.reading}>
      <Text style={styles.readingTitle}>Makkai Mukarrama yo‘nalishi</Text>
      <Text translate={false} style={styles.calibrationHint}>{`Qibla: ${Math.round(bearing)}°${hasHeading ? ` · Telefon: ${Math.round(heading)}°` : ''}`}</Text>
    </View>
    {calibrationGroup}
    <CompassCalibrationGuide requestRevision={guideRevision} />
  </>;
});

const baseStyles = StyleSheet.create({
  locationCard: { minHeight: 59, backgroundColor: '#F4F4F0', borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBF4E7', alignItems: 'center', justifyContent: 'center' },
  locationDetails: { flex: 1, gap: 2 },
  locationTitle: { color: INK, fontSize: 13, fontWeight: '700' },
  locationStatus: { color: EMERALD, fontSize: 10, fontWeight: '600' },
  changeText: { color: MUTED, fontSize: 10, fontWeight: '600' },
  compassSection: { alignItems: 'center', paddingTop: 6 },
  compassOuter: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', elevation: 7, shadowColor: GREEN, shadowOpacity: 0.11, shadowRadius: 25, shadowOffset: { width: 0, height: 9 } },
  compassTrack: { position: 'absolute' },
  qiblaMarker: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  alignmentBadge: { minHeight: 52, width: '92%', marginTop: 22, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, backgroundColor: '#E9F2EC', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9 },
  alignmentBadgeActive: { backgroundColor: EMERALD },
  alignmentDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: EMERALD },
  alignmentDotActive: { backgroundColor: MINT },
  alignmentText: { flexShrink: 1, color: GREEN, fontSize: 14, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  alignmentTextActive: { color: '#FFFFFF' },
  reading: { alignItems: 'center' },
  readingTitle: { color: INK, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  calibrationGroup: { gap: 6, alignItems: 'center' },
  calibrationHint: { color: MUTED, fontSize: 10, textAlign: 'center' },
});
