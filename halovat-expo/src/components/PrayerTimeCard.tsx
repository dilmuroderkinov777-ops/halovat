import { useFocusEffect } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, View } from 'react-native';
import { PRAYER_HERO } from '../data/prayerHero';
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
  return <Pressable accessibilityRole="button"
    accessibilityLabel={`${prayer.name} ${formatTime(prayer.at)}${status === 'done' ? ', o‘qilgan' : status === 'missed' ? ', qazo' : active ? ', hozirgi namoz' : ''}`}
    unstable_pressDelay={0}
    onTouchStart={() => showPressed(true)}
    onTouchEnd={() => showPressed(false)}
    onTouchCancel={() => showPressed(false)}
    onPressIn={() => showPressed(true)} onPressOut={() => showPressed(false)}
    // Feedback starts on contact; commit only a valid tap so scrolling never marks a prayer.
    onPress={() => onToggle(day, prayer.id)} style={styles.slot}>
    <Animated.View pointerEvents="none" style={[styles.card, active && { borderColor: colors.green + '55' }, feedback]}>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.name, active && styles.nameActive]}>{prayer.name}</Text>
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.time, active && { color: colors.green }]}>{formatTime(prayer.at)}</Text>
      <Image accessible={false} source={PRAYER_HERO[prayer.id].image} resizeMode="contain" style={styles.art} />
      <View style={styles.statusPosition}>
        <View style={[styles.status, status === 'missed' && styles.statusMissed]}>
          {status === 'done' ? <Check size={13} color={colors.green} strokeWidth={3} /> : status === 'missed' ? <X size={13} color={colors.red} strokeWidth={3} /> : <View style={[styles.pendingDot, active && { backgroundColor: colors.green }]} />}
        </View>
      </View>
    </Animated.View>
  </Pressable>;
});

const baseStyles = StyleSheet.create({
  slot: { flex: 1, minWidth: 0 },
  card: { minHeight: 142, borderRadius: 17, overflow: 'hidden', backgroundColor: '#F4F4F0', borderColor: Colors.line, borderWidth: 1, paddingTop: 10, paddingHorizontal: 3, paddingBottom: 90, gap: 6, alignItems: 'center' },
  name: { color: Colors.body, fontSize: 10, fontWeight: '500' },
  nameActive: { fontWeight: '700' },
  time: { color: Colors.ink, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  art: { position: 'absolute', width: '120%', height: 70, left: '-10%', bottom: -14 },
  statusPosition: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  status: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF2ED' },
  statusMissed: { backgroundColor: Colors.redSoft },
  pendingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.muted },
});
