package uz.halovat.focus

import org.junit.Assert.*
import org.junit.Test

class CompassSessionTest {
  private class Connection(
    val source: CompassSource,
    val reading: (CompassReading) -> Unit,
    val fail: () -> Unit
  ) {
    var closed = 0
  }

  private class Harness(val available: Set<CompassSource> = CompassSource.entries.toSet()) {
    var now = 5_000_000_000L
    val connections = mutableListOf<Connection>()
    val readings = mutableListOf<Pair<CompassSource, CompassReading>>()
    var unavailable = 0
    val session = CompassSession({ now }, { source, reading, fail ->
      val connection = Connection(source, reading, fail)
      connections.add(connection)
      if (source in available) ({ connection.closed++ }) else null
    }, { source, reading -> readings.add(source to reading) }, { unavailable++ })

    fun advance(ms: Long) { now += ms * 1_000_000L }
    fun emit(connection: Connection = connections.last(), heading: Double = 240.0,
      accuracy: Int = 3, timestamp: Long = now, tilt: Double = 45.0) {
      connection.reading(CompassReading(heading, accuracy,
        connection.source != CompassSource.FUSED_ORIENTATION, tilt, timestamp))
    }
  }

  @Test fun fusedOrientationIsPreferredAndItsNorthReferenceIsPreserved() {
    val h = Harness()
    assertTrue(h.session.start())
    assertEquals(listOf(CompassSource.FUSED_ORIENTATION), h.connections.map { it.source })
    h.emit(heading = 359.0)
    assertEquals(CompassSource.FUSED_ORIENTATION, h.readings.single().first)
    assertEquals(359.0, h.readings.single().second.heading, 0.0)
    assertFalse(h.readings.single().second.trueNorth)
    assertEquals(45.0, h.readings.single().second.tilt, 0.0)
    h.session.stop()
    assertEquals(1, h.connections.single().closed)
  }

  @Test fun missingPlayServicesFallsBackInNorthReferencedOrder() {
    val h = Harness(setOf(CompassSource.GEOMAGNETIC_ROTATION_VECTOR, CompassSource.ACCELEROMETER_MAGNETOMETER))
    assertTrue(h.session.start())
    assertEquals(listOf(CompassSource.FUSED_ORIENTATION, CompassSource.ROTATION_VECTOR,
      CompassSource.GEOMAGNETIC_ROTATION_VECTOR), h.connections.map { it.source })
    assertEquals(CompassSource.GEOMAGNETIC_ROTATION_VECTOR, h.session.source)
    h.emit()
    assertTrue(h.readings.single().second.trueNorth)
    // A callback from an unsuccessful registration must also be ignored.
    h.advance(100)
    h.emit(h.connections.first(), heading = 90.0)
    assertEquals(1, h.readings.size)
  }

  @Test fun asynchronousFusedFailureClosesItBeforeStartingFallback() {
    val h = Harness()
    h.session.start()
    val fused = h.connections.single()
    fused.fail()
    assertEquals(1, fused.closed)
    assertEquals(CompassSource.ROTATION_VECTOR, h.session.source)
    assertEquals(1, h.unavailable)
    h.emit()
    h.advance(100)
    h.emit(fused, heading = 90.0)
    fused.fail()
    assertEquals(1, h.readings.size)
    assertEquals(2, h.connections.size)
    assertEquals(1, h.unavailable)
  }

  @Test fun pendingOrStalledFusedRegistrationTimesOutAndCannotReturnLate() {
    val h = Harness()
    h.session.start()
    val fused = h.connections.single()
    h.advance(2999)
    h.session.checkStale()
    assertEquals(CompassSource.FUSED_ORIENTATION, h.session.source)
    h.advance(1)
    h.session.checkStale()
    assertEquals(1, fused.closed)
    assertEquals(CompassSource.ROTATION_VECTOR, h.session.source)
    assertEquals(1, h.unavailable)
    h.emit(fused)
    assertTrue(h.readings.isEmpty())
    h.emit()
    assertEquals(CompassSource.ROTATION_VECTOR, h.readings.single().first)
  }

  @Test fun silentProvidersCycleAndRetryFusedWithoutLeakingConnections() {
    val h = Harness()
    h.session.start()
    repeat(4) {
      h.advance(3000)
      h.session.checkStale()
    }
    assertEquals(CompassSource.FUSED_ORIENTATION, h.session.source)
    assertEquals(5, h.connections.size)
    assertTrue(h.connections.dropLast(1).all { it.closed == 1 })
    assertEquals(0, h.connections.last().closed)
    h.emit(h.connections.first())
    assertTrue(h.readings.isEmpty())
    h.emit()
    assertEquals(1, h.readings.size)
  }

  @Test fun onlyFusedAvailableCanRecoverFromTemporarySilence() {
    val h = Harness(setOf(CompassSource.FUSED_ORIENTATION))
    h.session.start()
    h.advance(3000)
    h.session.checkStale()
    assertTrue(h.session.running)
    assertEquals(CompassSource.FUSED_ORIENTATION, h.session.source)
    assertEquals(1, h.connections.first().closed)
    h.emit()
    assertEquals(1, h.readings.size)
  }

  @Test fun stopAndRestartIgnoreEveryOldCallbackAndPreferFusedAgain() {
    val h = Harness()
    h.session.start()
    h.connections.first().fail()
    val previous = h.connections.toList()
    h.session.stop()
    h.session.stop()
    h.advance(5000)
    h.session.checkStale()
    previous.forEach { h.emit(it); it.fail() }
    assertFalse(h.session.running)
    assertTrue(h.readings.isEmpty())
    assertEquals(1, h.unavailable)
    assertTrue(previous.all { it.closed == 1 })
    assertTrue(h.session.start())
    assertEquals(CompassSource.FUSED_ORIENTATION, h.session.source)
    previous.forEach { h.emit(it); it.fail() }
    h.emit()
    assertEquals(1, h.readings.size)
    assertEquals(3, h.connections.size)
  }

  @Test fun noProvidersReportsUnavailableWithoutSpinning() {
    val h = Harness(emptySet())
    assertFalse(h.session.start())
    assertFalse(h.session.running)
    assertNull(h.session.source)
    assertEquals(4, h.connections.size)
    h.advance(5000)
    h.session.checkStale()
    assertEquals(4, h.connections.size)
    assertEquals(0, h.unavailable)
  }

  @Test fun exhaustionAfterAsyncFailureStopsInsteadOfRetryingInALoop() {
    val h = Harness(setOf(CompassSource.FUSED_ORIENTATION))
    h.session.start()
    h.connections.first().fail()
    assertFalse(h.session.running)
    assertNull(h.session.source)
    assertEquals(1, h.unavailable)
    assertEquals(4, h.connections.size)
    assertEquals(1, h.connections.first().closed)
  }

  @Test fun invalidAndStaleReadingsCannotKeepADeadProviderAlive() {
    val h = Harness()
    h.session.start()
    h.advance(2000)
    h.emit(timestamp = h.now - 1_000_000_001L)
    h.emit(timestamp = h.now + 1L)
    h.emit(heading = Double.NaN)
    h.emit(tilt = Double.POSITIVE_INFINITY)
    assertTrue(h.readings.isEmpty())
    h.advance(1000)
    h.session.checkStale()
    assertEquals(CompassSource.ROTATION_VECTOR, h.session.source)
  }

  @Test fun rateLimitingStillCountsStationaryLowAccuracyHeartbeats() {
    val h = Harness()
    h.session.start()
    h.emit(accuracy = 0)
    repeat(200) {
      h.advance(20)
      h.emit(accuracy = 0)
      h.session.checkStale()
    }
    assertEquals(41, h.readings.size)
    assertEquals(CompassSource.FUSED_ORIENTATION, h.session.source)
    assertEquals(0, h.unavailable)
    assertEquals(h.now / 1_000_000L, h.session.lastEventAt)
  }

  @Test fun outOfOrderAndDuplicateSamplesCannotMoveTheNeedleBackwards() {
    val h = Harness()
    h.session.start()
    val old = h.now
    h.emit(heading = 120.0)
    h.advance(100)
    h.emit(heading = 240.0)
    h.advance(100)
    h.emit(heading = 90.0, timestamp = old)
    h.emit(heading = 90.0, timestamp = old + 100_000_000L)
    assertEquals(listOf(120.0, 240.0), h.readings.map { it.second.heading })
    h.emit(heading = 361.0, accuracy = 99)
    assertEquals(1.0, h.readings.last().second.heading, 0.0)
    assertEquals(3, h.readings.last().second.accuracy)
  }
}
