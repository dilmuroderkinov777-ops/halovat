import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { useForegroundClock } from '../hooks/useForegroundClock';
import { NativeCountdownText } from './NativeCountdownText';

export function NativeCountdown({ until, onComplete }: { until: number; onComplete: () => void }) {
  const { now } = useForegroundClock();
  const seconds = Math.max(0, Math.ceil((until - now.getTime()) / 1000));
  const text = `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const [reduceMotion, setReduceMotion] = useState(true);
  const completed = useRef<number | undefined>(undefined);
  const [transition, setTransition] = useState({ until, seconds, animate: false });
  if (transition.until !== until || transition.seconds !== seconds) {
    setTransition({ until, seconds, animate: transition.until === until && transition.seconds - seconds === 1 });
  }
  const animate = !reduceMotion && transition.animate;

  useEffect(() => {
    let active = true;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (active) setReduceMotion(value);
    }).catch(() => undefined);
    return () => { active = false; listener.remove(); };
  }, []);

  useEffect(() => {
    if (seconds === 0 && completed.current !== until) {
      completed.current = until;
      onComplete();
    }
  }, [onComplete, seconds, until]);

  return <View accessible accessibilityRole="text" accessibilityLabel={text} accessibilityLiveRegion="none">
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
      <NativeCountdownText text={text} seconds={seconds} animate={animate} reduceMotion={reduceMotion} />
    </View>
  </View>;
}

const styles = StyleSheet.create({ content: { overflow: 'hidden' } });
