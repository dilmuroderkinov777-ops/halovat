import { Host, Text } from '@expo/ui/swift-ui';
import { animation, Animation, contentTransition, font, foregroundStyle, frame, kerning, minimumScaleFactor, monospacedDigit } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { useWindowDimensions } from 'react-native';
import type { NativeCountdownTextProps } from './NativeCountdownText';

export function NativeCountdownText({ text, seconds, animate }: NativeCountdownTextProps) {
  const { fontScale } = useWindowDimensions();
  return <Host matchContents={{ vertical: true }} layoutDirection="leftToRight" ignoreSafeArea="all">
    <Text modifiers={[
      font({ size: 49 * fontScale, weight: 'bold' }), foregroundStyle('#FFFFFF'),
      monospacedDigit(), kerning(-1.5), minimumScaleFactor(0.5),
      contentTransition('numericText', { countsDown: true }),
      animation(Animation.easeInOut({ duration: animate ? 0.32 : 0 }), seconds),
      frame({ maxWidth: Infinity, height: 57 * fontScale, alignment: 'leading' }),
    ]}>{text}</Text>
  </Host>;
}
