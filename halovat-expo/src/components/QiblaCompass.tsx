import { router } from 'expo-router';
import { Check, CornerUpLeft, CornerUpRight, LocateFixed, MapPin, Pencil } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { type City, nearestCity } from '../domain/prayers';
import { qiblaBearing, relativeBearing } from '../domain/qibla';
import { useCompass } from '../hooks/useCompass';
import { useQiblaActive, useQiblaAlignment } from '../hooks/useQiblaAlignment';
import { Text } from '../ui/AppText';
import { useAppTheme, useThemedStyles, useThemeColors } from '../ui/useAppTheme';
import { CompassCalibrationGuide } from './CompassCalibrationGuide';
import { QiblaCalibrationAction } from './QiblaCalibrationAction';
import { QiblaScene } from './QiblaScene';

export const QiblaCompass = memo(function QiblaCompass({ city }: { city: City }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { dark } = useAppTheme();
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();
  const active = useQiblaActive();
  const [guideRevision, setGuideRevision] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const { coordinates, heading, motion, headingAccuracy, gpsAccuracy, status, trueNorth, restart } = useCompass(city);
  const { latitude, longitude } = coordinates;
  const locationName = useMemo(() => gpsAccuracy === null ? city.name : (nearestCity(latitude, longitude)?.name ?? city.name),
    [city.name, gpsAccuracy, latitude, longitude]);
  const bearing = useMemo(() => qiblaBearing(latitude, longitude), [latitude, longitude]);
  const confirmed = useQiblaAlignment(motion, bearing, active);
  const hasHeading = active && status === 'ready' && heading !== null && Number.isFinite(heading);
  const angle = hasHeading ? relativeBearing(bearing, heading) : null;
  const reliable = hasHeading && headingAccuracy >= 3 && trueNorth;
  const aligned = reliable && confirmed;
  const TurnIcon = aligned ? Check : (angle ?? 0) < 0 ? CornerUpLeft : CornerUpRight;
  const instruction = aligned ? 'Qiblaga yo‘naldingiz' : angle === null ? 'Telefonni Qibla tomoniga buring' : angle < 0 ? 'Chapga buring' : 'O‘ngga buring';
  const warning = status === 'permission' ? 'Kompas uchun joylashuv ruxsati kerak'
    : status === 'unavailable' ? 'Kompas ma’lumoti olinmadi'
      : status === 'no_sensor' ? 'Kompas sensori topilmadi'
        : !hasHeading ? 'Kompas ulanmoqda'
          : headingAccuracy < 3 ? 'Kompas aniqligi past'
            : !trueNorth ? 'Magnit shimol bo‘yicha taxminiy yo‘nalish' : null;

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);
  const showCalibration = useCallback(() => { restart(); setGuideRevision(value => value + 1); }, [restart]);
  const sceneHeight = Math.max(300, Math.min(Math.min(width, 440) * 1.04, height * 0.47, 410));

  return <>
    <View style={styles.locationRow}>
      <MapPin size={19} color={colors.green} />
      <Text style={styles.locationName} numberOfLines={1}>{locationName}</Text>
      <View style={styles.locationDivider} />
      <View style={styles.gpsRow}><LocateFixed size={17} color={colors.body} /><Text style={styles.gps} numberOfLines={1}>{gpsAccuracy === null ? 'Shahar bo‘yicha' : `GPS · ±${Math.round(gpsAccuracy)} m`}</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Joylashuvni o‘zgartirish')} hitSlop={6}
        onPress={() => router.push('/(tabs)/settings' as never)} style={({ pressed }) => [styles.edit, pressed && { opacity: 0.6 }]}>
        <Pencil size={18} color={colors.green} />
      </Pressable>
    </View>
    <View style={[styles.scene, { height: sceneHeight }]}>
      <QiblaScene motion={motion} bearing={bearing} aligned={aligned} active={active} dark={dark} reduceMotion={reduceMotion} />
    </View>
    <View style={styles.guidance}>
      <View style={styles.directionRow}>
        <Text translate={false} adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={styles.degrees}>{angle === null ? '—' : `${Math.round(Math.abs(angle))}°`}</Text>
        <View style={[styles.turnBadge, aligned && styles.turnBadgeAligned]}><TurnIcon size={32} color={aligned ? '#FFFFFF' : colors.green} strokeWidth={2.2} /></View>
        <Text accessibilityLiveRegion="polite" style={styles.instruction}>{instruction}</Text>
      </View>
      {warning ? <Text accessibilityLiveRegion="polite" style={styles.warning}>{warning}</Text> : null}
      <View style={styles.readings}><Text translate={false} style={styles.readingText}>{`${t('Qibla')} ${Math.round(bearing)}° · ${t('Telefon')} ${hasHeading ? `${Math.round(heading)}°` : '—'}`}</Text></View>
    </View>
    <QiblaCalibrationAction onPress={showCalibration} />
    <CompassCalibrationGuide requestRevision={guideRevision} />
  </>;
});

const baseStyles = StyleSheet.create({
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingHorizontal: 3 },
  locationName: { fontSize: 15, fontWeight: '500', color: '#003527', maxWidth: 105, flexShrink: 1 },
  locationDivider: { height: 18, width: 1, backgroundColor: '#E3E8E2', marginHorizontal: 2 },
  gpsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  gps: { fontSize: 13, color: '#404944', flexShrink: 1 },
  edit: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E9F2EC', alignItems: 'center', justifyContent: 'center' },
  scene: { marginHorizontal: -16, overflow: 'hidden' },
  guidance: { gap: 11, paddingHorizontal: 5 },
  directionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 76 },
  degrees: { fontSize: 64, lineHeight: 74, fontWeight: '600', letterSpacing: -2, color: '#003527', fontVariant: ['tabular-nums'], flex: 1.1 },
  turnBadge: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F2EC' },
  turnBadgeAligned: { backgroundColor: '#006C49' },
  instruction: { flex: 1.25, color: '#003527', fontSize: 23, lineHeight: 28, fontWeight: '600' },
  warning: { color: '#707974', textAlign: 'center', fontSize: 12, lineHeight: 18 },
  readings: { alignItems: 'center', borderRadius: 24, backgroundColor: '#E9F2EC', paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'center' },
  readingText: { fontSize: 13, color: '#404944', fontVariant: ['tabular-nums'] },
});
