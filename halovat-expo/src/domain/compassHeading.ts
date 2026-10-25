export function headingDelta(from: number, to: number) {
  return ((to - from + 540) % 360 + 360) % 360 - 180;
}

export const HEADING_STABILITY = 1;

/** Ignore sub-degree noise; native animation handles smoothing and settling. */
export function createHeadingFilter() {
  let displayed: number | undefined;
  return (heading: number) => {
    const normalized = ((heading % 360) + 360) % 360;
    if (displayed === undefined || Math.abs(headingDelta(displayed, normalized)) > HEADING_STABILITY) displayed = normalized;
    return displayed;
  };
}
