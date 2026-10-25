import React, { memo, useMemo } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const QiblaNeedle = memo(function QiblaNeedle({ heading, bearing, ready, size, color, marker }: {
  heading: Animated.Value; bearing: number; ready: boolean; size: number; color: string; marker?: React.ReactNode;
}) {
  const rotation = useMemo(() => heading.interpolate({
    inputRange: [0, 360], outputRange: [`${bearing}deg`, `${bearing - 360}deg`],
  }), [bearing, heading]);
  const counterRotation = useMemo(() => heading.interpolate({
    inputRange: [0, 360], outputRange: [`${-bearing}deg`, `${360 - bearing}deg`],
  }), [bearing, heading]);
  const markerSize = size * 0.16;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
    opacity: ready ? 1 : 0, transform: [{ rotate: rotation }],
  }]}>
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Path d="M150 85 L164 119 L155 114 L155 132 L145 132 L145 114 L136 119 Z" fill={color} />
    </Svg>
    {ready && marker ? <Animated.View style={{
      position: 'absolute', alignItems: 'center', justifyContent: 'center',
      width: markerSize, height: markerSize,
      left: (size - markerSize) / 2, top: (size - markerSize) / 2 - size * 0.32,
      transform: [{ rotate: counterRotation }],
    }}>{marker}</Animated.View> : null}
  </Animated.View>;
});
