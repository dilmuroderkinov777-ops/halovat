import { Host, Text } from '@expo/ui/swift-ui';
import { animation, Animation, contentTransition, font, foregroundColor, frame, kerning, minimumScaleFactor, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import type { NativeCountdownTextProps } from './NativeCountdownText';

export function NativeCountdownText({ text, seconds, animate, scale, width, color = '#FFFFFF', fontSize = 49, lineHeight = 57, countsDown = true }: NativeCountdownTextProps) {
  return <Host style={{ width, height: lineHeight * scale }} layoutDirection="leftToRight" ignoreSafeArea="all">
    <Text modifiers={[
      font({ size: fontSize * scale, weight: 'bold' }), foregroundColor(color),
      monospacedDigit(), kerning(-1.5 * fontSize / 49 * scale), minimumScaleFactor(0.5),
      contentTransition('numericText', { countsDown }),
      animation(Animation.easeInOut({ duration: animate ? 0.32 : 0 }), seconds),
      frame({ width, height: lineHeight * scale, alignment: 'center' }),
    ]}>{text}</Text>
  </Host>;
}
