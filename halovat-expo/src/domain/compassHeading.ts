export function headingDelta(from: number, to: number) {
  return ((to - from + 540) % 360 + 360) % 360 - 180;
}

export const HEADING_STABILITY = 1;

/** Ignore sub-degree noise; display animation handles smoothing and settling. */
export function createHeadingFilter() {
  let displayed: number | undefined;
  return (heading: number) => {
    const normalized = ((heading % 360) + 360) % 360;
    if (displayed === undefined || Math.abs(headingDelta(displayed, normalized)) > HEADING_STABILITY) displayed = normalized;
    return displayed;
  };
}

/** A critically damped angular spring keeps its velocity between sensor targets. */
export function createHeadingSpring() {
  let heading: number | null = null;
  let target = 0;
  let velocity = 0;
  const frequency = 18;
  const reset = (value: number | null) => {
    heading = value;
    target = value ?? 0;
    velocity = 0;
  };
  return {
    current: () => heading,
    target: () => target,
    moving: () => heading !== null && (heading !== target || velocity !== 0),
    reset,
    setTarget(value: number | null) {
      if (value === null || heading === null) reset(value);
      else target += headingDelta(target, value);
    },
    advance(seconds: number, reduceMotion = false) {
      if (heading === null) return null;
      if (reduceMotion) { reset(target); return heading; }
      const dt = Math.max(0, seconds);
      const offset = heading - target;
      const momentum = velocity + frequency * offset;
      const decay = Math.exp(-frequency * dt);
      // Exact spring integration stays stable across different display refresh rates.
      heading = target + (offset + momentum * dt) * decay;
      velocity = (velocity - frequency * momentum * dt) * decay;
      if (Math.abs(target - heading) < 0.02 && Math.abs(velocity) < 0.2) reset(target);
      return heading;
    },
  };
}
