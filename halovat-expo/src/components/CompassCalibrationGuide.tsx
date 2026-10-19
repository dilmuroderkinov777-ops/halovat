import { useFocusEffect } from 'expo-router';
import { Compass } from 'lucide-react-native';
import React, { memo, useCallback, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Modal, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from '../ui/AppText';
import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';

const DURATION = 5200;
const STEPS = 128;
const range = Array.from({ length: STEPS + 1 }, (_, index) => index / STEPS);
const horizontal = range.map(value => Math.sin(value * Math.PI * 4) * 88);
const vertical = range.map(value => Math.sin(value * Math.PI * 8) * 36);
const rotation = range.map(value => `${Math.sin(value * Math.PI * 4) * 18}deg`);
const trail = range.slice(0, STEPS / 2 + 1).map((_, index) =>
  `${index === 0 ? 'M' : 'L'}${140 + horizontal[index]},${90 + vertical[index]}`).join(' ');

/** A short guide on every focus; the compass hook keeps warming up underneath. */
export const CompassCalibrationGuide = memo(function CompassCalibrationGuide() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const progress = useRef(new Animated.Value(0)).current;
  const dismiss = useRef<() => void>(() => undefined);
  const [visible, setVisible] = useState(true);

  useFocusEffect(useCallback(() => {
    let focused = true;
    let dismissed = false;
    let reducedMotion = false;
    let animation: Animated.CompositeAnimation | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { clearTimeout(timer); animation?.stop(); };
    const finish = () => {
      dismissed = true;
      stop();
      if (focused) setVisible(false);
    };
    const play = () => {
      stop();
      if (!focused || dismissed || AppState.currentState !== 'active') return;
      progress.setValue(0);
      timer = setTimeout(finish, DURATION);
      if (!reducedMotion) {
        animation = Animated.timing(progress, {
          toValue: 1, duration: DURATION, easing: Easing.linear,
          useNativeDriver: true, isInteraction: false,
        });
        animation.start();
      }
    };
    dismiss.current = finish;
    setVisible(true);
    play();
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (focused && !dismissed) { reducedMotion = value; if (value) play(); }
    }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      reducedMotion = value;
      play();
    });
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') play(); else stop();
    });
    return () => {
      focused = false;
      stop();
      motion.remove();
      appState.remove();
      setVisible(false);
    };
  }, [progress]));

  return <Modal transparent visible={visible} animationType="fade" onRequestClose={() => dismiss.current()}>
    <View style={styles.backdrop}>
      <View style={styles.card} accessibilityViewIsModal>
        <View style={styles.badge}><Compass size={17} color={colors.green} /><Text style={styles.badgeText}>Kompasni tayyorlash</Text></View>
        <Text accessibilityRole="header" style={styles.title}>Telefonni 8 shaklida aylantiring</Text>
        <View style={styles.illustration} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Svg width={280} height={180} viewBox="0 0 280 180">
            <Path d={trail} fill="none" stroke={colors.green} strokeWidth={3} strokeDasharray="5 7" opacity={0.24} strokeLinecap="round" />
          </Svg>
          <Animated.View style={[styles.phone, {
            borderColor: colors.green, backgroundColor: colors.paper,
            transform: [
              { translateX: progress.interpolate({ inputRange: range, outputRange: horizontal }) },
              { translateY: progress.interpolate({ inputRange: range, outputRange: vertical }) },
              { rotate: progress.interpolate({ inputRange: range, outputRange: rotation }) },
            ],
          }]}>
            <View style={[styles.speaker, { backgroundColor: colors.green }]} />
            <Compass size={21} color={colors.green} />
            <View style={[styles.homeIndicator, { backgroundColor: colors.green }]} />
          </Animated.View>
        </View>
        <Text style={styles.instructions}>Telefonni havoda sakkiz shaklida 2–3 marta ohista aylantiring. Keyin tekis ushlab, Qibla tomoniga buring.</Text>
        <Pressable accessibilityRole="button" onPress={() => dismiss.current()} style={styles.button}>
          <Text style={styles.buttonText}>Kompasga o‘tish</Text>
        </Pressable>
      </View>
    </View>
  </Modal>;
});

const baseStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#001F19A8', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 360, borderRadius: 28, backgroundColor: '#FFFFFF', paddingHorizontal: 22, paddingVertical: 26, alignItems: 'center', gap: 17 },
  badge: { backgroundColor: '#E9F2EC', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 7 },
  badgeText: { color: '#006C49', fontSize: 11, fontWeight: '700' },
  title: { color: '#003527', fontSize: 22, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  illustration: { width: 280, height: 180, alignItems: 'center', justifyContent: 'center' },
  phone: { position: 'absolute', left: 121, top: 57, width: 38, height: 66, borderWidth: 2.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  speaker: { position: 'absolute', top: 5, width: 12, height: 2, borderRadius: 2, opacity: 0.7 },
  homeIndicator: { position: 'absolute', bottom: 5, width: 12, height: 2, borderRadius: 2, opacity: 0.4 },
  instructions: { color: '#545F58', fontSize: 13, lineHeight: 21, textAlign: 'center' },
  button: { minHeight: 48, alignSelf: 'stretch', borderRadius: 24, backgroundColor: '#006C49', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
