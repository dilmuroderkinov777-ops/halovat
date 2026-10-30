package uz.halovat.focus

internal enum class CompassSource(val label: String) {
  FUSED_ORIENTATION("fused_orientation"),
  ROTATION_VECTOR("rotation_vector"),
  GEOMAGNETIC_ROTATION_VECTOR("geomagnetic_rotation_vector"),
  ACCELEROMETER_MAGNETOMETER("accelerometer_magnetometer")
}

internal data class CompassReading(
  val heading: Double,
  val accuracy: Int,
  val trueNorth: Boolean,
  val tilt: Double,
  val timestampNs: Long
)

/** All commands and provider callbacks run on the compass queue. */
internal class CompassSession(
  private val nowNs: () -> Long,
  // A null connection means unavailable. Asynchronous failures use onFailure.
  private val connect: (CompassSource, (CompassReading) -> Unit, () -> Unit) -> (() -> Unit)?,
  private val onReading: (CompassSource, CompassReading) -> Unit,
  private val onUnavailable: () -> Unit
) {
  @Volatile var running = false
    private set
  @Volatile var lastEventAt = 0L
    private set
  var source: CompassSource? = null
    private set
  private var generation = 0L
  private var close: (() -> Unit)? = null
  private var publishedAt: Long? = null
  private var sampleTimestampNs = 0L

  fun start(): Boolean {
    stop()
    running = true
    if (select(0)) return true
    stop()
    return false
  }

  fun stop() {
    running = false
    disconnect()
    source = null
  }

  fun checkStale() {
    if (!running || nowNs() / 1_000_000L - lastEventAt < 3000L) return
    onUnavailable()
    val next = (source?.ordinal ?: -1) + 1
    // Try the next source, then retry preferred providers if all were silent.
    if (!select(next) && !select(0)) stop()
  }

  private fun disconnect() {
    generation++
    val previous = close
    close = null
    previous?.invoke()
  }

  private fun select(from: Int): Boolean {
    disconnect()
    source = null
    for (candidate in CompassSource.entries.drop(from)) {
      val current = ++generation
      source = candidate
      lastEventAt = nowNs() / 1_000_000L
      publishedAt = null
      sampleTimestampNs = 0L
      val connection = connect(candidate, { reading ->
        if (running && generation == current) receive(candidate, reading)
      }, {
        if (running && generation == current) {
          onUnavailable()
          if (!select(candidate.ordinal + 1)) stop()
        }
      })
      if (connection != null) {
        close = connection
        return true
      }
      // Even a failed registration may have already queued a callback.
      generation++
    }
    source = null
    return false
  }

  private fun receive(source: CompassSource, reading: CompassReading) {
    val now = nowNs()
    if (!CompassMath.isFresh(reading.timestampNs, now) || reading.timestampNs <= sampleTimestampNs ||
      !reading.heading.isFinite() || !reading.tilt.isFinite()) return
    sampleTimestampNs = reading.timestampNs
    lastEventAt = now / 1_000_000L
    if (publishedAt?.let { now - it < 100_000_000L } == true) return
    publishedAt = now
    onReading(source, reading.copy(heading = CompassMath.normalize(reading.heading), accuracy = reading.accuracy.coerceIn(0, 3)))
  }
}
