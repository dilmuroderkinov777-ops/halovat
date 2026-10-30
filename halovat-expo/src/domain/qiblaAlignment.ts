import { relativeBearing } from './qibla';

export const ALIGN_ENTER = 5;
export const ALIGN_LEAVE = 12;

/** Direction and sensor confidence are separate: warnings must not reverse the guidance. */
export function isQiblaAligned(angle: number | null) {
  return angle !== null && Number.isFinite(angle) && Math.abs(angle) <= ALIGN_ENTER;
}

/** Hysteresis prevents sensor noise at the boundary from repeatedly vibrating. */
export function createQiblaAlignment() {
  let latched = false;
  let lastFeedback = -Infinity;
  return (bearing: number, heading: number | null, reliable: boolean, now: number) => {
    const valid = reliable && heading !== null && Number.isFinite(heading) && Number.isFinite(bearing);
    if (!valid) {
      latched = false;
      return { aligned: false, feedback: false };
    }
    const distance = Math.abs(relativeBearing(bearing, heading));
    if (distance > ALIGN_LEAVE) latched = false;
    const entering = !latched && isQiblaAligned(distance);
    if (entering) latched = true;
    const feedback = entering && now - lastFeedback >= 1800;
    if (feedback) lastFeedback = now;
    return { aligned: latched, feedback };
  };
}
