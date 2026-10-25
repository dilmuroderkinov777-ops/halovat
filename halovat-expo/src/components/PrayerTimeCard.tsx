import { useFocusEffect } from 'expo-router';
import { Check, Moon, Sun, Sunrise, Sunset, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { formatTime, type PrayerClock, type PrayerId, type PrayerStatus } from '../domain/prayers';
import { Text } from '../ui/AppText';
import { Colors } from '../ui/theme';
import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';

type Props = {
  prayer: PrayerClock;
  day: Date;
  status?: PrayerStatus;
  active: boolean;
  onToggle: (day: Date, prayer: PrayerId) => void;
};
const icons = { fajr: Sunrise, dhuhr: Sun, asr: Sun, maghrib: Sunset, isha: Moon };

export const PrayerTimeCard = memo(function PrayerTimeCard({ prayer, day, status, active, onToggle }: Props) {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
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
  const Icon = icons[prayer.id];
  const cardState = status === 'done' ? styles.done : status === 'missed' ? styles.missed : active ? styles.active : null;

  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${prayer.name} ${formatTime(prayer.at)}${status === 'done' ? ', o‘qilgan' : status === 'missed' ? ', qazo' : active ? ', hozirgi namoz' : ''}`}
    unstable_pressDelay={0}
    onTouchStart={() => showPressed(true)}
    onTouchEnd={() => showPressed(false)}
    onTouchCancel={() => showPressed(false)}
    onPressIn={() => showPressed(true)} onPressOut={() => showPressed(false)}
    // Feedback starts on contact; commit only a valid tap so scrolling never marks a prayer.
    onPress={() => onToggle(day, prayer.id)} style={styles.slot}>
    <Animated.View pointerEvents="none" style={[styles.card, cardState, feedback]}>
      <Text numberOfLines={1} style={[styles.name, active && !status && styles.nameActive]}>{prayer.name}</Text>
      <Text style={[styles.time, active && styles.timeActive]}>{formatTime(prayer.at)}</Text>
      <View style={[styles.status, status === 'done' ? styles.statusDone : status === 'missed' ? styles.statusMissed : active ? styles.statusActive : styles.statusDefault]}>
        {status === 'done' ? <Check size={13} color={colors.green} strokeWidth={3} /> : status === 'missed' ? <X size={13} color="#FFFFFF" strokeWidth={3} /> : <Icon size={15} color={active ? '#FFFFFF' : prayer.color} strokeWidth={2} />}
      </View>
    </Animated.View>
  </Pressable>;
});

const baseStyles = StyleSheet.create({
  slot: { flex: 1, minWidth: 0 },
  card: { height: 94, borderRadius: 17, backgroundColor: '#F4F4F0', paddingVertical: 9, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'space-between', borderColor: 'transparent', borderWidth: 1 },
  active: { backgroundColor: '#DDF8EB', borderColor: '#DDF8EB' },
  done: { backgroundColor: '#F4F4F0', borderColor: '#F4F4F0' },
  missed: { backgroundColor: '#FFF0ED', borderColor: '#F5C5C0' },
  name: { color: Colors.body, fontSize: 10, fontWeight: '500' },
  nameActive: { color: Colors.green, fontWeight: '700' },
  time: { color: Colors.ink, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timeActive: { color: Colors.green },
  status: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusDone: { backgroundColor: '#EFF2ED' },
  statusMissed: { backgroundColor: Colors.red },
  statusActive: { backgroundColor: '#006C49' },
  statusDefault: { backgroundColor: '#E9E8E4' },
});
