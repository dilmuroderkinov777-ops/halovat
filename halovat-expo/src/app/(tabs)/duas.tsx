import { useThemedStyles, useThemeColors } from '../../ui/useAppTheme';
import { router } from 'expo-router';
import { BookOpen, CircleDot, GraduationCap, Heart, Moon, Sunrise } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../ui/AppText';
import { AppTopBar } from '../../components/AppTopBar';
import { Screen } from '../../components/Screen';
import { DUA_CATEGORIES, DUAS } from '../../data/duas';
import { useHalovat } from '../../context/AppContext';
const EMERALD = '#006C49';
const FOREST = '#003527';
const INK = '#1B1C1A';
const MUTED = '#707974';

export default function DuasScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { data, toggleSavedDua } = useHalovat();
  const [category, setCategory] = useState<typeof DUA_CATEGORIES[number]>('Barchasi');
  const visible = DUAS.map((dua, index) => ({ ...dua, index })).filter(dua => category === 'Barchasi' || dua.category === category);

  return (
    <Screen style={styles.screen} contentStyle={styles.content} header={<AppTopBar subtitle="Zikr Va Tasbeh" />}>
      <View style={styles.page}>
        <View style={styles.modeSwitch}>
          <Pressable accessibilityRole="button" accessibilityLabel="Raqamli tasbehga o‘tish" onPress={() => router.navigate('/(tabs)/tasbeeh' as never)} style={styles.modeItem}>
            <CircleDot size={16} color="#404944" /><Text style={styles.modeText}>Raqamli Tasbeh</Text>
          </Pressable>
          <View style={[styles.modeItem, styles.modeActive]}>
            <BookOpen size={16} color="#FFFFFF" /><Text style={[styles.modeText, styles.modeTextActive]}>Kundalik Duolar</Text>
          </View>
        </View>

        <View style={styles.heading}>
          <View style={styles.headingLeft}>
            <View style={styles.headingText}>
              <Text style={styles.title}>Tavsiya etilgan duolar</Text>
              <Text style={styles.subtitle}>Qur&apos;on va sunnatdagi muhim zikrlar</Text>
            </View>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filters}>
          {DUA_CATEGORIES.map(item => (
            <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === category }} onPress={() => setCategory(item)} style={[styles.filterChip, item === category && styles.filterChipActive]}>
              <Text style={[styles.filterText, item === category && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {visible.map(dua => {
          const isSaved = data.savedDuas.includes(dua.title);
          return (
            <View key={dua.title} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeading}>
                  <View style={[styles.iconCircle, dua.icon === 'moon' && styles.iconMoon, dua.icon === 'book' && styles.iconBook]}>
                    {dua.icon === 'sunrise' ? <Sunrise size={19} color={colors.green} /> : dua.icon === 'moon' ? <Moon size={19} color="#653E00" /> : <GraduationCap size={19} color="#95D3BA" />}
                  </View>
                  <View style={styles.cardHeadingText}>
                    <Text style={styles.cardTitle}>{dua.title}</Text>
                    <Text style={styles.cardCategory}>{dua.source}</Text>
                  </View>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel={isSaved ? dua.title + ' saqlanganlardan olib tashlash' : dua.title + ' saqlash'} accessibilityState={{ selected: isSaved }} onPress={() => toggleSavedDua(dua.title)} style={styles.saveButton}>
                  <Heart size={20} color={isSaved ? '#BA1A1A' : MUTED} fill={isSaved ? '#BA1A1A' : 'transparent'} />
                </Pressable>
              </View>
              <Text style={[styles.arabic, { fontSize: data.arabicFontSize, lineHeight: data.arabicFontSize * 1.8 }]}>{dua.arabic}</Text>
              <View style={styles.transliteration}><Text style={styles.latin}>{dua.latin}</Text></View>
              <Text style={styles.meaning}>{dua.meaning}</Text>
            </View>
          );
        })}
        <Text style={styles.note}>Duolar va ma’nolari ma’lumot sifatida berilgan.</Text>
      </View>
    </Screen>
  );
}

const baseStyles = StyleSheet.create({
  screen: { backgroundColor: '#FAF9F5' },
  content: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 30, gap: 0 },
  page: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 17 },
  modeSwitch: { flexDirection: 'row', backgroundColor: '#EFEEEA', borderRadius: 24, padding: 4, gap: 2 },
  modeItem: { flex: 1, minHeight: 39, borderRadius: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modeActive: { backgroundColor: FOREST },
  modeText: { color: '#404944', fontSize: 12, fontWeight: '600' },
  modeTextActive: { color: '#FFFFFF' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingLeft: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFEEEA', alignItems: 'center', justifyContent: 'center' },
  headingText: { flex: 1 },
  title: { color: INK, fontSize: 19, fontWeight: '700' },
  subtitle: { color: MUTED, fontSize: 11, marginTop: 3 },
  filterScroll: { flexGrow: 0, marginRight: -16 },
  filters: { gap: 8, paddingRight: 16 },
  filterChip: { minHeight: 31, borderRadius: 17, backgroundColor: '#EFEEEA', paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { backgroundColor: EMERALD },
  filterText: { color: '#404944', fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, gap: 13 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconCircle: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#B0F0D6', alignItems: 'center', justifyContent: 'center' },
  iconMoon: { backgroundColor: '#FFDDB8' },
  iconBook: { backgroundColor: '#064E3B' },
  cardHeadingText: { flex: 1, gap: 3 },
  cardTitle: { color: INK, fontSize: 15, fontWeight: '700' },
  cardCategory: { color: MUTED, fontSize: 10 },
  saveButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4F4F0', alignItems: 'center', justifyContent: 'center' },
  arabic: { color: INK, fontSize: 23, lineHeight: 42, textAlign: 'right', writingDirection: 'rtl', paddingVertical: 2 },
  transliteration: { backgroundColor: '#F4F4F0', borderRadius: 13, padding: 11 },
  latin: { color: EMERALD, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  meaning: { color: '#404944', fontSize: 13, lineHeight: 21 },
  note: { color: MUTED, fontSize: 10, lineHeight: 16, textAlign: 'center', paddingTop: 1 },
});
