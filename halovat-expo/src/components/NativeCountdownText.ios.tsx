import { Host, Text } from '@expo/ui/swift-ui';
import { animation, Animation, contentTransition, font, foregroundColor, frame, kerning, minimumScaleFactor, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import type { NativeCountdownTextProps } from './NativeCountdownText';

export function NativeCountdownText({ text, seconds, animate, scale, width }: NativeCountdownTextProps) {
  return <Host style={{ width, height: 57 * scale }} layoutDirection="leftToRight" ignoreSafeArea="all">
    <Text modifiers={[
      font({ size: 49 * scale, weight: 'bold' }), foregroundColor('#FFFFFF'),
      monospacedDigit(), kerning(-1.5 * scale), minimumScaleFactor(0.5),
      contentTransition('numericText', { countsDown: true }),
      animation(Animation.easeInOut({ duration: animate ? 0.32 : 0 }), seconds),
      frame({ width, height: 57 * scale, alignment: 'center' }),
    ]}>{text}</Text>
  </Host>;
}
