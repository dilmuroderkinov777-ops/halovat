export type CompassSample = { heading: number; accuracy: number; trueNorth: boolean };

/** Ten sensor targets/sec, independent of React's slower numeric label updates. */
export function createCompassMotion() {
  let current: CompassSample | null = null;
  const listeners = new Set<(sample: CompassSample | null) => void>();
  return {
    current: () => current,
    publish(sample: CompassSample | null) {
      current = sample;
      listeners.forEach(listener => listener(sample));
    },
    subscribe(listener: (sample: CompassSample | null) => void) {
      listeners.add(listener);
      listener(current);
      return () => { listeners.delete(listener); };
    },
  };
}

export type CompassMotion = ReturnType<typeof createCompassMotion>;
