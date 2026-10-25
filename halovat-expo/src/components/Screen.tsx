import { useThemedStyles } from '../ui/useAppTheme';
import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '../ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../ui/theme';
import { useSegments } from 'expo-router';

export function Screen({ children, scroll = true, style, contentStyle }: { children: React.ReactNode; scroll?: boolean; style?: ViewStyle; contentStyle?: ViewStyle }) {
  const styles = useThemedStyles(baseStyles);
  const segments = useSegments();
  const inTabs = segments[0] === '(tabs)';
  return (
    <SafeAreaView edges={inTabs ? ['left', 'right'] : ['left', 'right', 'bottom']} style={[styles.safe, style]}>
      {scroll ? (
        <ScrollView style={styles.scroll} contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, contentStyle]}>
          {children}
        </ScrollView>
      ) : <View style={[styles.content, contentStyle]}>{children}</View>}
    </SafeAreaView>
  );
}

export function Eyebrow({ children, color = Colors.muted }: { children: React.ReactNode; color?: string }) {
  const styles = useThemedStyles(baseStyles);
  return <Text style={[styles.eyebrow, { color }]}>{children}</Text>;
}

export function ScreenHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  const styles = useThemedStyles(baseStyles);
  return (
    <View style={styles.heading}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  const styles = useThemedStyles(baseStyles);
  return <View style={styles.sectionTitle}><Text style={styles.sectionText}>{title}</Text>{action}</View>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const styles = useThemedStyles(baseStyles);
  return <View style={[styles.card, style]}>{children}</View>;
}

const baseStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.canvas, width: '100%', alignItems: 'center' },
  scroll: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: 440 },
  content: { alignSelf: 'stretch', maxWidth: 440, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 20 },
  heading: { gap: 4, paddingTop: 10 },
  title: { color: Colors.ink, fontSize: 28, fontWeight: '700', letterSpacing: -0.8 },
  subtitle: { color: Colors.body, fontSize: 14, lineHeight: 20 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -10 },
  sectionText: { color: Colors.ink, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  card: { backgroundColor: Colors.paper, borderRadius: 24, padding: 18, borderWidth: 1, borderColor: '#F0F0EB' },
});
