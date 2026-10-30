package uz.halovat.focus

import org.junit.Assert.*
import org.junit.Test
import kotlin.math.cos
import kotlin.math.sin

class CompassMathTest {
  @Test fun wrapsNegativeAndMultipleTurns() {
    assertEquals(359.0, CompassMath.normalize(-721.0), 0.0001)
    assertEquals(1.0, CompassMath.normalize(721.0), 0.0001)
  }
  @Test fun crossesNorthWithoutFullRotation() {
    assertEquals(0.0, CompassMath.smooth(359.0, 1.0, 0.5), 0.0001)
    assertEquals(0.0, CompassMath.smooth(1.0, 359.0, 0.5), 0.0001)
  }
  @Test fun beginsAtRealHeadingAndConverges() {
    assertEquals(270.0, CompassMath.smooth(null, -90.0), 0.0001)
    var value: Double? = 90.0
    repeat(30) { value = CompassMath.smooth(value, 180.0) }
    assertEquals(180.0, value!!, 0.01)
  }

  // Device-to-world matrix for a clockwise yaw and lifting the screen's top edge.
  private fun rotation(heading: Double, tilt: Double): FloatArray {
    val h = Math.toRadians(heading); val t = Math.toRadians(tilt)
    val c = cos(h); val s = sin(h); val ct = cos(t); val st = sin(t)
    return doubleArrayOf(c, s * ct, -s * st, -s, c * ct, -c * st, 0.0, st, ct).map { it.toFloat() }.toFloatArray()
  }

  @Test fun headingTracksRepeatedTurnsAcrossNorthAtEveryPhoneTilt() {
    for (turn in -720..1080 step 5) {
      for (tilt in listOf(0.0, 30.0, 59.0, 61.0, 85.0, 90.0, 95.0, -85.0, -90.0)) {
        val heading = CompassMath.heading(rotation(turn.toDouble(), tilt))!!
        val delta = CompassMath.normalize(heading - turn + 180.0) - 180.0
        assertEquals("heading=$turn tilt=$tilt", 0.0, delta, 0.0001)
      }
    }
  }

  @Test fun invalidOrDegenerateMatricesCannotProduceFalseNorth() {
    assertNull(CompassMath.heading(FloatArray(9)))
    assertNull(CompassMath.heading(floatArrayOf(1f)))
    assertNull(CompassMath.heading(rotation(40.0, 45.0).also { it[1] = Float.NaN }))
  }

  @Test fun staleBufferedSamplesAndStalledFallbackSensorsAreRejected() {
    val now = 5_000_000_000L
    assertTrue(CompassMath.isFresh(now, now))
    assertTrue(CompassMath.isFresh(now - 1_000_000_000L, now))
    assertFalse(CompassMath.isFresh(now - 1_000_000_001L, now))
    assertFalse(CompassMath.isFresh(now + 1, now))
    assertFalse(CompassMath.isFresh(0, now))
  }
}
