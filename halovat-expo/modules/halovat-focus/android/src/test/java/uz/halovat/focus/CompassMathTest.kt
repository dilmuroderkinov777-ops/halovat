package uz.halovat.focus

import org.junit.Assert.*
import org.junit.Test

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
}
