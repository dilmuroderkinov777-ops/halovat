package uz.halovat.focus

import kotlin.math.atan2
import kotlin.math.hypot

internal object CompassMath {
  fun normalize(degrees: Double) = ((degrees % 360.0) + 360.0) % 360.0
  fun smooth(previous: Double?, next: Double, weight: Double = 0.35): Double =
    if (previous == null) normalize(next)
    else normalize(previous + (normalize(next - previous + 180.0) - 180.0) * weight)

  fun isFresh(timestamp: Long, now: Long): Boolean = timestamp > 0L && now - timestamp in 0L..1_000_000_000L

  fun headingAccuracy(error: Double): Int = when {
    !error.isFinite() || error < 0.0 || error >= 180.0 -> 0
    error <= 10.0 -> 3
    error <= 20.0 -> 2
    else -> 1
  }

  /** Android's remapped matrix maps screen axes into east/north/up coordinates. */
  fun heading(rotation: FloatArray): Double? {
    if (rotation.size != 9 || rotation.any { !it.isFinite() }) return null
    // Derive screen-up's bearing from the horizontal screen-right axis. Unlike
    // switching between Y and Z at a tilt threshold, this stays continuous when
    // lifting the phone upright, including combined pitch and screen roll.
    val east = rotation[0].toDouble()
    val north = rotation[3].toDouble()
    // With screen-right almost vertical, yaw is undefined. Reject it rather than
    // inventing a direction by switching axes (or amplifying near-zero noise).
    if (hypot(east, north) < 0.1) return null
    return normalize(-Math.toDegrees(atan2(north, east)))
  }
}
