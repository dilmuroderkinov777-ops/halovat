import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';
import { Typography } from '../ui/theme';
import { router } from 'expo-router';
import { GraduationCap, Moon, Sunrise } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/AppText';
import { NativeAction } from '../components/NativeAction';
import { NativeSegments } from '../components/NativeSegments';
import { NativeSelect } from '../components/NativeSelect';
import { Screen } from '../components/Screen';
import { DUA_CATEGORIES, DUAS } from '../data/duas';
import { useHalovat } from '../context/AppContext';
const EMERALD = '#006C49';
const INK = '#1B1C1A';
const MUTED = '#707974';

export default function DuasScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { data, toggleSavedDua } = useHalovat();
  const [category, setCategory] = useState<typeof DUA_CATEGORIES[number]>('Barchasi');
  const visible = DUAS.map((dua, index) => ({ ...dua, index })).filter(dua => category === 'Barchasi' || dua.category === category);

  return (
    <Screen style={styles.screen} contentStyle={styles.content}>
      <View style={styles.page}>
        <NativeSegments value="duas" options={[{ value: 'tasbeeh', label: 'Raqamli Tasbeh' }, { value: 'duas', label: 'Kundalik Duolar' }]}
          onChange={value => { if (value === 'tasbeeh') router.navigate('/(tabs)/tasbeeh'); }} />

        <View style={styles.heading}>
          <View style={styles.headingLeft}>
            <View style={styles.headingText}>
              <Text style={styles.title}>Tavsiya etilgan duolar</Text>
              <Text style={styles.subtitle}>Qur&apos;on va sunnatdagi muhim zikrlar</Text>
            </View>
          </View>
        </View>

        <NativeSelect value={category} options={DUA_CATEGORIES.map(value => ({ value, label: value }))} onChange={setCategory} />

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
                <NativeAction label={isSaved ? 'Saqlangan' : 'Saqlash'} compact variant="text" onPress={() => toggleSavedDua(dua.title)} />
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
  content: { gap: 0 },
  page: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 17 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headingLeft: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1 },
  headingText: { flex: 1 },
  title: { ...Typography.sectionTitle, color: INK },
  subtitle: { color: MUTED, fontSize: 11, marginTop: 3 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 22, padding: 16, gap: 13 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardHeading: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconCircle: { width: 35, height: 35, borderRadius: 18, backgroundColor: '#B0F0D6', alignItems: 'center', justifyContent: 'center' },
  iconMoon: { backgroundColor: '#FFDDB8' },
  iconBook: { backgroundColor: '#064E3B' },
  cardHeadingText: { flex: 1, gap: 3 },
  cardTitle: { color: INK, fontSize: 15, fontWeight: '700' },
  cardCategory: { color: MUTED, fontSize: 10 },
  arabic: { color: INK, fontSize: 23, lineHeight: 42, textAlign: 'right', writingDirection: 'rtl', paddingVertical: 2 },
  transliteration: { backgroundColor: '#F4F4F0', borderRadius: 13, padding: 11 },
  latin: { color: EMERALD, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  meaning: { color: '#404944', fontSize: 13, lineHeight: 21 },
  note: { color: MUTED, fontSize: 10, lineHeight: 16, textAlign: 'center', paddingTop: 1 },
});
