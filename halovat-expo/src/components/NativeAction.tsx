import React from 'react';
import { Text } from '../ui/AppText';
import { Pressable, StyleSheet } from 'react-native';
import { Colors } from '../ui/theme';

export function NativeAction({ label, onPress, disabled = false, variant = 'filled' }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
}) {
  return <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} style={[styles.button, variant === 'outlined' && styles.outlined, disabled && styles.disabled]}><Text style={[styles.label, variant === 'outlined' && styles.outlinedLabel]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  button: { width: '100%', height: 48, borderRadius: 15, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  outlined: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D9D5DE' },
  label: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  outlinedLabel: { color: Colors.green },
  disabled: { opacity: 0.55 },
});
