import React, { memo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text } from '../ui/AppText';
import { NativeCountdownText } from './NativeCountdownText';

const FONT_SIZE = 64;
const LINE_HEIGHT = 74;
const GLYPH_WIDTH = FONT_SIZE * 28 / 49;
const MAX_WIDTH = GLYPH_WIDTH * 4; // 180° must fit without changing scale mid-turn.

export const CompassDegrees = memo(function CompassDegrees({ angle, color, reduceMotion }: {
  angle: number | null; color: string; reduceMotion: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(MAX_WIDTH);
  const degrees = angle === null ? null : Math.round(Math.abs(angle));
  const [transition, setTransition] = useState({ degrees, countsDown: false, animate: false });
  if (transition.degrees !== degrees) setTransition({
    degrees,
    countsDown: degrees !== null && transition.degrees !== null && degrees < transition.degrees,
    animate: degrees !== null && transition.degrees !== null,
  });
  const scale = Math.min(fontScale, availableWidth / MAX_WIDTH);
  const text = degrees === null ? '—' : `${degrees}°`;

  return <View accessible accessibilityRole="text" accessibilityLabel={text} accessibilityLiveRegion="none"
    onLayout={event => { if (event.nativeEvent.layout.width > 0) setAvailableWidth(event.nativeEvent.layout.width); }}
    style={styles.container}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
      {degrees === null
        ? <Text translate={false} allowFontScaling={false} style={[styles.placeholder, { color, fontSize: FONT_SIZE * scale, lineHeight: LINE_HEIGHT * scale }]}>—</Text>
        : <NativeCountdownText text={text} seconds={degrees} color={color} fontSize={FONT_SIZE} lineHeight={LINE_HEIGHT}
          scale={scale} width={GLYPH_WIDTH * text.length * scale} animate={!reduceMotion && transition.animate}
          reduceMotion={reduceMotion} countsDown={transition.countsDown} />}
    </View>
  </View>;
});

const styles = StyleSheet.create({
  container: { flex: 1.1, minWidth: 0, minHeight: LINE_HEIGHT, justifyContent: 'center', overflow: 'hidden' },
  content: { flexDirection: 'row', direction: 'ltr' },
  placeholder: { fontWeight: '600', letterSpacing: -2 },
});
