import { relativeBearing } from './qibla';

export const ALIGN_ENTER = 5;
export const ALIGN_LEAVE = 12;

/** Direction and sensor confidence are separate: warnings must not reverse the guidance. */
export function isQiblaAligned(angle: number | null) {
  return angle !== null && Number.isFinite(angle) && Math.abs(angle) <= ALIGN_ENTER;
}

/** Rearm feedback only after a clear turn away; visual alignment still uses ±5°. */
export function createQiblaAlignment() {
  let latched = false;
  return (bearing: number, heading: number | null, active: boolean) => {
    const valid = active && heading !== null && Number.isFinite(heading) && Number.isFinite(bearing);
    if (!valid) {
      latched = false;
      return { aligned: false, feedback: false };
    }
    const distance = Math.abs(relativeBearing(bearing, heading));
    if (distance > ALIGN_LEAVE) latched = false;
    const aligned = isQiblaAligned(distance);
    const feedback = aligned && !latched;
    if (feedback) latched = true;
    return { aligned, feedback };
  };
}
