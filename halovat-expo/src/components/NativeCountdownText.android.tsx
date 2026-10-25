import { AnimatedVisibility, Box, EnterTransition, ExitTransition, Host, Row, Text } from '@expo/ui/jetpack-compose';
import { graphicsLayer, size, width } from '@expo/ui/jetpack-compose/modifiers';
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { NativeCountdownTextProps } from './NativeCountdownText';

const enter = EnterTransition.fadeIn().plus(EnterTransition.slideInVertically({ initialOffsetY: -0.5 }));
const exit = ExitTransition.fadeOut().plus(ExitTransition.slideOutVertically({ targetOffsetY: 0.5 }));
const textStyle = { fontWeight: 'bold', fontFamily: 'sansSerif', textAlign: 'center' } as const;

function Digit({ value, scale, fontScale }: { value: string; scale: number; fontScale: number }) {
  // Keep both native visibility containers mounted so Compose can animate both
  // the outgoing and incoming glyph without a JavaScript animation loop.
  const [state, setState] = useState({ value, previous: value, slot: 0 });
  if (state.value !== value) setState({ value, previous: state.value, slot: 1 - state.slot });
  return <Box contentAlignment="center" modifiers={[size(28 * scale, 57 * scale), graphicsLayer({ clip: true })]}>
    {[0, 1].map(slot => <AnimatedVisibility key={slot} visible={slot === state.slot} enterTransition={enter} exitTransition={exit}>
      <Text color="#FFFFFF" style={{ ...textStyle, fontSize: 49 * scale / fontScale, lineHeight: 57 * scale / fontScale }}
        maxLines={1} softWrap={false} modifiers={[width(28 * scale)]}>
        {slot === state.slot ? state.value : state.previous}
      </Text>
    </AnimatedVisibility>)}
  </Box>;
}

export function NativeCountdownText({ text, reduceMotion, scale, width: hostWidth }: NativeCountdownTextProps) {
  const { fontScale } = useWindowDimensions();
  return <Host style={{ width: hostWidth, height: 57 * scale }} layoutDirection="leftToRight">
    <Row verticalAlignment="center" horizontalArrangement="center" modifiers={[width(hostWidth)]}>
      {text.split('').map((value, index) => reduceMotion
        ? <Text key={index} color="#FFFFFF" style={{ ...textStyle, fontSize: 49 * scale / fontScale, lineHeight: 57 * scale / fontScale }}
          maxLines={1} softWrap={false} modifiers={[width(28 * scale)]}>{value}</Text>
        : <Digit key={index} value={value} scale={scale} fontScale={fontScale} />)}
    </Row>
  </Host>;
}
