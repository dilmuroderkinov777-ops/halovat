import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

/** Only the visible, foreground screen needs a ticking clock. */
export function useForegroundClock(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  const refresh = useCallback(() => setNow(new Date()), []);
  useFocusEffect(useCallback(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => { clearTimeout(timer); timer = undefined; };
    const tick = () => {
      refresh();
      // Re-align with wall-clock boundaries after each tick instead of
      // accumulating interval drift. Prayer deadlines use the same clock.
      timer = setTimeout(tick, intervalMs - Date.now() % intervalMs);
    };
    const start = () => {
      stop();
      tick();
    };
    if (AppState.currentState === 'active') start();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') start(); else stop();
    });
    return () => { stop(); listener.remove(); };
  }, [intervalMs, refresh]));
  return { now, refresh };
}
