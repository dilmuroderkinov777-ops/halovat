import React from 'react';
import { StyleSheet, Text } from 'react-native';

export type NativeCountdownTextProps = { text: string; seconds: number; animate: boolean; reduceMotion: boolean };

/** Web fallback; mobile resolves the SwiftUI or Compose implementation. */
export function NativeCountdownText({ text }: NativeCountdownTextProps) {
  return <Text style={styles.text}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: { color: '#FFFFFF', fontSize: 49, lineHeight: 57, letterSpacing: -1.5, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
