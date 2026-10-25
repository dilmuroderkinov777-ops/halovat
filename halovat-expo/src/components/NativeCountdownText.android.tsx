import { AnimatedVisibility, Box, EnterTransition, ExitTransition, Host, Row, Text } from '@expo/ui/jetpack-compose';
import { graphicsLayer, size, width } from '@expo/ui/jetpack-compose/modifiers';
import React, { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { NativeCountdownTextProps } from './NativeCountdownText';

const countdownEnter = EnterTransition.fadeIn().plus(EnterTransition.slideInVertically({ initialOffsetY: -0.5 }));
const countdownExit = ExitTransition.fadeOut().plus(ExitTransition.slideOutVertically({ targetOffsetY: 0.5 }));
const countupEnter = EnterTransition.fadeIn().plus(EnterTransition.slideInVertically({ initialOffsetY: 0.5 }));
const countupExit = ExitTransition.fadeOut().plus(ExitTransition.slideOutVertically({ targetOffsetY: -0.5 }));
const textStyle = { fontWeight: 'bold', fontFamily: 'sansSerif', textAlign: 'center' } as const;

function Digit({ value, scale, fontScale, color, fontSize, lineHeight, countsDown }: {
  value: string; scale: number; fontScale: number; color: string; fontSize: number; lineHeight: number; countsDown: boolean;
}) {
  // Keep both native visibility containers mounted so Compose can animate both
  // the outgoing and incoming glyph without a JavaScript animation loop.
  const [state, setState] = useState({ value, previous: value, slot: 0 });
  if (state.value !== value) setState({ value, previous: state.value, slot: 1 - state.slot });
  const glyphWidth = fontSize * 28 / 49 * scale;
  return <Box contentAlignment="center" modifiers={[size(glyphWidth, lineHeight * scale), graphicsLayer({ clip: true })]}>
    {[0, 1].map(slot => <AnimatedVisibility key={slot} visible={slot === state.slot}
      enterTransition={countsDown ? countdownEnter : countupEnter} exitTransition={countsDown ? countdownExit : countupExit}>
      <Text color={color} style={{ ...textStyle, fontSize: fontSize * scale / fontScale, lineHeight: lineHeight * scale / fontScale }}
        maxLines={1} softWrap={false} modifiers={[width(glyphWidth)]}>
        {slot === state.slot ? state.value : state.previous}
      </Text>
    </AnimatedVisibility>)}
  </Box>;
}

export function NativeCountdownText({ text, reduceMotion, scale, width: hostWidth, color = '#FFFFFF', fontSize = 49, lineHeight = 57, countsDown = true }: NativeCountdownTextProps) {
  const { fontScale } = useWindowDimensions();
  const glyphWidth = fontSize * 28 / 49 * scale;
  return <Host style={{ width: hostWidth, height: lineHeight * scale }} layoutDirection="leftToRight">
    <Row verticalAlignment="center" horizontalArrangement="center" modifiers={[width(hostWidth)]}>
      {text.split('').map((value, index) => reduceMotion
        ? <Text key={text.length - index - 1} color={color} style={{ ...textStyle, fontSize: fontSize * scale / fontScale, lineHeight: lineHeight * scale / fontScale }}
          maxLines={1} softWrap={false} modifiers={[width(glyphWidth)]}>{value}</Text>
        : <Digit key={text.length - index - 1} value={value} scale={scale} fontScale={fontScale}
          color={color} fontSize={fontSize} lineHeight={lineHeight} countsDown={countsDown} />)}
    </Row>
  </Host>;
}
