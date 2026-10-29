import { Check, ChevronDown, ChevronUp, Info, Minus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/AppText';
import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';

export function SettingsCard({ title, children }: { title?: string; children: React.ReactNode }) {
  const styles = useThemedStyles(baseStyles);
  return <View style={styles.card}>{title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}{children}</View>;
}

export function SettingsNotice({ children, warning = false }: { children: React.ReactNode; warning?: boolean }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  return <View style={[styles.notice, warning && styles.warning]}><Info size={18} color={warning ? colors.red : colors.green} /><Text style={styles.noticeText}>{children}</Text></View>;
}

export function SettingsStatus({ label, value, unavailable = false }: { label: string; value: boolean | null; unavailable?: boolean }) {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const status = value === null ? unavailable ? 'Aniqlanmadi' : 'Tekshirilmoqda…' : value ? 'Yoqilgan' : 'Sozlash kerak';
  return <View style={styles.statusRow}><Text style={styles.statusLabel}>{label}</Text>
    <View style={[styles.badge, value === true && styles.good, value === false && styles.attention]}>
      {value === true ? <Check size={13} color={colors.green} /> : <Minus size={13} color={colors.muted} />}
      <Text style={[styles.statusText, value === true && styles.goodText, value === false && styles.attentionText]}>{status}</Text>
    </View>
  </View>;
}

export function SettingsDisclosure({ title, subtitle, number, initiallyOpen = false, children }: {
  title: string; subtitle?: string; number?: number; initiallyOpen?: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen(value => !value)}
      style={({ pressed }) => [styles.disclosure, pressed && { opacity: 0.7 }]}>
      {number ? <View style={styles.number}><Text translate={false} style={styles.numberText}>{number}</Text></View> : null}
      <View style={styles.copy}><Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>
      {open ? <ChevronUp size={18} color={colors.muted} /> : <ChevronDown size={18} color={colors.muted} />}
    </Pressable>
    {open ? <View style={styles.details}>{children}</View> : null}
  </View>;
}

export function SettingsSteps({ steps }: { steps: readonly string[] }) {
  const styles = useThemedStyles(baseStyles);
  return <View style={styles.details}>{steps.map((step, index) => <View key={step} style={styles.step}>
    <Text translate={false} style={styles.stepIndex}>{index + 1}.</Text><Text style={styles.stepText}>{step}</Text>
  </View>)}</View>;
}

const baseStyles = StyleSheet.create({
  card: { padding: 16, gap: 14, borderRadius: 20, backgroundColor: '#F4F4F0' },
  title: { color: '#1B1C1A', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  subtitle: { color: '#707974', fontSize: 12, lineHeight: 18, marginTop: 3 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 16, backgroundColor: '#ECFDF5' },
  warning: { backgroundColor: '#FFF0ED' },
  noticeText: { flex: 1, color: '#404944', fontSize: 13, lineHeight: 20 },
  statusRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 40 },
  statusLabel: { flex: 1, minWidth: 120, color: '#404944', fontSize: 13, lineHeight: 19 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#EFEEEA' },
  good: { backgroundColor: '#DDF8EB' },
  attention: { backgroundColor: '#FFF0D7' },
  statusText: { color: '#707974', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  goodText: { color: '#006C49' },
  attentionText: { color: '#653E00' },
  disclosure: { minHeight: 44, flexDirection: 'row', gap: 12, alignItems: 'center' },
  number: { width: 32, height: 32, borderRadius: 11, backgroundColor: '#DDF8EB', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#006C49', fontSize: 14, fontWeight: '700' },
  copy: { flex: 1, minWidth: 0 },
  details: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  stepIndex: { width: 16, color: '#006C49', fontSize: 13, lineHeight: 21, fontWeight: '600' },
  stepText: { flex: 1, color: '#404944', fontSize: 14, lineHeight: 21 },
});
