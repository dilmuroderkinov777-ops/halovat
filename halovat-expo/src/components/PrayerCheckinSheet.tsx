import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../ui/AppText';
import { useThemeColors } from '../ui/useAppTheme';
import { NativeAction } from './NativeAction';
import { NativeSheet } from './NativeSheet';
import type { PrayerCheckinSheetProps } from './PrayerCheckinSheet.types';

export function PrayerCheckinSheet({ prayerName, onChoose, onClose }: PrayerCheckinSheetProps) {
  const colors = useThemeColors();
  return <NativeSheet visible onClose={onClose} title={`${prayerName} namozini o‘qidingizmi?`} compact centeredTitle>
    <Text style={[styles.copy, { color: colors.body }]}>Javobingiz namozlar jadvaliga qo‘shiladi.</Text>
    <View style={styles.actions}>
      <NativeAction label="Ha, o‘qidim" large onPress={() => onChoose('done')} />
      <NativeAction label="Yo‘q, qazo bo‘ldi" large variant="outlined" onPress={() => onChoose('missed')} />
      <NativeAction label="Keyinroq belgilayman" large variant="outlined" onPress={onClose} />
    </View>
  </NativeSheet>;
}

const styles = StyleSheet.create({
  copy: { fontSize: 15, textAlign: 'center', marginBottom: 8 },
  actions: { gap: 8 },
});
