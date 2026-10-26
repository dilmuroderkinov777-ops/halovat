import { useThemedStyles, useThemeColors } from '../../../ui/useAppTheme';
import { Typography } from '../../../ui/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarDays, CircleDot, GraduationCap, Moon, RotateCw, Sunrise } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Switch, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../ui/AppText';
import { NativeAction } from '../../../components/NativeAction';
import { NativeSelect } from '../../../components/NativeSelect';
import { Screen } from '../../../components/Screen';
import { TasbeehCounter } from '../../../components/TasbeehCounter';
import { useHalovat } from '../../../context/AppContext';
import { DUAS } from '../../../data/duas';
import { ROUND_TARGET, ZIKR } from '../../../data/zikr';
const EMERALD = '#006C49';
const FOREST = '#003527';
const MINT = '#6FFBBE';
const INK = '#1B1C1A';
const MUTED = '#707974';
const RECOMMENDED_DUAS = DUAS.slice(0, 3);

export default function TasbeehScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const { data, setTasbeehId, countTasbeeh, resetTasbeeh, undoTasbeeh, setTasbeehTapHaptics, toggleSavedDua } = useHalovat();
  const [roundNotice, setRoundNotice] = useState('');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticedRounds = useRef(data.tasbeehRounds);
  const selectedIndex = Math.max(0, ZIKR.findIndex(item => item.id === data.tasbeehId));
  const selected = ZIKR[selectedIndex];
  const count = Math.min(data.tasbeehCounts[selected.id] ?? 0, ROUND_TARGET);
  const remaining = ROUND_TARGET - count;
  const circleSize = Math.min(width - 88, 264);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  useEffect(() => {
    if (data.tasbeehRounds > noticedRounds.current) {
      setRoundNotice('33 ta zikr tugadi · ' + selected.name + ' boshlandi');
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setRoundNotice(''), 2600);
    }
    noticedRounds.current = data.tasbeehRounds;
  }, [data.tasbeehRounds, selected.name]);

  const selectZikr = (id: string) => {
    setTasbeehId(id);
  };

  // Keep the native controls and dua cards out of the counter's render path.
  const recommendedDuas = useMemo(() => {
    return (
      <View style={styles.duasSection}>
        <View style={styles.duasHeading}>
          <View><Text style={styles.duasTitle}>Tavsiya etilgan duolar</Text><Text style={styles.duasSubtitle}>Qur’on va sunnatdagi muhim zikrlar</Text></View>
        </View>
        {RECOMMENDED_DUAS.map(dua => <View key={dua.title} style={styles.duaCard}>
          <View style={styles.duaCardHeader}>
            <View style={[styles.duaIcon, dua.icon === 'moon' && styles.duaIconMoon, dua.icon === 'book' && styles.duaIconBook]}>
              {dua.icon === 'sunrise' ? <Sunrise size={18} color={colors.green} /> : dua.icon === 'moon' ? <Moon size={18} color="#653E00" /> : <GraduationCap size={18} color="#FFFFFF" />}
            </View>
            <View style={styles.duaCardTitleGroup}><Text style={styles.duaCardTitle}>{dua.title}</Text><Text style={styles.duaCardCategory}>{dua.source}</Text></View>
            <NativeAction label={data.savedDuas.includes(dua.title) ? 'Saqlangan' : 'Saqlash'} compact variant="text" onPress={() => toggleSavedDua(dua.title)} />
          </View>
          <Text style={[styles.duaArabic, { fontSize: data.arabicFontSize, lineHeight: data.arabicFontSize * 1.8 }]}>{dua.arabic}</Text>
          <View style={styles.duaLatinBox}><Text style={styles.duaLatin}>{dua.latin}</Text></View>
          <Text style={styles.duaMeaning}>{dua.meaning}</Text>
        </View>)}
        <NativeAction label="Barcha duolarni ko‘rish" onPress={() => router.navigate('/duas')} large variant="outlined" />
      </View>
    );
  }, [styles, colors.green, data.savedDuas, data.arabicFontSize, toggleSavedDua]);

  return (
      <Screen style={styles.screen} contentStyle={styles.content}>
        <View style={styles.page}>
          <NativeAction label="Kundalik Duolar" onPress={() => router.navigate('/duas')} large variant="outlined" />

          <LinearGradient colors={['#064E3B', '#003527']} start={{ x: 0.8, y: 0 }} end={{ x: 0.2, y: 1 }} style={styles.hero}>
            <View pointerEvents="none" style={styles.heroGlowTop} />
            <View pointerEvents="none" style={styles.heroGlowBottom} />
            <View style={styles.heroHeader}>
              <View style={{ flex: 1 }}><NativeSelect colorScheme="dark" value={selected.id}
                options={ZIKR.map(item => ({ value: item.id, label: item.name }))} onChange={selectZikr} /></View>
              <Switch accessibilityLabel="Har bosishda tebranish" value={data.tasbeehTapHaptics}
                onValueChange={setTasbeehTapHaptics} trackColor={{ true: MINT, false: '#708C7E' }} />
            </View>

            <View style={styles.phrase}>
              <Text style={styles.arabic}>{selected.arabic}</Text>
              <Text style={styles.meaning}>{selected.meaning}</Text>
            </View>

            <TasbeehCounter count={count} target={ROUND_TARGET} size={circleSize} onCount={countTasbeeh} zikrId={selected.id} />

            <View style={styles.roundPanel}>
              <NativeAction label="Orqaga" onPress={() => { undoTasbeeh(); setRoundNotice(''); }} compact variant="outlined" colorScheme="dark" />
              <View style={styles.roundSummary}>
                <Text style={styles.remainingText}>{remaining} ta qoldi</Text>
                <Text style={styles.roundCaption}>{(data.tasbeehRounds ?? 0) + 1}-davra • 33 talik marra</Text>
              </View>
              <NativeAction label="Qaytarish" onPress={resetTasbeeh} compact variant="outlined" colorScheme="dark" />
            </View>
            {roundNotice ? <Text accessibilityLiveRegion="polite" style={styles.roundNotice}>{roundNotice}</Text> : null}
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={styles.statCard}><CircleDot size={19} color={EMERALD} /><Text style={styles.statNumber}>{data.tasbeehTotal ?? 0}</Text><Text style={styles.statLabel}>Jami zikr</Text></View>
            <View style={styles.statCard}><RotateCw size={19} color={EMERALD} /><Text style={styles.statNumber}>{data.tasbeehRounds ?? 0}</Text><Text style={styles.statLabel}>To‘liq davra</Text></View>
            <View style={styles.statCard}><CalendarDays size={19} color={EMERALD} /><Text style={styles.statNumber}>{data.tasbeehStreak ?? 0} kun</Text><Text style={styles.statLabel}>Davomiylik</Text></View>
          </View>

          {recommendedDuas}
        </View>
      </Screen>
  );
}

const baseStyles = StyleSheet.create({
  screen: { backgroundColor: '#FAF9F5' },
  content: { gap: 0 },
  page: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 },
  hero: { borderRadius: 28, padding: 16, overflow: 'hidden', alignItems: 'center', gap: 13 },
  heroGlowTop: { position: 'absolute', top: -90, right: -65, width: 190, height: 190, borderRadius: 95, backgroundColor: '#1C80614D' },
  heroGlowBottom: { position: 'absolute', bottom: -100, left: -70, width: 190, height: 190, borderRadius: 95, backgroundColor: '#0A73564D' },
  heroHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  phrase: { alignItems: 'center', gap: 3, paddingHorizontal: 10 },
  arabic: { color: MINT, fontSize: 27, lineHeight: 43, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' },
  meaning: { color: '#95D3BA', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  roundPanel: { width: '100%', minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 7, borderRadius: 18, backgroundColor: '#00352799' },
  roundSummary: { flex: 1, alignItems: 'center', gap: 3 },
  remainingText: { color: MINT, fontSize: 17, fontWeight: '700' },
  roundCaption: { color: '#95D3BA', fontSize: 10 },
  roundNotice: { color: MINT, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, minHeight: 88, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 8 },
  statNumber: { color: INK, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statLabel: { color: MUTED, fontSize: 9, textAlign: 'center' },
  duasSection: { gap: 12 },
  duasHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  duasTitle: { ...Typography.sectionTitle, color: INK },
  duasSubtitle: { color: MUTED, fontSize: 11, marginTop: 3 },
  duaCard: { borderRadius: 20, backgroundColor: '#FFFFFF', padding: 14, gap: 11 },
  duaCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  duaIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#B0F0D6', alignItems: 'center', justifyContent: 'center' },
  duaIconMoon: { backgroundColor: '#FFDDB8' },
  duaIconBook: { backgroundColor: FOREST },
  duaCardTitleGroup: { flex: 1, gap: 2 },
  duaCardTitle: { color: INK, fontSize: 14, fontWeight: '700' },
  duaCardCategory: { color: MUTED, fontSize: 10 },
  duaArabic: { color: INK, fontSize: 21, lineHeight: 38, textAlign: 'right', writingDirection: 'rtl' },
  duaLatinBox: { backgroundColor: '#F4F4F0', borderRadius: 12, padding: 10 },
  duaLatin: { color: EMERALD, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  duaMeaning: { color: '#404944', fontSize: 12, lineHeight: 18 },
});
