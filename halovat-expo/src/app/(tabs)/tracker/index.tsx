import { useThemedStyles } from '../../../ui/useAppTheme';
import { Typography } from '../../../ui/theme';
import { BookOpen, CalendarDays, Check, CheckCircle2, Flame, History, Info, Minus, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../../../ui/AppText';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { NativeCalendar } from '../../../components/NativeCalendar';
import { NativeAction } from '../../../components/NativeAction';
import { NativeSegments } from '../../../components/NativeSegments';
import { NativeSheet } from '../../../components/NativeSheet';
import { Screen } from '../../../components/Screen';
import { useHalovat } from '../../../context/AppContext';
import { dateKey, formatUzDate, formatUzShortMonth, PRAYERS, prayerKey, startOfWeek } from '../../../domain/prayers';

type Period = 'week' | 'month' | 'year';

const PERIODS: { id: Period; title: string }[] = [
  { id: 'week', title: 'Hafta' },
  { id: 'month', title: 'Oy' },
  { id: 'year', title: 'Yil' },
];
const DAY_NAMES = ['Du', 'Se', 'Cho', 'Pay', 'Ju', 'Sha', 'Ya'];
const RING_SIZE = 112;
const EMERALD = '#006C49';
const FOREST = '#003527';
const INK = '#1B1C1A';
const MUTED = '#707974';

function asDate(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export default function TrackerScreen() {
  const styles = useThemedStyles(baseStyles);
  const { width } = useWindowDimensions();
  const RING_SIZE = Math.min(112, (Math.min(width, 440) - 44) * 5 / 12 - 20);
  const RING_RADIUS = RING_SIZE / 2 - 8;
  const CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const { data, now, togglePrayerStatus, setPrayerStatus } = useHalovat();
  const [period, setPeriod] = useState<Period>('week');
  const [selectedDate, setSelectedDate] = useState(() => new Date(now));
  const [qazoOpen, setQazoOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const monday = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
  const todayKey = dateKey(now);
  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const groups = useMemo(() => {
    if (period === 'week') {
      return days.map((day, index) => ({
        label: DAY_NAMES[index],
        done: PRAYERS.filter(prayer => data.prayerStatus[prayerKey(day, prayer.id)] === 'done').length,
        possible: PRAYERS.length,
      }));
    }
    if (period === 'month') {
      const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
      return Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, index) => {
        const from = index * 7 + 1;
        const to = Math.min(daysInMonth, from + 6);
        let done = 0;
        for (let day = from; day <= to; day++) {
          for (const prayer of PRAYERS) {
            if (data.prayerStatus[prayerKey(new Date(currentYear, currentMonth, day), prayer.id)] === 'done') done++;
          }
        }
        return { label: String(index + 1), done, possible: (to - from + 1) * PRAYERS.length };
      });
    }
    return Array.from({ length: 12 }, (_, month) => {
      const daysInMonth = new Date(currentYear, month + 1, 0).getDate();
      let done = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        for (const prayer of PRAYERS) {
          if (data.prayerStatus[prayerKey(new Date(currentYear, month, day), prayer.id)] === 'done') done++;
        }
      }
      return { label: formatUzShortMonth(new Date(currentYear, month, 1)), done, possible: daysInMonth * PRAYERS.length };
    });
  }, [period, days, data.prayerStatus, currentYear, currentMonth]);

  const totalDone = groups.reduce((sum, item) => sum + item.done, 0);
  const totalPossible = groups.reduce((sum, item) => sum + item.possible, 0);
  const percent = totalPossible ? Math.round(totalDone * 100 / totalPossible) : 0;
  const fullDays = days.filter(day => dateKey(day) <= todayKey && PRAYERS.every(prayer => data.prayerStatus[prayerKey(day, prayer.id)] === 'done')).length;
  const completedDays = days.filter(day => dateKey(day) <= todayKey).length;
  const missed = Object.entries(data.prayerStatus)
    .filter(([, status]) => status === 'missed')
    .map(([key]) => {
      const [day, prayerId] = key.split(':');
      return { key, date: asDate(day), prayer: PRAYERS.find(item => item.id === prayerId)! };
    })
    .filter(entry => entry.prayer)
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  let streak = 0;
  for (let offset = 0; offset < 366; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const complete = PRAYERS.every(prayer => data.prayerStatus[prayerKey(day, prayer.id)] === 'done');
    if (!complete && offset === 0) continue;
    if (!complete) break;
    streak++;
  }
  const markDone = (key: string) => {
    const [day, prayer] = key.split(':');
    setPrayerStatus(asDate(day), prayer as typeof PRAYERS[number]['id'], 'done');
  };
  const nextMonday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 7);
  const canGoForward = dateKey(nextMonday) <= todayKey;
  const changeWeek = (direction: -1 | 1) => {
    const next = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 7 * direction);
    setSelectedDate(dateKey(next) > todayKey ? new Date(now) : next);
  };
  const range = formatUzDate(days[0]) + ' – ' + formatUzDate(days[6]);
  const chartTitle = period === 'week' ? 'Haftalik natija' : period === 'month' ? 'Oylik natija' : 'Yillik natija';

  return (
    <Screen style={styles.screen} contentStyle={styles.content}>
      <View style={styles.page}>
        <NativeSegments value={period} options={PERIODS.map(item => ({ value: item.id, label: item.title }))} onChange={setPeriod} />

        <View style={styles.dateSection}>
          <View style={styles.dateHeader}>
            <View style={styles.dateRange}>
              <CalendarDays size={16} color={EMERALD} />
              <Text style={styles.dateRangeText} numberOfLines={1}>{range}</Text>
            </View>
            <View style={styles.dateNav}>
              <NativeAction label="▦" translate={false} accessibilityLabel="Sana tanlash" compact onPress={() => setCalendarOpen(true)} />
              <NativeAction label="‹" translate={false} accessibilityLabel="Oldingi hafta" compact onPress={() => changeWeek(-1)} />
              <NativeAction label="›" translate={false} accessibilityLabel="Keyingi hafta" compact disabled={!canGoForward} onPress={() => changeWeek(1)} />
            </View>
          </View>
          <View style={styles.dayStrip}>
            {days.map((day, index) => {
              const today = dateKey(day) === todayKey;
              const statuses = PRAYERS.map(prayer => data.prayerStatus[prayerKey(day, prayer.id)]);
              const hasMissed = statuses.includes('missed');
              const hasDone = statuses.includes('done');
              return <View key={dateKey(day)} style={[styles.dayItem, index === 4 && styles.fridayDay, today && styles.todayDay]}>
                <Text style={[styles.dayName, index === 4 && styles.fridayText, today && styles.todayText]}>{today ? 'Bugun' : DAY_NAMES[index]}</Text>
                <Text style={[styles.dayNumber, index === 4 && styles.fridayText, today && styles.todayText]}>{day.getDate()}</Text>
                <View style={[styles.dayDot, hasDone && styles.dayDotDone, hasMissed && styles.dayDotMissed, today && !hasMissed && styles.dayDotToday]} />
              </View>;
            })}
          </View>
        </View>

        <View style={styles.matrixCard}>
          <View style={styles.matrixHeading}>
            <View style={styles.matrixHeadingLeft}>
              <View style={styles.matrixIcon}><CheckCircle2 size={17} color={EMERALD} /></View>
              <Text style={styles.cardTitle}>Haftalik belgilash</Text>
            </View>
            <Text style={styles.tapHint}>Katakka bosing</Text>
          </View>
          <View style={styles.matrixHeader}>
            <Text style={styles.prayerColumnHeader}>Namoz</Text>
            {DAY_NAMES.map((name, index) => <Text key={name} style={[styles.weekdayHeader, index === 4 && styles.fridayText]}>{name}{'\n'}{days[index].getDate()}</Text>)}
          </View>
          {PRAYERS.map(prayer => (
            <View key={prayer.id} style={styles.matrixRow}>
              <View style={styles.prayerLabel}>
                <View style={[styles.prayerDot, { backgroundColor: prayer.color }]} />
                <Text numberOfLines={1} style={styles.prayerName}>{prayer.name}</Text>
              </View>
              {days.map(day => {
                const status = data.prayerStatus[prayerKey(day, prayer.id)];
                return (
                  <View key={dateKey(day)} style={styles.cellSlot}>
                    <Pressable accessibilityRole="button" accessibilityLabel={prayer.name + ', ' + formatUzDate(day) + ': ' + (status === 'done' ? 'o‘qildi' : status === 'missed' ? 'qazo' : 'belgilanmagan')} onPress={() => togglePrayerStatus(day, prayer.id)} style={[styles.statusBubble, status === 'done' && styles.statusDone, status === 'missed' && styles.statusMissed]}>
                      {status === 'done' ? <Check size={16} color="#FFFFFF" strokeWidth={2.5} /> : status === 'missed' ? <X size={15} color="#FFFFFF" strokeWidth={2.5} /> : <Minus size={13} color={MUTED} strokeWidth={2.2} />}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.statusDone]} /><Text style={styles.legendLabel}>O‘qildi</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.statusMissed]} /><Text style={styles.legendLabel}>Qazo</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, styles.statusEmpty]} /><Text style={styles.legendLabel}>Kutilmoqda</Text></View>
          </View>
        </View>

        <View style={styles.resultsSection}>
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>{chartTitle}</Text>
            <Text style={styles.percentSummary}>{percent}% yakunlandi</Text>
          </View>
          <View style={styles.summaryRow}>
          <View style={styles.progressCard}>
            <View style={[styles.ringWrap, { width: RING_SIZE, height: RING_SIZE }]}>
              <Svg width={RING_SIZE} height={RING_SIZE} viewBox={'0 0 ' + RING_SIZE + ' ' + RING_SIZE}>
                <SvgCircle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke="#EFEEEA" strokeWidth="9" fill="none" />
                <SvgCircle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} stroke={EMERALD} strokeWidth="9" strokeLinecap="round" fill="none" strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)} transform={'rotate(-90 ' + RING_SIZE / 2 + ' ' + RING_SIZE / 2 + ')'} />
              </Svg>
              <View style={styles.ringCenter}><Text style={styles.ringCount}>{totalDone}</Text><Text style={styles.ringTotal}>/ {totalPossible} namoz</Text></View>
            </View>
            <Text style={styles.progressLabel}>Bajarilish darajasi</Text>
          </View>
          <View style={styles.trendCard}>
            <View style={styles.trendHeader}>
              <Text style={styles.trendTitle}>{period === 'week' ? 'Kunlik taqsimot' : period === 'month' ? 'Haftalik taqsimot' : 'Oylik taqsimot'}</Text>
              {period === 'week' ? <Text style={styles.trendPill}>{fullDays} / {completedDays} to‘liq kun</Text> : <Text style={styles.trendPill}>{totalDone} / {totalPossible}</Text>}
            </View>
            <View style={styles.bars}>
              {groups.map((item, index) => (
                <View key={item.label + index} style={styles.barColumn}>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { height: `${item.possible ? Math.round(item.done / item.possible * 100) : 0}%` as `${number}%` }]} />
                  </View>
                  <Text numberOfLines={1} style={styles.barLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.streakBanner}><View style={styles.streakIcon}><Flame size={14} color="#FFB95F" /></View><Text numberOfLines={1} style={styles.streakText}>{streak ? `Ajoyib! ${streak} kunlik uzluksiz namoz silsilasi.` : 'Namoz silsilasini boshlang'}</Text></View>
          </View>
          </View>
        </View>

        <View style={styles.qazoCard}>
          <View style={styles.qazoHeader}>
            <View style={styles.qazoHeaderLeft}>
              <View style={styles.qazoHeaderIcon}><History size={19} color="#BA1A1A" /></View>
              <View><Text style={styles.cardTitle}>Qazo namozlar</Text><Text style={styles.qazoSubtitle}>Qarzlarni o‘z vaqtida ado eting</Text></View>
            </View>
            <Text style={styles.qazoBadge}>{missed.length} ta</Text>
          </View>
          {missed.length ? missed.slice(0, 1).map(entry => (
            <View key={entry.key} style={styles.qazoEntry}>
              <View style={styles.qazoEntryIcon}><X size={18} color="#BA1A1A" /></View>
              <View style={styles.qazoEntryText}>
                <Text style={styles.qazoPrayer}>{entry.prayer.name} namozi</Text>
                <Text style={styles.qazoDate}>{dateKey(entry.date) === todayKey ? 'Bugun · ' : ''}{formatUzDate(entry.date)} {entry.date.getFullYear()}</Text>
              </View>
              <NativeAction label="O‘qidim" compact onPress={() => markDone(entry.key)} />
            </View>
          )) : <Text style={styles.qazoEmpty}>Hozircha qazo namozlar yo‘q.</Text>}
          <View style={styles.qazoFooter}><View style={styles.qazoFooterLabel}><Info size={14} color={EMERALD} /><Text style={styles.qazoFooterText}>Qazo namozlar daftarchasi</Text></View><NativeAction label="Batafsil hisob" compact variant="text" onPress={() => setQazoOpen(true)} /></View>
        </View>
        <View style={styles.ayahCard}>
          <View style={styles.ayahRow}><Text style={styles.ayahEyebrow}>KUNNING OYATI KARIMASI</Text><BookOpen size={20} color="#95D3BA" /></View>
          <Text style={styles.ayahText}>«Albatta, namoz fahsh va yomon ishlardan qaytarur. Allohning zikri esa, shubhasiz, eng buyukdir».</Text>
          <View style={styles.ayahRow}><Text style={styles.ayahSource}>«Ankavut» surasi, 45-oyat</Text><NativeAction label="Ulashish" compact variant="text" colorScheme="dark" onPress={() => void Share.share({ message: '«Albatta, namoz fahsh va yomon ishlardan qaytarur. Allohning zikri esa, shubhasiz, eng buyukdir». «Ankavut» surasi, 45-oyat' })} /></View>
        </View>
        <NativeSheet visible={calendarOpen} onClose={() => setCalendarOpen(false)} title="Sana tanlash">
          <NativeCalendar value={selectedDate} onChange={date => { setSelectedDate(date); setCalendarOpen(false); }} maximumDate={now} />
        </NativeSheet>
        <NativeSheet visible={qazoOpen} onClose={() => setQazoOpen(false)} title="Qazo namozlar daftarchasi">
          {missed.length ? missed.map(entry => <View key={entry.key} style={styles.qazoEntry}>
            <View style={styles.qazoEntryText}><Text style={styles.qazoPrayer}>{entry.prayer.name} namozi</Text><Text style={styles.qazoDate}>{formatUzDate(entry.date)} {entry.date.getFullYear()}</Text></View>
            <NativeAction label="O‘qidim" compact onPress={() => markDone(entry.key)} />
          </View>) : <Text style={styles.qazoEmpty}>Hozircha qazo namozlar yo‘q.</Text>}
        </NativeSheet>
      </View>
    </Screen>
  );
}

const baseStyles = StyleSheet.create({
  screen: { backgroundColor: '#FAF9F5' },
  content: { gap: 0 },
  page: { width: '100%', maxWidth: 440, alignSelf: 'center', gap: 20 },
  dateSection: { gap: 9 },
  dateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  dateNav: { flexDirection: 'row', alignItems: 'center' },
  dateRange: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  dayStrip: { flexDirection: 'row', padding: 7, gap: 3, borderRadius: 20, backgroundColor: '#FFFFFF' },
  dayItem: { flex: 1, minHeight: 66, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 3 },
  fridayDay: { backgroundColor: '#E8F7EF' },
  todayDay: { backgroundColor: FOREST },
  dayName: { color: MUTED, fontSize: 10, fontWeight: '600' },
  dayNumber: { color: INK, fontSize: 16, fontWeight: '700' },
  todayText: { color: '#FFFFFF' },
  dayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E3E2DF' },
  dayDotDone: { backgroundColor: EMERALD },
  dayDotMissed: { backgroundColor: '#BA1A1A' },
  dayDotToday: { backgroundColor: '#6FFBBE' },
  dateRangeText: { color: '#404944', fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  fridayText: { color: EMERALD },
  matrixCard: { padding: 15, borderRadius: 24, backgroundColor: '#FFFFFF', gap: 10 },
  matrixHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 5 },
  matrixHeadingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matrixIcon: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#DDF8E8', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: INK, fontSize: 15, fontWeight: '700' },
  tapHint: { color: MUTED, fontSize: 9, backgroundColor: '#F4F4F0', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 12 },
  matrixHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 5 },
  prayerColumnHeader: { width: 72, color: MUTED, fontSize: 10, fontWeight: '600' },
  weekdayHeader: { flex: 1, color: MUTED, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  matrixRow: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  prayerLabel: { width: 72, flexDirection: 'row', alignItems: 'center', gap: 5 },
  prayerDot: { width: 8, height: 8, borderRadius: 4 },
  prayerName: { flexShrink: 1, color: INK, fontSize: 11, fontWeight: '600' },
  cellSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBubble: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#EFEEEA', alignItems: 'center', justifyContent: 'center' },
  statusDone: { backgroundColor: EMERALD },
  statusMissed: { backgroundColor: '#BA1A1A' },
  statusEmpty: { backgroundColor: '#E3E2DF' },
  legend: { borderTopWidth: 1, borderTopColor: '#EFEEEA', paddingTop: 12, marginTop: 3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 11, height: 11, borderRadius: 6 },
  legendLabel: { color: '#404944', fontSize: 10 },
  resultsSection: { gap: 10 },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...Typography.sectionTitle, color: INK },
  percentSummary: { color: EMERALD, fontSize: 12, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  progressCard: { flex: 5, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 10, minHeight: 168, alignItems: 'center', justifyContent: 'center', gap: 8 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  ringCount: { color: INK, fontSize: 25, lineHeight: 29, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ringTotal: { color: MUTED, fontSize: 10 },
  progressLabel: { color: INK, fontSize: 12, fontWeight: '500' },
  trendCard: { flex: 7, minWidth: 0, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 12, justifyContent: 'space-between', gap: 10 },
  trendHeader: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'space-between' },
  trendTitle: { color: '#404944', fontSize: 11, fontWeight: '500' },
  trendPill: { color: EMERALD, fontSize: 9, fontWeight: '600', backgroundColor: '#DDF8E8', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12 },
  bars: { height: 52, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  barColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: 5 },
  barTrack: { width: '100%', height: 33, backgroundColor: '#EEF6F0', justifyContent: 'flex-end', borderTopLeftRadius: 5, borderTopRightRadius: 5, overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: EMERALD, borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  barLabel: { color: MUTED, fontSize: 9, textAlign: 'center' },
  streakBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F4F4F0', padding: 6, borderRadius: 14 },
  streakIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#623C00', alignItems: 'center', justifyContent: 'center' },
  streakText: { flex: 1, color: INK, fontSize: 10, fontWeight: '500' },
  qazoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 17, gap: 13 },
  qazoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qazoHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  qazoHeaderIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFdad6', alignItems: 'center', justifyContent: 'center' },
  qazoSubtitle: { color: MUTED, fontSize: 10, marginTop: 2 },
  qazoBadge: { backgroundColor: '#BA1A1A', color: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, fontSize: 11, fontWeight: '700', overflow: 'hidden' },
  qazoEntry: { backgroundColor: '#F4F4F0', borderRadius: 17, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  qazoEntryIcon: { width: 33, height: 33, borderRadius: 17, backgroundColor: '#FFdad6', alignItems: 'center', justifyContent: 'center' },
  qazoEntryText: { flex: 1 },
  qazoPrayer: { color: INK, fontSize: 13, fontWeight: '700' },
  qazoDate: { color: MUTED, fontSize: 10, marginTop: 2, textTransform: 'capitalize' },
  qazoEmpty: { color: MUTED, fontSize: 12, backgroundColor: '#F4F4F0', padding: 13, borderRadius: 14 },
  qazoFooter: { paddingTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6 },
  qazoFooterLabel: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center' },
  qazoFooterText: { color: '#404944', fontSize: 9, fontWeight: '500' },
  ayahCard: { borderRadius: 22, padding: 20, backgroundColor: FOREST, gap: 12 },
  ayahEyebrow: { color: '#89E5BA', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  ayahText: { color: '#FFFFFF', fontSize: 14, lineHeight: 23, fontWeight: '500', fontStyle: 'italic' },
  ayahSource: { color: '#B8DEC9', fontSize: 10 },
  ayahRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
