import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, ClipPath, Defs, G, Line, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const GREEN = '#064e3b';
const EMERALD = '#10b981';
const CREAM = '#faf9f5';
const AMBER = '#f59e0b';

// react-native-svg does not expose HTML's normalized pathLength attribute.
// Measure the reference's cubic curves in SVG units for the same dash reveal.
function curveLength(points: [number, number][]) {
  let length = 0;
  let previous = points[0];
  for (let step = 1; step <= 200; step += 1) {
    const t = step / 200;
    const u = 1 - t;
    const next: [number, number] = [0, 1].map(axis =>
      u ** 3 * points[0][axis] + 3 * u ** 2 * t * points[1][axis]
      + 3 * u * t ** 2 * points[2][axis] + t ** 3 * points[3][axis],
    ) as [number, number];
    length += Math.hypot(next[0] - previous[0], next[1] - previous[1]);
    previous = next;
  }
  return length;
}

const OUTER_LENGTH = 224 + 2 * curveLength([[20, 112], [20, 72], [60, 46], [100, 10]]);
const INNER_LENGTH = 216 + 2 * curveLength([[36, 116], [36, 82], [68, 60], [100, 32]]);
const riseEase = Easing.bezier(0.2, 0.7, 0.2, 1);
const drawEase = Easing.bezier(0.5, 0, 0.2, 1);
const gentleEase = Easing.bezier(0.42, 0, 0.58, 1);

type Props = { fontsReady: boolean; appReady: boolean; onFinished: () => void; onReady: () => void };

/** Native rendition of “Halovat — loading screen.html”, with its original copy and timing. */
export function LoadingScreen({ fontsReady, appReady, onFinished, onReady }: Props) {
  const insets = useSafeAreaInsets();
  const [reducedMotion, setReducedMotion] = useState<boolean | null>(null);
  const [entranceDone, setEntranceDone] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [motion] = useState(() => ({
    outer: new Animated.Value(OUTER_LENGTH),
    inner: new Animated.Value(INNER_LENGTH),
    horizon: new Animated.Value(0),
    sun: new Animated.Value(208),
    glow: new Animated.Value(0),
    breath: new Animated.Value(0.92),
    letters: Array.from({ length: 7 }, () => new Animated.Value(0)),
    beads: Array.from({ length: 5 }, () => new Animated.Value(0)),
  }));
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReducedMotion(value);
    }).catch(() => { if (mounted) setReducedMotion(false); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!fontsReady || !laidOut || reducedMotion === null) return;
    onReady();
    if (reducedMotion) {
      motion.outer.setValue(0);
      motion.inner.setValue(0);
      motion.horizon.setValue(0.5);
      motion.sun.setValue(104);
      motion.glow.setValue(0.2);
      motion.breath.setValue(1);
      motion.letters.forEach(letter => letter.setValue(1));
      motion.beads.forEach(bead => bead.setValue(0.15));
      return;
    }
    const timing = (value: Animated.Value, toValue: number, duration: number, delay = 0, easing = riseEase, native = false) =>
      Animated.timing(value, { toValue, duration, delay, easing, useNativeDriver: native, isInteraction: false });
    const entrance = Animated.parallel([
      timing(motion.outer, 0, 1100, 0, drawEase),
      timing(motion.inner, 0, 1100, 350, drawEase),
      timing(motion.horizon, 0.5, 500, 200, Easing.out(Easing.ease)),
      timing(motion.sun, 104, 1500, 550),
      timing(motion.glow, 0.2, 600, 1700, Easing.out(Easing.ease)),
      ...motion.letters.map((letter, index) => timing(letter, 1, 650, 1000 + index * 70, riseEase, true)),
      Animated.delay(3200),
    ]);
    const loops = Animated.parallel([
      Animated.sequence([
        Animated.delay(2300),
        Animated.loop(Animated.sequence([
          timing(motion.breath, 1.18, 1300, 0, gentleEase),
          timing(motion.breath, 0.92, 1300, 0, gentleEase),
        ])),
      ]),
      ...motion.beads.map((bead, index) => Animated.sequence([
        Animated.delay(1600 + index * 320),
        Animated.loop(timing(bead, 1, 3200, 0, Easing.linear)),
      ])),
    ]);
    entrance.start(({ finished }) => { if (finished) setEntranceDone(true); });
    loops.start();
    return () => { entrance.stop(); loops.stop(); };
  }, [fontsReady, laidOut, motion, onReady, reducedMotion]);

  useEffect(() => {
    if (!appReady || !fontsReady || (!entranceDone && reducedMotion !== true)) return;
    const fade = Animated.timing(opacity, {
      toValue: 0, duration: reducedMotion ? 0 : 180, useNativeDriver: true, isInteraction: false,
    });
    fade.start(({ finished }) => { if (finished) onFinished(); });
    return () => fade.stop();
  }, [appReady, entranceDone, fontsReady, onFinished, opacity, reducedMotion]);

  return (
    <Animated.View onLayout={() => setLaidOut(true)} style={[styles.screen, { opacity }]} accessibilityRole="image" accessibilityLabel="Halovat yuklanmoqda">
      <StatusBar style="light" />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} accessible={false}>
        <Defs>
          <RadialGradient id="loading-background" cx="50%" cy="40%" rx="70%" ry="42%">
            <Stop offset="0" stopColor={EMERALD} stopOpacity={0.28} />
            <Stop offset="0.72" stopColor={EMERALD} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#loading-background)" />
      </Svg>
      <View style={styles.logo} pointerEvents="none" accessible={false}>
        <Svg width={176} height={211.2} viewBox="0 0 200 240" accessible={false}>
          <Defs><ClipPath id="loading-sun-clip"><Rect x={-10} y={-10} width={220} height={200} /></ClipPath></Defs>
          <AnimatedPath d="M20 224V112C20 72 60 46 100 10C140 46 180 72 180 112V224"
            fill="none" stroke={CREAM} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={[OUTER_LENGTH, OUTER_LENGTH]} strokeDashoffset={motion.outer} />
          <AnimatedPath d="M36 224V116C36 82 68 60 100 32C132 60 164 82 164 116V224"
            fill="none" stroke={EMERALD} strokeWidth={1.4} opacity={0.8} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={[INNER_LENGTH, INNER_LENGTH]} strokeDashoffset={motion.inner} />
          <G clipPath="url(#loading-sun-clip)">
            <AnimatedCircle cx={100} cy={motion.sun} r={Animated.multiply(motion.breath, 34)} fill={AMBER} opacity={motion.glow} />
            <AnimatedCircle cx={100} cy={motion.sun} r={16} fill={AMBER} />
          </G>
          <AnimatedLine x1={20} y1={190} x2={180} y2={190} stroke={CREAM} strokeWidth={1.6} strokeLinecap="round" opacity={motion.horizon} />
        </Svg>
        <View style={styles.word}>
          {'Halovat'.split('').map((letter, index) => <Animated.Text key={index} allowFontScaling={false}
            style={[styles.letter, fontsReady && { fontFamily: 'PlusJakartaSans_800ExtraBold' }, {
              opacity: motion.letters[index],
              transform: [{ translateY: motion.letters[index].interpolate({ inputRange: [0, 1], outputRange: [25.3, 0] }) }],
            }]}>{letter}</Animated.Text>)}
        </View>
      </View>
      <View style={[styles.beads, { bottom: 88 + insets.bottom }]} pointerEvents="none" accessible={false}>
        <View style={styles.thread} />
        {motion.beads.map((bead, index) => <Animated.View key={index} style={[styles.bead, {
          backgroundColor: bead.interpolate({ inputRange: [0, 0.08, 0.78, 0.9, 1], outputRange: ['#10b98100', EMERALD, EMERALD, '#10b98100', '#10b98100'], easing: gentleEase }),
          borderColor: bead.interpolate({ inputRange: [0, 0.08, 0.78, 0.9, 1], outputRange: ['rgba(250,249,245,0.35)', EMERALD, EMERALD, 'rgba(250,249,245,0.35)', 'rgba(250,249,245,0.35)'], easing: gentleEase }),
          transform: [{ scale: bead.interpolate({ inputRange: [0, 0.08, 0.15, 1], outputRange: [1, 1.4, 1, 1], easing: gentleEase }) }],
        }]} />)}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  logo: { alignItems: 'center', gap: 30 },
  word: { flexDirection: 'row' },
  letter: { color: CREAM, fontSize: 46, lineHeight: 46, letterSpacing: -1.15, fontWeight: '800', includeFontPadding: false },
  beads: { position: 'absolute', flexDirection: 'row', gap: 16 },
  thread: { position: 'absolute', left: 6, right: 6, top: 6, height: 1, backgroundColor: 'rgba(250,249,245,0.16)' },
  bead: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
});
