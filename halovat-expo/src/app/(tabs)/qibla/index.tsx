import { useThemedStyles, useThemeColors } from '../../../ui/useAppTheme';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../ui/AppText';
import { ChevronRight, Landmark, LocateFixed } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import Svg, { Circle as SvgCircle, Line } from 'react-native-svg';
import { KaabaIcon } from '../../../components/KaabaIcon';
import { CompassCalibrationGuide } from '../../../components/CompassCalibrationGuide';
import { QiblaNeedle } from '../../../components/QiblaNeedle';
import { NativeAction } from '../../../components/NativeAction';
import { NativeSegments } from '../../../components/NativeSegments';
import { Screen } from '../../../components/Screen';
import { useHalovat } from '../../../context/AppContext';
import { nearestCity } from '../../../domain/prayers';
import { phoneAngleFromQibla, qiblaBearing, radians } from '../../../domain/qibla';
import { useCompass } from '../../../hooks/useCompass';
import { useLanguage } from '../../../context/LanguageContext';

const GREEN = '#003527';
const EMERALD = '#006C49';
const MINT = '#B0F0D6';
const INK = '#1B1C1A';
const MUTED = '#707974';

export default function QiblaScreen() {
  const pathname = usePathname();
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { city, data } = useHalovat();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const [guideRevision, setGuideRevision] = useState(0);
  const { coordinates, heading, headingAccuracy, gpsAccuracy, status, trueNorth, restart } = useCompass(city);

  const locationName = gpsAccuracy === null ? city.name : (nearestCity(coordinates.latitude, coordinates.longitude)?.name ?? city.name);
  const bearing = useMemo(() => qiblaBearing(coordinates.latitude, coordinates.longitude), [coordinates]);
  // Restore the Qibla reference dial: Kaaba stays above, the phone arrow moves.
  const phoneAngle = heading === null ? 0 : phoneAngleFromQibla(heading, bearing);
  const aligned = heading !== null && headingAccuracy > 0 && Math.abs(phoneAngle) <= 8;
  const dialSize = Math.min(width - 70, 300);
  const kaabaSize = dialSize * 0.16;
  const openMosques = () => router.push('/mosque' as never);
  const showCalibration = () => {
    restart();
    setGuideRevision(value => value + 1);
  };

  return <Screen contentStyle={styles.content}>
    <NativeSegments value={pathname === '/mosque' ? 'mosque' : 'qibla'} options={[{ value: 'qibla', label: 'Qibla yo‘nalishi' }, { value: 'mosque', label: 'Yaqin masjidlar' }]}
      onChange={value => { if (value === 'mosque') openMosques(); }} />

    <Pressable onPress={() => router.push('/(tabs)/settings' as never)} style={styles.locationCard}>
      <View style={styles.locationIcon}><LocateFixed size={18} color={EMERALD} /></View>
      <View style={styles.locationDetails}><Text style={styles.locationTitle}>{locationName}, O‘zbekiston</Text><Text style={styles.locationStatus}>{gpsAccuracy === null ? 'Shahar bo‘yicha yo‘nalish' : `GPS orqali aniqlandi · ±${Math.round(gpsAccuracy)} m`}</Text></View>
      <Text style={styles.changeText}>O‘zgartirish</Text>
    </Pressable>

    <View style={styles.compassSection}>
      <View style={[styles.compassOuter, { width: dialSize, height: dialSize, borderRadius: dialSize / 2 }]}>
        <Svg width={dialSize} height={dialSize} viewBox="0 0 300 300" style={styles.compassTrack}>
          <SvgCircle cx="150" cy="150" r="139" fill="none" stroke="#DCE6DF" strokeWidth="1.5" strokeDasharray="1 7" />
          <Line x1="150" y1="60" x2="150" y2="240" stroke="#BFC9C3" strokeWidth="0.8" strokeDasharray="3 4" />
          <Line x1="60" y1="150" x2="240" y2="150" stroke="#BFC9C3" strokeWidth="0.8" strokeDasharray="3 4" />
          <SvgCircle cx="150" cy="150" r="18" fill={colors.paper} stroke="#DDE8E0" strokeWidth="2" />
          <SvgCircle cx="150" cy="150" r="8" fill={EMERALD} />
        </Svg>
        <QiblaNeedle angle={phoneAngle} ready={heading !== null} size={dialSize} color={colors.green} />
        {['N', 'E', 'S', 'W'].map((label, index) => {
          const angle = radians(index * 90 - bearing);
          const radius = dialSize * 139 / 300;
          return <Text key={label} style={[styles.cardinal, { backgroundColor: colors.paper, left: dialSize / 2 + Math.sin(angle) * radius - 10, top: dialSize / 2 - Math.cos(angle) * radius - 8 }]}>{label}</Text>;
        })}
        <View accessibilityLabel={t('Ka’ba')} style={[styles.kaabaBadge, { width: kaabaSize, height: kaabaSize, left: (dialSize - kaabaSize) / 2, top: (dialSize - kaabaSize) / 2 - dialSize * 0.32 }]}>
          <KaabaIcon size={kaabaSize} />
        </View>
      </View>
      <View style={[styles.alignmentBadge, aligned && styles.alignmentBadgeActive]}><View style={[styles.alignmentDot, aligned && styles.alignmentDotActive]} /><Text style={[styles.alignmentText, aligned && styles.alignmentTextActive]}>{aligned ? 'Qibla tomoni to‘g‘rilandi' : status === 'permission' ? 'Kompas uchun joylashuv ruxsati kerak' : status === 'unavailable' ? 'Kompas ma’lumoti olinmadi' : heading === null ? 'Kompas ulanmoqda' : headingAccuracy < 1 ? 'Kompas aniqligi past' : !trueNorth ? 'Magnit shimol bo‘yicha taxminiy yo‘nalish' : 'Telefonni Qibla tomoniga buring'}</Text></View>
    </View>

    <View style={styles.reading}>
      <Text style={styles.readingTitle}>Makkai Mukarrama yo‘nalishi</Text>
      <Text translate={false} style={styles.calibrationHint}>{`Qibla: ${Math.round(bearing)}°${heading === null ? '' : ` · Telefon: ${Math.round(heading)}°`}`}</Text>
    </View>

    <View style={styles.calibrationGroup}>
      <NativeAction label="Kompasni qayta sozlash" onPress={showCalibration} variant="outlined" />
      <Text style={styles.calibrationHint}>Telefoningizni sakkiz (8) shaklida ohista aylantiring</Text>
    </View>

    <View style={styles.mosqueCard}>
      <View style={styles.mosqueHead}><View style={styles.mosqueHeadLeft}><LocateFixed size={19} color={EMERALD} /><Text style={styles.mosqueTitle}>Yaqin atrofdagi masjidlar</Text></View><NativeAction label="Barchasi" compact variant="text" onPress={openMosques} /></View>
      <Pressable onPress={openMosques} style={styles.mosqueRow}><View style={styles.mosqueIcon}><Landmark size={20} color={MINT} /></View><View style={styles.mosqueInfo}><Text numberOfLines={1} style={styles.mosqueName}>{data.mosqueName || 'Masjidlarni xaritada ko‘ring'}</Text><Text style={styles.mosqueSubtitle}>Joylashuvingiz atrofidagi masjidlar</Text></View><ChevronRight size={20} color={EMERALD} /></Pressable>
    </View>
    <CompassCalibrationGuide key={guideRevision} />
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18, gap: 15 },
  locationCard: { minHeight: 59, backgroundColor: '#F4F4F0', borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  locationIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#DBF4E7', alignItems: 'center', justifyContent: 'center' },
  locationDetails: { flex: 1, gap: 2 },
  locationTitle: { color: INK, fontSize: 13, fontWeight: '700' },
  locationStatus: { color: EMERALD, fontSize: 10, fontWeight: '600' },
  changeText: { color: MUTED, fontSize: 10, fontWeight: '600' },
  compassSection: { alignItems: 'center', paddingTop: 6 },
  compassOuter: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', elevation: 7, shadowColor: GREEN, shadowOpacity: 0.11, shadowRadius: 25, shadowOffset: { width: 0, height: 9 } },
  compassTrack: { position: 'absolute' },
  cardinal: { position: 'absolute', width: 20, textAlign: 'center', color: MUTED, fontSize: 12, lineHeight: 16, fontWeight: '700' },
  kaabaBadge: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
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
  mosqueCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 13, gap: 9, borderWidth: 1, borderColor: '#EDF0EC' },
  mosqueHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mosqueHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  mosqueTitle: { color: INK, fontSize: 14, fontWeight: '700' },
  mosqueRow: { minHeight: 54, borderRadius: 14, backgroundColor: '#F4F4F0', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 },
  mosqueIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center' },
  mosqueInfo: { flex: 1, gap: 2 },
  mosqueName: { color: INK, fontSize: 13, fontWeight: '700' },
  mosqueSubtitle: { color: MUTED, fontSize: 10 },
});
