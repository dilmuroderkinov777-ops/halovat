package uz.halovat.focus

internal object CompassMath {
  fun normalize(degrees: Double) = ((degrees % 360.0) + 360.0) % 360.0
  fun smooth(previous: Double?, next: Double, weight: Double = 0.35): Double =
    if (previous == null) normalize(next)
    else normalize(previous + (normalize(next - previous + 180.0) - 180.0) * weight)
}
