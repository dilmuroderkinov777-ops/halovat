import { useFocusEffect } from 'expo-router';
import { Hand } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Text } from '../ui/AppText';
import { NativeCountdownText } from './NativeCountdownText';
import { TasbeehProgressRing } from './TasbeehProgressRing';

type Props = { count: number; target: number; size: number; onCount: () => void; zikrId?: string };
type TouchId = string | number;
const MINT = '#6FFBBE';
const spring = { stiffness: 450, damping: 28, mass: 0.65, useNativeDriver: true };

export function TasbeehCounter({ count, target, size, onCount, zikrId }: Props) {
  const { fontScale } = useWindowDimensions();
  const [reduceMotion, setReduceMotion] = useState(true);
  const [motion] = useState(() => new Animated.Value(0));
  const [transition, setTransition] = useState({ count, countsDown: false });
  const touches = useRef(new Set<TouchId>());
  const pressed = useRef(false);
  if (transition.count !== count) setTransition({ count, countsDown: count < transition.count });

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useFocusEffect(useCallback(() => () => {
    touches.current.clear();
    pressed.current = false;
    motion.stopAnimation();
    motion.setValue(0);
  }, [motion]));

  useEffect(() => {
    if (reduceMotion) { motion.stopAnimation(); motion.setValue(0); }
  }, [motion, reduceMotion]);

  const showPressed = useCallback((value: boolean) => {
    if (pressed.current === value) return;
    pressed.current = value;
    motion.stopAnimation();
    if (reduceMotion) { motion.setValue(0); return; }
    if (value) {
      Animated.timing(motion, { toValue: 1, duration: 65, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    } else {
      Animated.spring(motion, { ...spring, toValue: 0 }).start();
    }
  }, [motion, reduceMotion]);

  const activate = useCallback(() => {
    onCount();
    if (reduceMotion) return;
    pressed.current = false;
    motion.stopAnimation();
    Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 65, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(motion, { ...spring, toValue: 0 }),
    ]).start();
  }, [motion, onCount, reduceMotion]);

  const finishTouches = useCallback((event: GestureResponderEvent) => {
    for (const touch of event.nativeEvent.changedTouches) touches.current.delete(touch.identifier);
    if (!touches.current.size) showPressed(false);
  }, [showPressed]);

  const feedbackStyle = useMemo(() => ({
    transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.98], extrapolate: 'clamp' }) }],
    opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96], extrapolate: 'clamp' }),
  }), [motion]);
  const radius = size / 2 - 11;
  const numberWidth = size - 52;
  const numberScale = Math.min(fontScale, numberWidth / 132);

  return <Pressable accessibilityRole="button"
    accessibilityLabel={'Tasbeh sanash: ' + count + ' / ' + target}
    accessibilityHint="Sanash uchun teging. 33 ga yetganda tebranish beradi va navbatdagi zikrga o‘tadi."
    onTouchStart={event => {
      const alreadyTouching = touches.current.size > 0;
      // Fabric can batch changes from other views; only track this target's fingers.
      const nativeEvent = event.nativeEvent as GestureResponderEvent['nativeEvent'] & {
        targetTouches?: ArrayLike<{ identifier: TouchId }>;
      };
      const localIds = nativeEvent.targetTouches && new Set(Array.from(nativeEvent.targetTouches, touch => touch.identifier));
      for (const touch of nativeEvent.changedTouches) {
        if (!localIds || localIds.has(touch.identifier)) touches.current.add(touch.identifier);
      }
      if (alreadyTouching || !touches.current.size) return;
      // Count at contact, without waiting for release or an animation callback.
      if (Platform.OS !== 'web') onCount();
      showPressed(true);
    }}
    onTouchEnd={finishTouches}
    onTouchCancel={finishTouches}
    onPressIn={() => showPressed(true)}
    onPressOut={() => { if (!touches.current.size) showPressed(false); }}
    onPress={event => {
      // Native touch releases already counted above. Non-touch activation (e.g.
      // Android TalkBack) has no touch identifier and still needs to count.
      const identifier: unknown = event.nativeEvent.identifier;
      if (Platform.OS === 'web' || (typeof identifier !== 'number' && typeof identifier !== 'string')) activate();
    }}
    onAccessibilityTap={activate}
    style={{ width: size, height: size, borderRadius: size / 2 }}>
    <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.counter, { width: size, height: size }, feedbackStyle]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={size / 2 - 26} fill="#003527" stroke="#146148" strokeWidth={1} />
        <Circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#003527" strokeWidth={10} />
      </Svg>
      <TasbeehProgressRing key={zikrId} count={count} target={target} size={size} reduceMotion={reduceMotion} />
      <View style={styles.counterText}>
        <NativeCountdownText text={String(count)} seconds={count} color={MINT} fontSize={65} lineHeight={72}
          scale={numberScale} width={numberWidth} animate={!reduceMotion} reduceMotion={reduceMotion} countsDown={transition.countsDown} />
        <Text style={styles.countTarget}>/ {target}</Text>
        <View style={styles.tapRow}><Hand size={16} color="#95D3BA" /><Text style={styles.tapText}>SANASH UCHUN TEGING</Text></View>
      </View>
    </Animated.View>
  </Pressable>;
}

const styles = StyleSheet.create({
  counter: { alignItems: 'center', justifyContent: 'center' },
  counterText: { alignItems: 'center' },
  countTarget: { color: '#95D3BA', fontSize: 18, fontWeight: '600' },
  tapRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
  tapText: { color: '#95D3BA', fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
});
