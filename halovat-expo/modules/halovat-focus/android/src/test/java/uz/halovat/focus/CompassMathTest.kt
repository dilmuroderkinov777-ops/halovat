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

  private fun multiply(left: FloatArray, right: FloatArray) = FloatArray(9) { index ->
    (0..2).sumOf { k -> (left[index / 3 * 3 + k] * right[k * 3 + index % 3]).toDouble() }.toFloat()
  }

  private fun screenRoll(degrees: Double): FloatArray {
    val r = Math.toRadians(degrees); val c = cos(r).toFloat(); val s = sin(r).toFloat()
    return floatArrayOf(c, -s, 0f, s, c, 0f, 0f, 0f, 1f)
  }

  private fun sideRoll(degrees: Double): FloatArray {
    val r = Math.toRadians(degrees); val c = cos(r).toFloat(); val s = sin(r).toFloat()
    return floatArrayOf(c, 0f, s, 0f, 1f, 0f, -s, 0f, c)
  }

  private fun delta(from: Double, to: Double) = CompassMath.normalize(to - from + 180.0) - 180.0

  @Test fun uprightScreenRollCannotSwitchTheHeadingByNinetyDegrees() {
    for (yaw in listOf(0.0, 90.0, 240.0, 359.0)) {
      for (roll in listOf(-60.0, -30.1, -29.9, 0.0, 29.9, 30.1, 60.0)) {
        val heading = CompassMath.heading(multiply(rotation(yaw, 90.0), screenRoll(roll)))!!
        assertEquals("yaw=$yaw roll=$roll", 0.0, delta(yaw, heading), 0.0001)
      }
    }
  }

  @Test fun combinedPitchAndRollStayContinuousAcrossTheOldAxisThreshold() {
    for (roll in listOf(-25.0, 20.0)) {
      var previous = CompassMath.heading(multiply(rotation(240.0, 0.0), sideRoll(roll)))!!
      for (step in 1..1000) {
        val pitch = step / 10.0
        val heading = CompassMath.heading(multiply(rotation(240.0, pitch), sideRoll(roll)))!!
        assertEquals("pitch=$pitch roll=$roll", 0.0, delta(previous, heading), 0.1)
        previous = heading
      }
    }
  }

  @Test fun aVerticalRightAxisIsUnavailableInsteadOfSwitchingAxes() {
    for (roll in listOf(89.9, 90.0, 90.1, -90.0)) {
      assertNull(CompassMath.heading(multiply(rotation(240.0, 0.0), sideRoll(roll))))
    }
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

  @Test fun fusedHeadingErrorsCannotClaimHighAccuracyWhenUnknown() {
    for (error in listOf(Double.NaN, Double.POSITIVE_INFINITY, -1.0, 180.0, 200.0)) {
      assertEquals("error=$error", 0, CompassMath.headingAccuracy(error))
    }
    assertEquals(3, CompassMath.headingAccuracy(0.0))
    assertEquals(3, CompassMath.headingAccuracy(10.0))
    assertEquals(2, CompassMath.headingAccuracy(10.01))
    assertEquals(2, CompassMath.headingAccuracy(20.0))
    assertEquals(1, CompassMath.headingAccuracy(20.01))
    assertEquals(1, CompassMath.headingAccuracy(179.99))
  }
}
