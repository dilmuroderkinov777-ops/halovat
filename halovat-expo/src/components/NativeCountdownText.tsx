import React from 'react';
import { StyleSheet, Text } from 'react-native';

export type NativeCountdownTextProps = {
  text: string; seconds: number; animate: boolean; reduceMotion: boolean; scale: number; width: number;
};

/** Web fallback; mobile resolves the SwiftUI or Compose implementation. */
export function NativeCountdownText({ text, scale, width }: NativeCountdownTextProps) {
  return <Text allowFontScaling={false} style={[styles.text, {
    width, fontSize: 49 * scale, lineHeight: 57 * scale, letterSpacing: -1.5 * scale,
  }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: { color: '#FFFFFF', fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
});
