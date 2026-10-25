import { useThemedStyles } from '../../../ui/useAppTheme';
import { router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../ui/AppText';
import { ChevronRight, Landmark, LocateFixed } from 'lucide-react-native';
import React from 'react';
import { NativeAction } from '../../../components/NativeAction';
import { NativeSegments } from '../../../components/NativeSegments';
import { QiblaCompass } from '../../../components/QiblaCompass';
import { Screen } from '../../../components/Screen';
import { useHalovat } from '../../../context/AppContext';

const GREEN = '#003527';
const EMERALD = '#006C49';
const MINT = '#B0F0D6';
const INK = '#1B1C1A';
const MUTED = '#707974';

export default function QiblaScreen() {
  const pathname = usePathname();
  const styles = useThemedStyles(baseStyles);
  const { city, data } = useHalovat();
  const openMosques = () => router.push('/mosque' as never);

  return <Screen contentStyle={styles.content}>
    <NativeSegments value={pathname === '/mosque' ? 'mosque' : 'qibla'} options={[{ value: 'qibla', label: 'Qibla yo‘nalishi' }, { value: 'mosque', label: 'Yaqin masjidlar' }]}
      onChange={value => { if (value === 'mosque') openMosques(); }} />

    <QiblaCompass city={city} />

    <View style={styles.mosqueCard}>
      <View style={styles.mosqueHead}><View style={styles.mosqueHeadLeft}><LocateFixed size={19} color={EMERALD} /><Text style={styles.mosqueTitle}>Yaqin atrofdagi masjidlar</Text></View><NativeAction label="Barchasi" compact variant="text" onPress={openMosques} /></View>
      <Pressable onPress={openMosques} style={styles.mosqueRow}><View style={styles.mosqueIcon}><Landmark size={20} color={MINT} /></View><View style={styles.mosqueInfo}><Text numberOfLines={1} style={styles.mosqueName}>{data.mosqueName || 'Masjidlarni xaritada ko‘ring'}</Text><Text style={styles.mosqueSubtitle}>Joylashuvingiz atrofidagi masjidlar</Text></View><ChevronRight size={20} color={EMERALD} /></Pressable>
    </View>
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { gap: 15 },
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
