import { useThemedStyles, useThemeColors } from '../../ui/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ArrowRight, BookOpen, ChevronDown, CircleDot, GraduationCap, Hand, Heart, Moon, RotateCcw, RotateCw, Sparkles, Sunrise, Vibrate } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../ui/AppText';
import Svg, { Circle } from 'react-native-svg';
import { Screen } from '../../components/Screen';
import { useHalovat } from '../../context/AppContext';
import { DUA_CATEGORIES, DUAS } from '../../data/duas';
import { ROUND_TARGET, ZIKR } from '../../data/zikr';
const EMERALD = '#006C49';
const FOREST = '#003527';
const MINT = '#6FFBBE';
const INK = '#1B1C1A';
const MUTED = '#707974';

export default function TasbeehScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const { data, setTasbeehId, countTasbeeh, resetTasbeeh, undoTasbeeh, setTasbeehTapHaptics, toggleSavedDua } = useHalovat();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [roundNotice, setRoundNotice] = useState('');
  const [duaCategory, setDuaCategory] = useState<typeof DUA_CATEGORIES[number]>('Barchasi');
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticedRounds = useRef(data.tasbeehRounds);
  const selectedIndex = Math.max(0, ZIKR.findIndex(item => item.id === data.tasbeehId));
  const selected = ZIKR[selectedIndex];
  const count = Math.min(data.tasbeehCounts[selected.id] ?? 0, ROUND_TARGET);
  const progress = count / ROUND_TARGET;
  const remaining = ROUND_TARGET - count;
  const circleSize = Math.min(width - 88, 264);
  const radius = circleSize / 2 - 11;
  const circumference = 2 * Math.PI * radius;
  const visibleDuas = DUAS.filter(dua => duaCategory === 'Barchasi' || dua.category === duaCategory);

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
    setPickerOpen(false);
  };

  return (
    <>
      <Screen style={styles.screen} contentStyle={styles.content}>
        <View style={styles.page}>
          <View style={styles.modeSwitch}>
            <View style={[styles.modeItem, styles.modeActive]}>
              <CircleDot size={16} color="#FFFFFF" />
              <Text style={[styles.modeText, styles.modeTextActive]}>Raqamli Tasbeh</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Kundalik duolarga o‘tish" onPress={() => router.push('/duas' as never)} style={styles.modeItem}>
              <BookOpen size={16} color="#404944" />
              <Text style={styles.modeText}>Kundalik Duolar</Text>
            </Pressable>
          </View>

          <LinearGradient colors={['#064E3B', '#003527']} start={{ x: 0.8, y: 0 }} end={{ x: 0.2, y: 1 }} style={styles.hero}>
            <View pointerEvents="none" style={styles.heroGlowTop} />
            <View pointerEvents="none" style={styles.heroGlowBottom} />
            <View style={styles.heroHeader}>
              <Pressable accessibilityRole="button" accessibilityLabel={'Zikr tanlangan: ' + selected.name + '. Zikrni almashtirish'} onPress={() => setPickerOpen(true)} style={styles.zikrSelector}>
                <Sparkles size={16} color={MINT} />
                <Text numberOfLines={1} style={styles.selectorText}>{selected.name}</Text>
                <ChevronDown size={17} color="#95D3BA" />
              </Pressable>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: data.tasbeehTapHaptics }} accessibilityLabel="Har bosishda tebranish" onPress={() => setTasbeehTapHaptics(!data.tasbeehTapHaptics)} style={styles.heroMark}><Vibrate size={18} color={data.tasbeehTapHaptics ? MINT : '#708C7E'} /></Pressable>
            </View>

            <View style={styles.phrase}>
              <Text style={styles.arabic}>{selected.arabic}</Text>
              <Text style={styles.meaning}>{selected.meaning}</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={styles.chipRow}>
              {ZIKR.map(item => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === selected.id }} onPress={() => selectZikr(item.id)} style={[styles.zikrChip, item.id === selected.id && styles.zikrChipActive]}>
                  <Text style={[styles.zikrChipText, item.id === selected.id && styles.zikrChipTextActive]}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable accessibilityRole="button" accessibilityLabel={'Tasbeh sanash: ' + count + ' / ' + ROUND_TARGET} accessibilityHint="Sanash uchun teging. 33 ga yetganda tebranish beradi va navbatdagi zikrga o‘tadi." onPress={countTasbeeh} style={({ pressed }) => [styles.counter, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }, pressed && styles.counterPressed]}>
              <Svg pointerEvents="none" width={circleSize} height={circleSize} style={StyleSheet.absoluteFill}>
                <Circle cx={circleSize / 2} cy={circleSize / 2} r={circleSize / 2 - 26} fill={FOREST} stroke="#146148" strokeWidth={1} />
                <Circle cx={circleSize / 2} cy={circleSize / 2} r={radius} fill="none" stroke="#003527" strokeWidth={10} />
                <Circle cx={circleSize / 2} cy={circleSize / 2} r={radius} fill="none" stroke="#4EDEA3" strokeWidth={10} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} transform={'rotate(-90 ' + circleSize / 2 + ' ' + circleSize / 2 + ')'} />
              </Svg>
              <View pointerEvents="none" style={styles.counterText}>
                <Text style={styles.countNumber}>{count}</Text>
                <Text style={styles.countTarget}>/ {ROUND_TARGET}</Text>
                <View style={styles.tapRow}><Hand size={16} color="#95D3BA" /><Text style={styles.tapText}>SANASH UCHUN TEGING</Text></View>
              </View>
            </Pressable>

            <View style={styles.roundPanel}>
              <Pressable accessibilityRole="button" accessibilityLabel="Oxirgi sanashni bekor qilish" onPress={() => { undoTasbeeh(); setRoundNotice(''); }} style={styles.panelAction}>
                <RotateCcw size={21} color="#95D3BA" />
                <Text style={styles.panelLabel}>Orqaga</Text>
              </Pressable>
              <View style={styles.roundSummary}>
                <Text style={styles.remainingText}>{remaining} ta qoldi</Text>
                <Text style={styles.roundCaption}>{(data.tasbeehRounds ?? 0) + 1}-davra • 33 talik marra</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Hozirgi zikr hisobini nolga qaytarish" onPress={resetTasbeeh} style={styles.panelAction}>
                <RotateCw size={21} color="#95D3BA" />
                <Text style={styles.panelLabel}>Qaytarish</Text>
              </Pressable>
            </View>
            {roundNotice ? <Text accessibilityLiveRegion="polite" style={styles.roundNotice}>{roundNotice}</Text> : null}
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={styles.statCard}><CircleDot size={19} color={EMERALD} /><Text style={styles.statNumber}>{data.tasbeehTotal ?? 0}</Text><Text style={styles.statLabel}>Jami zikr</Text></View>
            <View style={styles.statCard}><RotateCw size={19} color={EMERALD} /><Text style={styles.statNumber}>{data.tasbeehRounds ?? 0}</Text><Text style={styles.statLabel}>To‘liq davra</Text></View>
            <View style={styles.statCard}><Sparkles size={19} color={EMERALD} /><Text style={styles.statNumber}>{data.tasbeehStreak ?? 0} kun</Text><Text style={styles.statLabel}>Davomiylik</Text></View>
          </View>

          <View style={styles.duasSection}>
            <View style={styles.duasHeading}>
              <View><Text style={styles.duasTitle}>Tavsiya etilgan duolar</Text><Text style={styles.duasSubtitle}>Qur’on va sunnatdagi muhim zikrlar</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel="Barcha duolarni ko‘rish" onPress={() => router.push('/duas' as never)} style={styles.allDuas}>
                <Text style={styles.allDuasText}>Barchasi</Text><ArrowRight size={15} color={EMERALD} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.duaFilterScroll} contentContainerStyle={styles.duaFilters}>
              {DUA_CATEGORIES.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === duaCategory }} onPress={() => setDuaCategory(item)} style={[styles.duaFilter, item === duaCategory && styles.duaFilterActive]}><Text style={[styles.duaFilterText, item === duaCategory && styles.duaFilterTextActive]}>{item}</Text></Pressable>)}
            </ScrollView>
            {visibleDuas.map(dua => <View key={dua.title} style={styles.duaCard}>
              <View style={styles.duaCardHeader}>
                <View style={[styles.duaIcon, dua.icon === 'moon' && styles.duaIconMoon, dua.icon === 'book' && styles.duaIconBook]}>
                  {dua.icon === 'sunrise' ? <Sunrise size={18} color={colors.green} /> : dua.icon === 'moon' ? <Moon size={18} color="#653E00" /> : <GraduationCap size={18} color="#FFFFFF" />}
                </View>
                <View style={styles.duaCardTitleGroup}><Text style={styles.duaCardTitle}>{dua.title}</Text><Text style={styles.duaCardCategory}>{dua.source}</Text></View>
                <Pressable accessibilityRole="button" accessibilityLabel={dua.title + ' saqlash'} accessibilityState={{ selected: data.savedDuas.includes(dua.title) }} onPress={() => toggleSavedDua(dua.title)} hitSlop={8}><Heart size={20} color={data.savedDuas.includes(dua.title) ? '#BA1A1A' : MUTED} fill={data.savedDuas.includes(dua.title) ? '#BA1A1A' : 'transparent'} /></Pressable>
              </View>
              <Text style={[styles.duaArabic, { fontSize: data.arabicFontSize, lineHeight: data.arabicFontSize * 1.8 }]}>{dua.arabic}</Text>
              <View style={styles.duaLatinBox}><Text style={styles.duaLatin}>{dua.latin}</Text></View>
              <Text style={styles.duaMeaning}>{dua.meaning}</Text>
            </View>)}
          </View>
        </View>
      </Screen>

      <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable accessibilityLabel="Yopish" onPress={() => setPickerOpen(false)} style={styles.modalDismiss} />
          <View style={styles.pickerSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Zikr turini tanlang</Text>
            {ZIKR.map(item => {
              const active = item.id === selected.id;
              return (
                <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => selectZikr(item.id)} style={[styles.optionRow, active && styles.optionRowActive]}>
                  <View style={styles.optionText}>
                    <Text style={styles.optionName}>{item.name}</Text>
                    <Text style={styles.optionMeaning}>{ROUND_TARGET} marotaba · {item.meaning}</Text>
                  </View>
                  <Text style={styles.optionArabic}>{item.arabic}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}

const baseStyles = StyleSheet.create({
  screen: { backgroundColor: '#FAF9F5' },
  content: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 30, gap: 0 },
  page: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 18 },
  modeSwitch: { flexDirection: 'row', backgroundColor: '#EFEEEA', borderRadius: 24, padding: 4, gap: 2 },
  modeItem: { flex: 1, minHeight: 39, borderRadius: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modeActive: { backgroundColor: FOREST },
  modeText: { color: '#404944', fontSize: 12, fontWeight: '600' },
  modeTextActive: { color: '#FFFFFF' },
  hero: { borderRadius: 28, padding: 16, overflow: 'hidden', alignItems: 'center', gap: 13 },
  heroGlowTop: { position: 'absolute', top: -90, right: -65, width: 190, height: 190, borderRadius: 95, backgroundColor: '#1C80614D' },
  heroGlowBottom: { position: 'absolute', bottom: -100, left: -70, width: 190, height: 190, borderRadius: 95, backgroundColor: '#0A73564D' },
  heroHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  zikrSelector: { minHeight: 36, maxWidth: '82%', flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#003527BB', borderRadius: 20, paddingHorizontal: 12 },
  selectorText: { flexShrink: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  heroMark: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#003527BB' },
  phrase: { alignItems: 'center', gap: 3, paddingHorizontal: 10 },
  arabic: { color: MINT, fontSize: 27, lineHeight: 43, fontWeight: '600', textAlign: 'center', writingDirection: 'rtl' },
  meaning: { color: '#95D3BA', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  chipScroll: { width: '100%', flexGrow: 0 },
  chipRow: { alignItems: 'center', gap: 7, paddingVertical: 3 },
  zikrChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 17, backgroundColor: '#003527AA' },
  zikrChipActive: { backgroundColor: EMERALD },
  zikrChipText: { color: '#D7F0E3', fontSize: 11, fontWeight: '600' },
  zikrChipTextActive: { color: '#FFFFFF' },
  counter: { alignItems: 'center', justifyContent: 'center' },
  counterPressed: { transform: [{ scale: 0.98 }], opacity: 0.94 },
  counterText: { alignItems: 'center' },
  countNumber: { color: MINT, fontSize: 65, lineHeight: 72, fontWeight: '700', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  countTarget: { color: '#95D3BA', fontSize: 18, fontWeight: '600' },
  tapRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  tapText: { color: '#95D3BA', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  roundPanel: { width: '100%', minHeight: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 7, borderRadius: 18, backgroundColor: '#00352799' },
  panelAction: { width: 70, alignItems: 'center', justifyContent: 'center', gap: 5 },
  panelLabel: { color: '#95D3BA', fontSize: 9, textAlign: 'center' },
  roundSummary: { flex: 1, alignItems: 'center', gap: 3 },
  remainingText: { color: MINT, fontSize: 17, fontWeight: '700' },
  roundCaption: { color: '#95D3BA', fontSize: 10 },
  roundNotice: { color: MINT, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, minHeight: 88, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', gap: 5, padding: 8 },
  statNumber: { color: INK, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  nextZikrStat: { fontSize: 12, maxWidth: '100%' },
  statLabel: { color: MUTED, fontSize: 9, textAlign: 'center' },
  duasSection: { gap: 12 },
  duasHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  duasTitle: { color: INK, fontSize: 18, fontWeight: '700' },
  duasSubtitle: { color: MUTED, fontSize: 11, marginTop: 3 },
  allDuas: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  allDuasText: { color: EMERALD, fontSize: 12, fontWeight: '700' },
  duaFilterScroll: { flexGrow: 0, marginRight: -16 },
  duaFilters: { gap: 7, paddingRight: 16 },
  duaFilter: { minHeight: 31, borderRadius: 17, backgroundColor: '#EFEEEA', paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  duaFilterActive: { backgroundColor: EMERALD },
  duaFilterText: { color: '#404944', fontSize: 11, fontWeight: '600' },
  duaFilterTextActive: { color: '#FFFFFF' },
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
  modalRoot: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#1B1C1A99' },
  modalDismiss: { ...StyleSheet.absoluteFill },
  pickerSheet: { width: '100%', maxWidth: 440, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#FAF9F5' },
  sheetHandle: { width: 46, height: 5, borderRadius: 3, backgroundColor: '#BFC9C3', alignSelf: 'center', marginBottom: 17 },
  sheetTitle: { color: INK, fontSize: 19, fontWeight: '700', marginBottom: 10 },
  optionRow: { minHeight: 63, borderRadius: 16, backgroundColor: '#F4F4F0', marginBottom: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  optionRowActive: { backgroundColor: '#DDF8E8' },
  optionText: { flex: 1, gap: 4 },
  optionName: { color: INK, fontSize: 14, fontWeight: '700' },
  optionMeaning: { color: MUTED, fontSize: 10 },
  optionArabic: { color: EMERALD, fontSize: 15, writingDirection: 'rtl' },
});
