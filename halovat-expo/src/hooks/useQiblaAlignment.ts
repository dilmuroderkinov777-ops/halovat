import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useIsFocused } from 'expo-router';
import { createQiblaAlignment } from '../domain/qiblaAlignment';
import type { CompassMotion } from '../domain/compassMotion';

export function useQiblaActive() {
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  return focused && foreground;
}

export function useQiblaAlignment(motion: CompassMotion, bearing: number, active: boolean) {
  const [tracker] = useState(createQiblaAlignment);
  const [aligned, setAligned] = useState(false);
  useEffect(() => motion.subscribe(sample => {
    // Confidence is shown as a separate warning, not a veto on the visible alignment.
    const result = tracker(bearing, sample?.heading ?? null, active);
    setAligned(result.aligned);
    if (result.feedback) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {
      // Alignment remains visible on devices without haptic support.
    });
  }), [active, bearing, motion, tracker]);
  return active && aligned;
}
