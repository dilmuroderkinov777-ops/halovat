import React, { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

type Props = { count: number; target: number; size: number; reduceMotion: boolean };
const COLOR = '#4EDEA3';
const STROKE_WIDTH = 10;

/** Fixed arcs use native view transforms, so progress never requires JS animation frames. */
export const TasbeehProgressRing = memo(function TasbeehProgressRing({ count, target, size, reduceMotion }: Props) {
  const value = target > 0 ? Math.max(0, Math.min(1, count / target)) : 0;
  const [progress] = useState(() => new Animated.Value(value));
  const previous = useRef({ count, target });

  useLayoutEffect(() => {
    const reset = target !== previous.current.target || count < previous.current.count - 1;
    const changed = count !== previous.current.count || target !== previous.current.target;
    previous.current = { count, target };
    if (reduceMotion || reset || !changed) {
      progress.setValue(value);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: value, duration: 110, easing: Easing.out(Easing.quad),
      useNativeDriver: true, isInteraction: false,
    });
    animation.start();
    return () => animation.stop();
  }, [count, progress, reduceMotion, target, value]);

  const motion = useMemo(() => ({
    right: progress.interpolate({ inputRange: [0, 0.5], outputRange: ['-180deg', '0deg'], extrapolate: 'clamp' }),
    left: progress.interpolate({ inputRange: [0.5, 1], outputRange: ['-180deg', '0deg'], extrapolate: 'clamp' }),
    tip: progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'], extrapolate: 'clamp' }),
    visible: progress.interpolate({ inputRange: [0, 0.00001], outputRange: [0, 1], extrapolate: 'clamp' }),
    leftVisible: progress.interpolate({ inputRange: [0.5, 0.50001], outputRange: [0, 1], extrapolate: 'clamp' }),
  }), [progress]);
  const center = size / 2;
  const radius = center - 11;
  const halfCircumference = Math.PI * radius;
  const cap = { left: center - STROKE_WIDTH / 2, top: center - radius - STROKE_WIDTH / 2 };

  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: motion.visible }]}>
    <View style={[styles.half, { left: center, width: center, height: size }]}>
      <Animated.View style={{ left: -center, width: size, height: size, transform: [{ rotate: motion.right }] }}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={COLOR} strokeWidth={STROKE_WIDTH}
            strokeDasharray={[halfCircumference, halfCircumference]} transform={`rotate(-90 ${center} ${center})`} />
        </Svg>
      </Animated.View>
    </View>
    <Animated.View style={[styles.half, { width: center, height: size, opacity: motion.leftVisible }]}>
      <Animated.View style={{ width: size, height: size, transform: [{ rotate: motion.left }] }}>
        <Svg width={size} height={size}>
          <Circle cx={center} cy={center} r={radius} fill="none" stroke={COLOR} strokeWidth={STROKE_WIDTH}
            strokeDasharray={[halfCircumference, halfCircumference]} transform={`rotate(90 ${center} ${center})`} />
        </Svg>
      </Animated.View>
    </Animated.View>
    <View style={[styles.cap, cap]} />
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: motion.tip }] }]}>
      <View style={[styles.cap, cap]} />
    </Animated.View>
  </Animated.View>;
});

const styles = StyleSheet.create({
  half: { position: 'absolute', top: 0, left: 0, overflow: 'hidden' },
  cap: { position: 'absolute', width: STROKE_WIDTH, height: STROKE_WIDTH, borderRadius: STROKE_WIDTH / 2, backgroundColor: COLOR },
});
