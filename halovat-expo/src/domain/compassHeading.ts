export function headingDelta(from: number, to: number) {
  return ((to - from + 540) % 360 + 360) % 360 - 180;
}

export const HEADING_STABILITY = 4;

/** Circular, time-based filtering: suppress hand/sensor noise without a north-crossing spin. */
export function createHeadingFilter() {
  let filtered: number | undefined;
  let displayed = 0;
  let previousTime = 0;
  return (heading: number, now: number) => {
    const normalized = ((heading % 360) + 360) % 360;
    if (filtered === undefined) {
      filtered = displayed = normalized;
    } else {
      // Small changes around a settled phone are sensor/hand noise. Do not
      // integrate them into a new direction between sparse native events.
      if (Math.abs(headingDelta(displayed, normalized)) <= HEADING_STABILITY) {
        filtered = displayed;
        previousTime = now;
        return ((displayed % 360) + 360) % 360;
      }
      const elapsed = Math.max(1, Math.min(500, now - previousTime));
      const difference = headingDelta(filtered, normalized);
      const timedAlpha = 1 - Math.exp(-elapsed / 180);
      const alpha = Math.abs(difference) <= 8 ? Math.min(timedAlpha, 0.18)
        : Math.max(timedAlpha, Math.abs(difference) > 35 ? 0.4 : 0);
      filtered += difference * alpha;
      if (Math.abs(filtered - displayed) >= 2) displayed = filtered;
    }
    previousTime = now;
    return ((displayed % 360) + 360) % 360;
  };
}
