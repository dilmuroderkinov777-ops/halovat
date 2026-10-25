import React from 'react';
import { StyleSheet, Text } from 'react-native';

export type NativeCountdownTextProps = {
  text: string; seconds: number; animate: boolean; reduceMotion: boolean; scale: number; width: number;
  color?: string; fontSize?: number; lineHeight?: number; countsDown?: boolean;
};

/** Web fallback; mobile resolves the SwiftUI or Compose implementation. */
export function NativeCountdownText({ text, scale, width, color = '#FFFFFF', fontSize = 49, lineHeight = 57 }: NativeCountdownTextProps) {
  return <Text allowFontScaling={false} style={[styles.text, {
    width, color, fontSize: fontSize * scale, lineHeight: lineHeight * scale, letterSpacing: -1.5 * fontSize / 49 * scale,
  }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  text: { color: '#FFFFFF', fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
});
