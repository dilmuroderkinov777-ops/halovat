package uz.halovat.focus

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.HandlerThread
import android.os.SystemClock
import android.view.Surface
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.android.asCoroutineDispatcher
import kotlinx.coroutines.cancel
import kotlin.math.abs

/** North-referenced sensors only: GAME_ROTATION_VECTOR cannot find north. */
class HalovatCompassModule : Module(), SensorEventListener {
  // Sensor fusion and lifecycle commands share one queue, away from UI/WebView work.
  private val sensorThread = HandlerThread("HalovatCompass").apply { start() }
  private val handler = Handler(sensorThread.looper)
  private val sensorScope = CoroutineScope(SupervisorJob() + handler.asCoroutineDispatcher())
  private var manager: SensorManager? = null
  @Volatile private var running = false
  private var requested = false
  private var mode = -1
  @Volatile private var lastEventAt = 0L
  private var publishedAt = 0L
  private var accuracy = 0
  private var declination = 0.0
  @Volatile private var lastReading: Map<String, Any?> = emptyMap()
  private var gravity: FloatArray? = null
  private var magnetic: FloatArray? = null
  private var gravityAt = 0L
  private var magneticAt = 0L
  private val rotation = FloatArray(9)
  private val remapped = FloatArray(9)
  private val orientation = FloatArray(3)
  private val modes = listOf(Sensor.TYPE_ROTATION_VECTOR, Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR, Sensor.TYPE_MAGNETIC_FIELD)
  private val watchdog = object : Runnable {
    override fun run() {
      if (!running) return
      if (SystemClock.elapsedRealtime() - lastEventAt >= 3000L) {
        lastReading = mapOf("status" to "unavailable", "reason" to "no_readings")
        sendEvent("onHeading", lastReading)
        // A temporarily silent sensor is not permanently exhausted. Try another
        // north-referenced source, then restart the preferred source if needed.
        if (!selectMode(mode + 1) && !selectMode(0)) {
          stop()
          return
        }
      }
      handler.postDelayed(this, 1000L)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("HalovatCompass")
    Events("onHeading")
    Function("getStatus") { lastReading + mapOf("running" to running, "lastReadingAt" to lastEventAt) }
    AsyncFunction("start") { latitude: Double, longitude: Double ->
      stop()
      updateLocation(latitude, longitude)
      manager = appContext.reactContext?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager
      running = true
      requested = true
      val available = selectMode(0)
      if (available) handler.postDelayed(watchdog, 1000L) else stop()
      mapOf("available" to available, "source" to source())
    }.runOnQueue(sensorScope)
    AsyncFunction("setLocation") { latitude: Double, longitude: Double -> updateLocation(latitude, longitude) }.runOnQueue(sensorScope)
    AsyncFunction("stop") { stop() }.runOnQueue(sensorScope)
    OnActivityEntersBackground { handler.post { stop(false) } }
    OnActivityEntersForeground { handler.post {
      if (requested && !running) {
        running = true
        if (selectMode(0)) handler.postDelayed(watchdog, 1000L) else stop()
      }
    } }
    OnDestroy { handler.post { stop(); sensorScope.cancel(); sensorThread.quitSafely() } }
  }

  private fun updateLocation(latitude: Double, longitude: Double) {
    require(latitude.isFinite() && latitude in -90.0..90.0 && longitude.isFinite() && longitude in -180.0..180.0)
    declination = GeomagneticField(latitude.toFloat(), longitude.toFloat(), 0f, System.currentTimeMillis()).declination.toDouble()
  }
  private fun source() = when (mode) { 0 -> "rotation_vector"; 1 -> "geomagnetic_rotation_vector"; 2 -> "accelerometer_magnetometer"; else -> "none" }

  private fun selectMode(from: Int): Boolean {
    val sensors = manager ?: return false
    sensors.unregisterListener(this)
    for (index in from until modes.size) {
      val sensor = sensors.getDefaultSensor(modes[index]) ?: continue
      val accelerometer = if (index == 2) sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: continue else null
      val ok = sensors.registerListener(this, sensor, 50_000, handler)
      val gravityOk = accelerometer == null || sensors.registerListener(this, accelerometer, 50_000, handler)
      if (ok && gravityOk) {
        mode = index; accuracy = 0; gravity = null; magnetic = null
        gravityAt = 0L; magneticAt = 0L
        lastEventAt = SystemClock.elapsedRealtime(); publishedAt = 0L
        return true
      }
      sensors.unregisterListener(this)
    }
    return false
  }

  private fun stop(clearRequest: Boolean = true) {
    if (clearRequest) requested = false
    running = false
    handler.removeCallbacks(watchdog)
    manager?.unregisterListener(this)
    mode = -1; gravity = null; magnetic = null
    lastReading = emptyMap()
  }

  override fun onAccuracyChanged(sensor: Sensor, value: Int) {
    if (sensor.type == modes.getOrNull(mode)) accuracy = value.coerceIn(0, 3)
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (!running || mode < 0) return
    // Do not replay buffered samples after the app/OS was busy or suspended.
    val now = SystemClock.elapsedRealtimeNanos()
    if (!CompassMath.isFresh(event.timestamp, now) || event.values.take(3).any { !it.isFinite() }) return
    if (mode < 2) {
      if (event.sensor.type != modes[mode]) return
      SensorManager.getRotationMatrixFromVector(rotation, event.values)
      accuracy = event.accuracy.coerceIn(0, 3)
      if (event.values.size >= 5 && event.values[4] >= 0f) {
        val error = Math.toDegrees(event.values[4].toDouble())
        accuracy = minOf(accuracy, if (error <= 10) 3 else if (error <= 20) 2 else 1)
      }
    } else {
      when (event.sensor.type) {
        Sensor.TYPE_ACCELEROMETER -> { gravity = filtered(gravity, event.values); gravityAt = event.timestamp }
        Sensor.TYPE_MAGNETIC_FIELD -> { magnetic = filtered(magnetic, event.values); magneticAt = event.timestamp; accuracy = event.accuracy.coerceIn(0, 3) }
        else -> return
      }
      val g = gravity ?: return
      val m = magnetic ?: return
      if (!CompassMath.isFresh(gravityAt, now) || !CompassMath.isFresh(magneticAt, now)) return
      if (!SensorManager.getRotationMatrix(rotation, null, g, m)) return
    }
    @Suppress("DEPRECATION")
    val displayRotation = (appContext.reactContext?.getSystemService(Context.WINDOW_SERVICE) as? WindowManager)?.defaultDisplay?.rotation ?: Surface.ROTATION_0
    val axes = when (displayRotation) {
      Surface.ROTATION_90 -> SensorManager.AXIS_Y to SensorManager.AXIS_MINUS_X
      Surface.ROTATION_180 -> SensorManager.AXIS_MINUS_X to SensorManager.AXIS_MINUS_Y
      Surface.ROTATION_270 -> SensorManager.AXIS_MINUS_Y to SensorManager.AXIS_X
      else -> SensorManager.AXIS_X to SensorManager.AXIS_Y
    }
    if (!SensorManager.remapCoordinateSystem(rotation, axes.first, axes.second, remapped)) return
    SensorManager.getOrientation(remapped, orientation)
    val magneticHeading = CompassMath.heading(remapped) ?: return
    val heading = CompassMath.normalize(magneticHeading + declination)
    lastEventAt = SystemClock.elapsedRealtime()
    if (publishedAt != 0L && lastEventAt - publishedAt < 100L) return
    publishedAt = lastEventAt
    val tilt = abs(Math.toDegrees(orientation[1].toDouble()))
    lastReading = mapOf("status" to "ready", "heading" to heading,
      "accuracy" to accuracy, "trueNorth" to true,
      "source" to source(), "tilt" to tilt)
    sendEvent("onHeading", lastReading)
  }

  private fun filtered(old: FloatArray?, sample: FloatArray): FloatArray {
    // SensorEvent.values is reused by Android; never retain its backing array.
    if (old == null) return sample.copyOf(3)
    for (i in 0..2) old[i] += 0.2f * (sample[i] - old[i])
    return old
  }
}
