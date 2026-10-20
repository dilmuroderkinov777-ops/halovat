import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { headingDelta } from '../domain/compassHeading';

export const QiblaNeedle = memo(function QiblaNeedle({ angle, ready, size, color }: {
  angle: number; ready: boolean; size: number; color: string;
}) {
  const rotation = useRef(new Animated.Value(angle)).current;
  const target = useRef(angle);
  const initialized = useRef(false);
  useEffect(() => {
    if (!ready) { initialized.current = false; return; }
    if (!initialized.current) {
      initialized.current = true;
      target.current = angle;
      rotation.setValue(angle);
      return;
    }
    target.current += headingDelta(target.current, angle);
    const animation = Animated.timing(rotation, {
      toValue: target.current, duration: 160, easing: Easing.out(Easing.quad),
      useNativeDriver: true, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [angle, ready, rotation]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {
    opacity: ready ? 1 : 0.25,
    transform: [{ rotate: rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'] }) }],
  }]}>
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Path d="M150 85 L164 119 L155 114 L155 132 L145 132 L145 114 L136 119 Z" fill={color} />
    </Svg>
  </Animated.View>;
});
