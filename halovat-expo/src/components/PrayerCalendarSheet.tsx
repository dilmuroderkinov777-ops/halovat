import { Check, Minus, X } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { dateKey, formatUzDate, PRAYERS, prayerKey, PrayerId, PrayerStatus } from '../domain/prayers';
import { Text } from '../ui/AppText';
import { useThemedStyles } from '../ui/useAppTheme';
import { NativeAction } from './NativeAction';
import { NativeSheet } from './NativeSheet';

export function PrayerCalendarSheet({ visible, value, now, statuses, onChange, onToggle, onClose }: {
  visible: boolean; value: Date; now: Date; statuses: Record<string, PrayerStatus>;
  onChange: (date: Date) => void; onToggle: (date: Date, prayer: PrayerId) => void; onClose: () => void;
}) {
  const styles = useThemedStyles(baseStyles);
  const { t, language } = useLanguage();
  const year = value.getFullYear();
  const month = value.getMonth();
  const today = dateKey(now);
  const days = Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => new Date(year, month, index + 1));
  const canGoForward = dateKey(new Date(year, month + 1, 1)) <= today;
  const changeMonth = (offset: -1 | 1) => {
    const first = new Date(year, month + offset, 1);
    const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const next = new Date(first.getFullYear(), first.getMonth(), Math.min(value.getDate(), lastDay));
    onChange(dateKey(next) > today ? new Date(now) : next);
  };

  return <NativeSheet visible={visible} onClose={onClose} title="Namozlar taqvimi">
    <View style={styles.monthHeader}>
      <Text accessibilityRole="header" style={styles.monthTitle}>{new Intl.DateTimeFormat(language, { month: 'long', year: 'numeric' }).format(value)}</Text>
      <View style={styles.monthActions}>
        <NativeAction label="‹" translate={false} accessibilityLabel="Oldingi oy" compact square variant="text" onPress={() => changeMonth(-1)} />
        <NativeAction label="›" translate={false} accessibilityLabel="Keyingi oy" compact square variant="text" disabled={!canGoForward} onPress={() => changeMonth(1)} />
      </View>
    </View>
    <Text style={styles.hint}>Katakka bosing</Text>
    <View style={styles.table}>
      <View style={styles.row}>
        <Text style={[styles.dateColumn, styles.columnTitle]}>Sana</Text>
        {PRAYERS.map(prayer => <Text key={prayer.id} style={[styles.cell, styles.columnTitle]}>{prayer.name}</Text>)}
      </View>
      {days.map(day => {
        const key = dateKey(day);
        const future = key > today;
        const selected = key === dateKey(value);
        return <View key={key} style={[styles.row, selected && styles.selectedRow, future && styles.futureRow]}>
          <Pressable accessibilityRole="button" accessibilityLabel={t(formatUzDate(day))}
            accessibilityState={{ selected, disabled: future }} disabled={future}
            onPress={() => onChange(day)} style={styles.dateColumn}>
            <Text style={[styles.dayNumber, key === today && styles.todayNumber]}>{day.getDate()}</Text>
          </Pressable>
          {PRAYERS.map(prayer => {
            const status = statuses[prayerKey(day, prayer.id)];
            const label = status === 'done' ? 'O‘qildi' : status === 'missed' ? 'Qazo' : 'Kutilmoqda';
            return <View key={prayer.id} style={styles.cell}>
              <Pressable accessibilityRole="button" disabled={future} accessibilityState={{ disabled: future }}
                accessibilityLabel={`${t(prayer.name)}, ${t(formatUzDate(day))}: ${t(label)}`}
                onPress={() => onToggle(day, prayer.id)} style={[styles.statusButton, status === 'done' && styles.done, status === 'missed' && styles.missed]}>
                {status === 'done' ? <Check size={17} color="#FFFFFF" /> : status === 'missed' ? <X size={17} color="#FFFFFF" /> : <Minus size={15} color="#707974" />}
              </Pressable>
            </View>;
          })}
        </View>;
      })}
    </View>
    <View style={styles.legend}>
      <View style={styles.legendItem}><Check size={13} color="#006C49" /><Text style={styles.legendText}>O‘qildi</Text></View>
      <View style={styles.legendItem}><X size={13} color="#BA1A1A" /><Text style={styles.legendText}>Qazo</Text></View>
      <View style={styles.legendItem}><Minus size={13} color="#707974" /><Text style={styles.legendText}>Kutilmoqda</Text></View>
    </View>
  </NativeSheet>;
}

const baseStyles = StyleSheet.create({
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  monthTitle: { flex: 1, color: '#1B1C1A', fontSize: 18, fontWeight: '600', textTransform: 'capitalize' },
  monthActions: { flexDirection: 'row' },
  hint: { color: '#707974', fontSize: 12 },
  table: { gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 44, borderRadius: 12 },
  selectedRow: { backgroundColor: '#ECFDF5' },
  futureRow: { opacity: 0.4 },
  dateColumn: { width: 44, minHeight: 44, textAlign: 'center', alignItems: 'center', justifyContent: 'center' },
  columnTitle: { color: '#707974', fontSize: 10, fontWeight: '600', textAlign: 'center', minHeight: 0 },
  dayNumber: { color: '#1B1C1A', fontSize: 14, fontWeight: '600' },
  todayNumber: { color: '#006C49' },
  cell: { flex: 1, minWidth: 0, alignItems: 'center' },
  statusButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EFEEEA', alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: '#006C49' },
  missed: { backgroundColor: '#BA1A1A' },
  legend: { flexDirection: 'row', justifyContent: 'space-around', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { color: '#404944', fontSize: 11 },
});
