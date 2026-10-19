import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

/** Only the visible, foreground screen needs a ticking clock. */
export function useForegroundClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => { clearInterval(timer); timer = undefined; };
    const start = () => {
      stop();
      setNow(new Date());
      timer = setInterval(() => setNow(new Date()), intervalMs);
    };
    if (AppState.currentState === 'active') start();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') start(); else stop();
    });
    return () => { stop(); listener.remove(); };
  }, [intervalMs]));
  return now;
}
