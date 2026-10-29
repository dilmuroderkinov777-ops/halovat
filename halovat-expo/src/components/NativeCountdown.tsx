import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useForegroundClock } from '../hooks/useForegroundClock';
import { Text } from '../ui/AppText';
import { NativeCountdownText } from './NativeCountdownText';

const UNIT_WIDTH = 60;
const SEPARATOR_WIDTH = 12;
const COUNTDOWN_WIDTH = UNIT_WIDTH * 3 + SEPARATOR_WIDTH * 2;
const LABELS = ['SOAT', 'DAQIQA', 'SONIYA'];

export function NativeCountdown({ until, onComplete, labelColor = '#B0F0D6' }: { until: number; onComplete: () => void; labelColor?: string }) {
  const { now } = useForegroundClock();
  const { fontScale } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(COUNTDOWN_WIDTH);
  const scale = Math.min(fontScale, availableWidth / COUNTDOWN_WIDTH);
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

  return <View accessible accessibilityRole="text" accessibilityLabel={text} accessibilityLiveRegion="none"
    onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.content}>
      {text.split(':').map((part, index) => <React.Fragment key={LABELS[index]}>
        {index > 0 && <Text translate={false} allowFontScaling={false} style={[
          styles.separator, { width: SEPARATOR_WIDTH * scale, fontSize: 49 * scale, lineHeight: 57 * scale },
        ]}>:</Text>}
        <View style={[styles.unit, { width: UNIT_WIDTH * scale }]}>
          <NativeCountdownText text={part} seconds={seconds} animate={animate} reduceMotion={reduceMotion}
            scale={scale} width={UNIT_WIDTH * scale} />
          <Text allowFontScaling={false} style={[styles.label, { color: labelColor, fontSize: 11 * scale, letterSpacing: 0.65 * scale }]}>{LABELS[index]}</Text>
        </View>
      </React.Fragment>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  content: { flexDirection: 'row', direction: 'ltr', alignSelf: 'flex-start', overflow: 'hidden' },
  unit: { alignItems: 'center' },
  separator: { color: '#FFFFFF', fontWeight: '700', textAlign: 'center' },
  label: { color: '#B0F0D6', fontWeight: '500', textAlign: 'center' },
});
