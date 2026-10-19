package uz.halovat.focus

import android.content.Context
import android.hardware.GeomagneticField
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.Surface
import android.view.WindowManager
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlin.math.abs

/** North-referenced sensors only: GAME_ROTATION_VECTOR cannot find north. */
class HalovatCompassModule : Module(), SensorEventListener {
  private val handler = Handler(Looper.getMainLooper())
  private var manager: SensorManager? = null
  private var running = false
  private var requested = false
  private var mode = -1
  private var lastEventAt = 0L
  private var publishedAt = 0L
  private var accuracy = 0
  private var declination = 0.0
  private var previous: Double? = null
  private var lastReading: Map<String, Any?> = emptyMap()
  private var gravity: FloatArray? = null
  private var magnetic: FloatArray? = null
  private val rotation = FloatArray(9)
  private val remapped = FloatArray(9)
  private val orientation = FloatArray(3)
  private val modes = listOf(Sensor.TYPE_ROTATION_VECTOR, Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR, Sensor.TYPE_MAGNETIC_FIELD)
  private val watchdog = object : Runnable {
    override fun run() {
      if (!running) return
      if (SystemClock.elapsedRealtime() - lastEventAt >= 3000L) {
        if (!selectMode(mode + 1)) {
          stop()
          sendEvent("onHeading", mapOf("status" to "unavailable", "reason" to "no_readings"))
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
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("setLocation") { latitude: Double, longitude: Double -> updateLocation(latitude, longitude) }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") { stop() }.runOnQueue(Queues.MAIN)
    OnActivityEntersBackground { stop(false) }
    OnActivityEntersForeground {
      if (requested && !running) {
        running = true
        if (selectMode(0)) handler.postDelayed(watchdog, 1000L) else stop()
      }
    }
    OnDestroy { handler.post { stop() } }
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
        mode = index; accuracy = 0; gravity = null; magnetic = null; previous = null
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
    mode = -1; previous = null; gravity = null; magnetic = null
  }

  override fun onAccuracyChanged(sensor: Sensor, value: Int) {
    if (sensor.type == modes.getOrNull(mode)) accuracy = value.coerceIn(0, 3)
  }

  override fun onSensorChanged(event: SensorEvent) {
    if (!running || mode < 0) return
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
        Sensor.TYPE_ACCELEROMETER -> gravity = filtered(gravity, event.values)
        Sensor.TYPE_MAGNETIC_FIELD -> { magnetic = filtered(magnetic, event.values); accuracy = event.accuracy.coerceIn(0, 3) }
        else -> return
      }
      val g = gravity ?: return
      val m = magnetic ?: return
      if (!SensorManager.getRotationMatrix(rotation, null, g, m)) return
    }
    lastEventAt = SystemClock.elapsedRealtime()
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
    val heading = Math.toDegrees(orientation[0].toDouble()) + declination
    if (!heading.isFinite()) return
    previous = CompassMath.smooth(previous, heading)
    if (publishedAt != 0L && lastEventAt - publishedAt < 100L) return
    publishedAt = lastEventAt
    val tilt = abs(Math.toDegrees(orientation[1].toDouble()))
    lastReading = mapOf("status" to "ready", "heading" to previous,
      "accuracy" to if (tilt > 70) 0 else accuracy, "trueNorth" to true,
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
