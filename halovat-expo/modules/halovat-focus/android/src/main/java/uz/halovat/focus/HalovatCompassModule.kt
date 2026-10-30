package uz.halovat.focus

import android.hardware.GeomagneticField
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.android.asCoroutineDispatcher
import kotlinx.coroutines.cancel

/** Android-only compass: Google fusion first, then north-referenced platform sensors. */
class HalovatCompassModule : Module() {
  private val sensorThread = HandlerThread("HalovatCompass").apply { start() }
  private val handler = Handler(sensorThread.looper)
  private val sensorScope = CoroutineScope(SupervisorJob() + handler.asCoroutineDispatcher())
  private var requested = false
  private var declination = 0.0
  @Volatile private var lastReading: Map<String, Any?> = emptyMap()
  private val providers = CompassProviders({ appContext.reactContext }, handler, { declination })
  private val session = CompassSession(SystemClock::elapsedRealtimeNanos, providers::connect, { source, reading ->
    lastReading = mapOf("status" to "ready", "heading" to reading.heading,
      "accuracy" to reading.accuracy, "trueNorth" to reading.trueNorth,
      "source" to source.label, "tilt" to reading.tilt)
    sendEvent("onHeading", lastReading)
  }, {
    lastReading = mapOf("status" to "unavailable", "reason" to "no_readings")
    sendEvent("onHeading", lastReading)
  })
  private val watchdog = object : Runnable {
    override fun run() {
      session.checkStale()
      if (session.running) handler.postDelayed(this, 1000L)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("HalovatCompass")
    Events("onHeading")
    Function("getStatus") { lastReading + mapOf("running" to session.running, "lastReadingAt" to session.lastEventAt) }
    AsyncFunction("start") { latitude: Double, longitude: Double ->
      stop()
      updateLocation(latitude, longitude)
      requested = true
      val available = startSession()
      if (!available) requested = false
      mapOf("available" to available, "source" to (session.source?.label ?: "none"))
    }.runOnQueue(sensorScope)
    AsyncFunction("setLocation") { latitude: Double, longitude: Double -> updateLocation(latitude, longitude) }.runOnQueue(sensorScope)
    AsyncFunction("stop") { stop() }.runOnQueue(sensorScope)
    OnActivityEntersBackground { handler.post { stop(false) } }
    OnActivityEntersForeground { handler.post {
      if (requested && !session.running) startSession()
    } }
    OnDestroy { handler.post { stop(); sensorScope.cancel(); sensorThread.quitSafely() } }
  }

  private fun startSession(): Boolean {
    handler.removeCallbacks(watchdog)
    val available = session.start()
    if (available) handler.postDelayed(watchdog, 1000L)
    return available
  }

  private fun stop(clearRequest: Boolean = true) {
    if (clearRequest) requested = false
    handler.removeCallbacks(watchdog)
    session.stop()
    lastReading = emptyMap()
  }

  private fun updateLocation(latitude: Double, longitude: Double) {
    require(latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0)
    declination = GeomagneticField(latitude.toFloat(), longitude.toFloat(), 0f, System.currentTimeMillis()).declination.toDouble()
  }
}
