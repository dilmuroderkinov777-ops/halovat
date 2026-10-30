import { useCallback, useState } from 'react';

/** Play once per app root; foregrounding an existing session keeps its screen. */
export function useLaunchAnimation() {
  const [visible, setVisible] = useState(true);
  const onFinished = useCallback(() => setVisible(false), []);
  return { visible, onFinished };
}
