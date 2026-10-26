import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';
import { GraduationCap, Moon, Sunrise } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
import { Text } from '../ui/AppText';
import { NativeAction } from '../components/NativeAction';
import { NativeSelect } from '../components/NativeSelect';
import { Screen } from '../components/Screen';
import { DUA_CATEGORIES, DUAS, type Dua } from '../data/duas';
import { useHalovat } from '../context/AppContext';
const EMERALD = '#006C49';
const INK = '#1B1C1A';
const MUTED = '#707974';
type DuaCategory = typeof DUA_CATEGORIES[number];
const categoryOptions = DUA_CATEGORIES.map(value => ({ value, label: value }));
const duaKey = (dua: Dua) => dua.title;

export default function DuasScreen() {
  const styles = useThemedStyles(baseStyles);
  const { data, toggleSavedDua } = useHalovat();
  const [category, setCategory] = useState<DuaCategory>('Barchasi');
  const listRef = useRef<FlatList<Dua>>(null);
  const visible = useMemo(() => DUAS.filter(dua => category === 'Barchasi' || dua.category === category), [category]);
  const changeCategory = useCallback((value: DuaCategory) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setCategory(value);
  }, []);
  const renderDua = useCallback(({ item }: ListRenderItemInfo<Dua>) => (
    <DuaCard dua={item} isSaved={data.savedDuas.includes(item.title)} arabicFontSize={data.arabicFontSize} onToggleSaved={toggleSavedDua} />
  ), [data.savedDuas, data.arabicFontSize, toggleSavedDua]);

  return (
    <Screen scroll={false} style={styles.screen} contentStyle={styles.content}>
      <FlatList
        ref={listRef}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        contentInsetAdjustmentBehavior="automatic"
        data={visible}
        keyExtractor={duaKey}
        renderItem={renderDua}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={5}
        removeClippedSubviews={false}
        ListHeaderComponent={<View style={styles.listHeader}>
          <NativeSelect value={category} options={categoryOptions} onChange={changeCategory} />
        </View>}
        ItemSeparatorComponent={DuaSeparator}
        ListFooterComponent={<Text style={styles.note}>Duolar va ma’nolari ma’lumot sifatida berilgan.</Text>}
      />
    </Screen>
  );
}

const DuaCard = memo(function DuaCard({ dua, isSaved, arabicFontSize, onToggleSaved }: {
  dua: Dua; isSaved: boolean; arabicFontSize: number; onToggleSaved: (title: string) => void;
}) {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  return (
    <View style={styles.card}>
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
        <NativeAction label={isSaved ? 'Saqlangan' : 'Saqlash'} compact variant="text" onPress={() => onToggleSaved(dua.title)} />
      </View>
      <Text style={[styles.arabic, { fontSize: arabicFontSize, lineHeight: arabicFontSize * 1.8 }]}>{dua.arabic}</Text>
      <View style={styles.transliteration}><Text style={styles.latin}>{dua.latin}</Text></View>
      <Text style={styles.meaning}>{dua.meaning}</Text>
    </View>
  );
});

function DuaSeparator() {
  return <View style={baseStyles.separator} />;
}

const baseStyles = StyleSheet.create({
  screen: { backgroundColor: '#FAF9F5' },
  content: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0 },
  list: { flex: 1, width: '100%' },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  listHeader: { paddingBottom: 17 },
  separator: { height: 17 },
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
  note: { color: MUTED, fontSize: 10, lineHeight: 16, textAlign: 'center', paddingTop: 18 },
});
