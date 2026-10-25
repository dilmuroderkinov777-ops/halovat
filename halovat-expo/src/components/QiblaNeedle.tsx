import React, { memo, useMemo } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export const QiblaNeedle = memo(function QiblaNeedle({ heading, bearing, ready, size, color }: {
  heading: Animated.Value; bearing: number; ready: boolean; size: number; color: string;
}) {
  // Clockwise Qibla bearing minus phone heading: zero points at the fixed top marker.
  // Extend the unwrapped native heading through north, preserving the shortest turn.
  const rotation = useMemo(() => heading.interpolate({
    inputRange: [0, 360], outputRange: [`${bearing}deg`, `${bearing - 360}deg`],
    extrapolate: 'extend',
  }), [bearing, heading]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
    opacity: ready ? 1 : 0, transform: [{ rotate: rotation }],
  }]}>
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Path d="M150 85 L164 119 L155 114 L155 132 L145 132 L145 114 L136 119 Z" fill={color} />
    </Svg>
  </Animated.View>;
});
