import { BottomSheet } from '@expo/ui';
import React from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/AppText';
import { useThemeColors } from '../ui/useAppTheme';
import { Typography } from '../ui/theme';
import { NativeAction } from './NativeAction';

export function NativeSheet({ visible, onClose, title, children, compact = false }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode; compact?: boolean;
}) {
  const colors = useThemeColors();
  const { height, width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const fitContents = compact && height >= 700 && fontScale <= 1.2;
  return <BottomSheet isPresented={visible} onDismiss={onClose} containerColor={colors.paper}
    contentPadding={0} snapPoints={fitContents ? undefined : ['full']}>
    <View style={[styles.sheet, { width: Math.min(width, 440), ...(fitContents ? {} : { height: Math.min(720, height - insets.top - 72) }) }]}>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{title}</Text>
        <NativeAction label="Yopish" variant="text" compact onPress={onClose} />
      </View>
      {fitContents ? <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>{children}</View>
        : <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>{children}</ScrollView>}
    </View>
  </BottomSheet>;
}

const styles = StyleSheet.create({
  sheet: { alignSelf: 'center', paddingHorizontal: 20, paddingTop: 8 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { ...Typography.sectionTitle, flex: 1 },
  scroll: { flex: 1 },
  content: { gap: 16 },
});
