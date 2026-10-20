import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** Play on a fresh launch and after leaving the app, without replaying for inactive dialogs. */
export function useLaunchAnimation() {
  const [launch, setLaunch] = useState({ visible: true, revision: 0 });
  const backgrounded = useRef(false);
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state === 'background') backgrounded.current = true;
      if (state === 'active' && backgrounded.current) {
        backgrounded.current = false;
        setLaunch(current => ({ visible: true, revision: current.revision + 1 }));
      }
    });
    return () => listener.remove();
  }, []);
  const onFinished = useCallback(() => setLaunch(current => current.revision === launch.revision
    ? { ...current, visible: false } : current), [launch.revision]);
  return { ...launch, onFinished };
}
