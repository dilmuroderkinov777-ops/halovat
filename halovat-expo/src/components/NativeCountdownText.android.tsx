import { AnimatedVisibility, Box, EnterTransition, ExitTransition, Host, Row, Text } from '@expo/ui/jetpack-compose';
import { graphicsLayer, size, width } from '@expo/ui/jetpack-compose/modifiers';
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { NativeCountdownTextProps } from './NativeCountdownText';

const enter = EnterTransition.fadeIn().plus(EnterTransition.slideInVertically({ initialOffsetY: -0.5 }));
const exit = ExitTransition.fadeOut().plus(ExitTransition.slideOutVertically({ targetOffsetY: 0.5 }));
const textStyle = { fontSize: 49, lineHeight: 57, fontWeight: 'bold', fontFamily: 'sansSerif', textAlign: 'center' } as const;

function Digit({ value, fontScale }: { value: string; fontScale: number }) {
  // Keep both native visibility containers mounted so Compose can animate both
  // the outgoing and incoming glyph without a JavaScript animation loop.
  const [state, setState] = useState({ value, previous: value, slot: 0 });
  if (state.value !== value) setState({ value, previous: state.value, slot: 1 - state.slot });
  return <Box contentAlignment="center" modifiers={[size(28 * fontScale, 57 * fontScale), graphicsLayer({ clip: true })]}>
    {[0, 1].map(slot => <AnimatedVisibility key={slot} visible={slot === state.slot} enterTransition={enter} exitTransition={exit}>
      <Text color="#FFFFFF" style={textStyle} maxLines={1} softWrap={false} modifiers={[width(28 * fontScale)]}>
        {slot === state.slot ? state.value : state.previous}
      </Text>
    </AnimatedVisibility>)}
  </Box>;
}

export function NativeCountdownText({ text, reduceMotion }: NativeCountdownTextProps) {
  const { fontScale } = useWindowDimensions();
  return <Host matchContents={{ vertical: true }} layoutDirection="leftToRight">
    <Row verticalAlignment="center">
      {text.split('').map((value, index) => value === ':' || reduceMotion
        ? <Text key={index} color="#FFFFFF" style={textStyle} maxLines={1} softWrap={false}
          modifiers={[width((value === ':' ? 13 : 28) * fontScale)]}>{value}</Text>
        : <Digit key={index} value={value} fontScale={fontScale} />)}
    </Row>
  </Host>;
}
