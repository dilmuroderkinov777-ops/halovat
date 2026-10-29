import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Check, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { PRAYER_HERO } from '../data/prayerHero';
import { formatTime, type PrayerClock, type PrayerId, type PrayerStatus } from '../domain/prayers';
import { Text } from '../ui/AppText';

type Props = {
  prayer: PrayerClock;
  day: Date;
  status?: PrayerStatus;
  active: boolean;
  onToggle: (day: Date, prayer: PrayerId) => void;
};
export const PrayerTimeCard = memo(function PrayerTimeCard({ prayer, day, status, active, onToggle }: Props) {
  const theme = PRAYER_HERO[prayer.id];
  const [motion] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(true);
  const pressed = useRef(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReduceMotion(value);
    }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; listener.remove(); };
  }, []);

  useFocusEffect(useCallback(() => () => {
    pressed.current = false;
    motion.stopAnimation();
    motion.setValue(0);
  }, [motion]));

  useEffect(() => {
    if (reduceMotion) { motion.stopAnimation(); motion.setValue(pressed.current ? 1 : 0); }
  }, [motion, reduceMotion]);

  const showPressed = useCallback((value: boolean) => {
    if (pressed.current === value) return;
    pressed.current = value;
    motion.stopAnimation();
    if (reduceMotion) { motion.setValue(value ? 1 : 0); return; }
    if (value) {
      Animated.timing(motion, { toValue: 1, duration: 65, easing: Easing.out(Easing.quad), useNativeDriver: true, isInteraction: false }).start();
    } else {
      Animated.spring(motion, { toValue: 0, stiffness: 450, damping: 28, mass: 0.65, useNativeDriver: true, isInteraction: false }).start();
    }
  }, [motion, reduceMotion]);
  const feedback = useMemo(() => ({
    transform: reduceMotion ? undefined : [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96], extrapolate: 'clamp' }) }],
    opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 0.87], extrapolate: 'clamp' }),
  }), [motion, reduceMotion]);
  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${prayer.name} ${formatTime(prayer.at)}${status === 'done' ? ', o‘qilgan' : status === 'missed' ? ', qazo' : active ? ', hozirgi namoz' : ''}`}
    unstable_pressDelay={0}
    onTouchStart={() => showPressed(true)}
    onTouchEnd={() => showPressed(false)}
    onTouchCancel={() => showPressed(false)}
    onPressIn={() => showPressed(true)} onPressOut={() => showPressed(false)}
    // Feedback starts on contact; commit only a valid tap so scrolling never marks a prayer.
    onPress={() => onToggle(day, prayer.id)} style={styles.slot}>
    <Animated.View pointerEvents="none" style={[styles.card, active && { borderColor: theme.accent }, feedback]}>
      <LinearGradient colors={theme.colors} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
        <View style={[styles.glowTop, { backgroundColor: theme.accent + '18' }]} />
        <View style={[styles.glowBottom, { backgroundColor: theme.accent + '12' }]} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.name, active && styles.nameActive]}>{prayer.name}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.time, active && { color: theme.accent }]}>{formatTime(prayer.at)}</Text>
        <Image accessible={false} source={theme.image} resizeMode="contain" style={styles.art} />
        <View style={[styles.status, status === 'missed' && styles.statusMissed]}>
          {status === 'done' ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : status === 'missed' ? <X size={12} color="#FFFFFF" strokeWidth={3} /> : <View style={[styles.pendingDot, active && { backgroundColor: theme.accent }]} />}
        </View>
      </LinearGradient>
    </Animated.View>
  </Pressable>;
});

const styles = StyleSheet.create({
  slot: { flex: 1, minWidth: 0 },
  card: { borderRadius: 17, overflow: 'hidden', backgroundColor: '#252C55', borderColor: '#FFFFFF24', borderWidth: 1.5 },
  fill: { minHeight: 142, paddingVertical: 10, paddingHorizontal: 3, gap: 6, alignItems: 'center', justifyContent: 'space-between' },
  glowTop: { position: 'absolute', width: 80, height: 80, borderRadius: 40, top: -48, right: -35 },
  glowBottom: { position: 'absolute', width: 65, height: 65, borderRadius: 33, bottom: -48, left: -22 },
  name: { color: '#FFFFFFD9', fontSize: 10, fontWeight: '500' },
  nameActive: { fontWeight: '700' },
  time: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  art: { width: '100%', height: 56 },
  status: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF26' },
  statusMissed: { backgroundColor: '#BA1A1A' },
  pendingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF80' },
});
