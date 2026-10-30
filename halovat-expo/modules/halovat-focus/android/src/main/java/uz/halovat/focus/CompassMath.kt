package uz.halovat.focus

import kotlin.math.atan2
import kotlin.math.hypot

internal object CompassMath {
  fun normalize(degrees: Double) = ((degrees % 360.0) + 360.0) % 360.0
  fun smooth(previous: Double?, next: Double, weight: Double = 0.35): Double =
    if (previous == null) normalize(next)
    else normalize(previous + (normalize(next - previous + 180.0) - 180.0) * weight)

  fun isFresh(timestamp: Long, now: Long): Boolean = timestamp > 0L && now - timestamp in 0L..1_000_000_000L

  /** Android's remapped matrix maps screen axes into east/north/up coordinates. */
  fun heading(rotation: FloatArray): Double? {
    if (rotation.size != 9 || rotation.any { !it.isFinite() }) return null
    var east = rotation[1].toDouble()
    var north = rotation[4].toDouble()
    // The screen's top edge loses its horizontal direction when held upright.
    // Use the outward camera axis there, instead of a near-zero vector that flips.
    if (hypot(east, north) < 0.5) {
      val sign = if (rotation[7] >= 0f) -1 else 1
      east = sign * rotation[2].toDouble()
      north = sign * rotation[5].toDouble()
    }
    if (hypot(east, north) < 0.001) return null
    return normalize(Math.toDegrees(atan2(east, north)))
  }
}
