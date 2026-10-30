package uz.halovat.focus

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Handler
import android.os.SystemClock
import android.util.Log
import android.view.Surface
import android.view.WindowManager
import com.google.android.gms.location.DeviceOrientationListener
import com.google.android.gms.location.DeviceOrientationRequest
import com.google.android.gms.location.FusedOrientationProviderClient
import com.google.android.gms.location.LocationServices
import java.util.concurrent.Executor
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs

/** Platform adapters; selection, timeouts and stale-session guards live in CompassSession. */
internal class CompassProviders(
  private val context: () -> Context?,
  private val handler: Handler,
  private val declination: () -> Double
) {
  private val sensorExecutor = Executor { handler.post(it) }
  private val directExecutor = Executor { it.run() }

  fun connect(source: CompassSource, onReading: (CompassReading) -> Unit, onFailure: () -> Unit): (() -> Unit)? =
    if (source == CompassSource.FUSED_ORIENTATION) connectFused(onReading, onFailure)
    else connectSensor(source, onReading)

  private fun removeFused(client: FusedOrientationProviderClient, listener: DeviceOrientationListener) {
    try {
      client.removeOrientationUpdates(listener).addOnFailureListener(directExecutor) {
        Log.w("HalovatCompass", "Could not remove fused orientation updates", it)
      }
    } catch (error: RuntimeException) {
      Log.w("HalovatCompass", "Could not remove fused orientation updates", error)
    }
  }

  private fun connectFused(onReading: (CompassReading) -> Unit, onFailure: () -> Unit): (() -> Unit)? {
    val app = context() ?: return null
    val closed = AtomicBoolean(false)
    val rotation = FloatArray(9)
    val remapped = FloatArray(9)
    val orientation = FloatArray(3)
    val listener = DeviceOrientationListener { value ->
      if (!closed.get()) {
        val attitude = value.attitude
        if (attitude.size == 4 && attitude.all { it.isFinite() } &&
          attitude.sumOf { (it * it).toDouble() } in 0.9..1.1) {
          SensorManager.getRotationMatrixFromVector(rotation, attitude)
          val error = if (value.hasConservativeHeadingErrorDegrees())
            maxOf(value.headingErrorDegrees, value.conservativeHeadingErrorDegrees) else value.headingErrorDegrees
          // FOP already applies declination when known, but does not expose which
          // north reference it selected. Never add our declination a second time
          // or claim that true north is confirmed.
          reading(rotation, remapped, orientation, CompassMath.headingAccuracy(error.toDouble()),
            false, 0.0, value.elapsedRealtimeNs)?.let(onReading)
        }
      }
    }
    val client = try {
      LocationServices.getFusedOrientationProviderClient(app)
    } catch (error: RuntimeException) {
      Log.w("HalovatCompass", "Fused orientation unavailable; trying Android sensors", error)
      return null
    }
    val request = DeviceOrientationRequest.Builder(DeviceOrientationRequest.OUTPUT_PERIOD_DEFAULT).build()
    try {
      client.requestOrientationUpdates(request, sensorExecutor, listener)
        // Cleanup must also work after the sensor HandlerThread has been destroyed.
        .addOnCompleteListener(directExecutor) { task ->
          if (closed.get()) removeFused(client, listener)
          else if (!task.isSuccessful) {
            Log.w("HalovatCompass", "Fused orientation unavailable; trying Android sensors", task.exception)
            handler.post { if (!closed.get()) onFailure() }
          }
        }
    } catch (error: RuntimeException) {
      closed.set(true)
      removeFused(client, listener)
      Log.w("HalovatCompass", "Fused orientation unavailable; trying Android sensors", error)
      return null
    }
    return { closed.set(true); removeFused(client, listener) }
  }

  private fun connectSensor(source: CompassSource, onReading: (CompassReading) -> Unit): (() -> Unit)? {
    val sensors = context()?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager ?: return null
    val type = when (source) {
      CompassSource.ROTATION_VECTOR -> Sensor.TYPE_ROTATION_VECTOR
      CompassSource.GEOMAGNETIC_ROTATION_VECTOR -> Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR
      CompassSource.ACCELEROMETER_MAGNETOMETER -> Sensor.TYPE_MAGNETIC_FIELD
      else -> return null
    }
    val sensor = sensors.getDefaultSensor(type) ?: return null
    val accelerometer = if (type == Sensor.TYPE_MAGNETIC_FIELD)
      sensors.getDefaultSensor(Sensor.TYPE_ACCELEROMETER) ?: return null else null
    var closed = false
    var accuracy = 0
    var gravity: FloatArray? = null
    var magnetic: FloatArray? = null
    var gravityAt = 0L
    var magneticAt = 0L
    val rotation = FloatArray(9)
    val remapped = FloatArray(9)
    val orientation = FloatArray(3)
    val listener = object : SensorEventListener {
      override fun onAccuracyChanged(sensor: Sensor, value: Int) {
        if (!closed && sensor.type == type) accuracy = value.coerceIn(0, 3)
      }

      override fun onSensorChanged(event: SensorEvent) {
        val now = SystemClock.elapsedRealtimeNanos()
        if (closed || !CompassMath.isFresh(event.timestamp, now) ||
          event.values.size < 3 || event.values.take(4).any { !it.isFinite() }) return
        if (accelerometer == null) {
          if (event.sensor.type != type) return
          SensorManager.getRotationMatrixFromVector(rotation, event.values)
          accuracy = event.accuracy.coerceIn(0, 3)
          if (event.values.size >= 5 && event.values[4] >= 0f) {
            accuracy = minOf(accuracy, CompassMath.headingAccuracy(Math.toDegrees(event.values[4].toDouble())))
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
        reading(rotation, remapped, orientation, accuracy, true, declination(), event.timestamp)?.let(onReading)
      }
    }
    val ok = sensors.registerListener(listener, sensor, 50_000, handler)
    val gravityOk = accelerometer == null || sensors.registerListener(listener, accelerometer, 50_000, handler)
    if (!ok || !gravityOk) {
      closed = true
      sensors.unregisterListener(listener)
      return null
    }
    return { closed = true; sensors.unregisterListener(listener) }
  }

  private fun reading(rotation: FloatArray, remapped: FloatArray, orientation: FloatArray,
    accuracy: Int, trueNorth: Boolean, correction: Double, timestampNs: Long): CompassReading? {
    @Suppress("DEPRECATION")
    val displayRotation = (context()?.getSystemService(Context.WINDOW_SERVICE) as? WindowManager)?.defaultDisplay?.rotation ?: Surface.ROTATION_0
    val axes = when (displayRotation) {
      Surface.ROTATION_90 -> SensorManager.AXIS_Y to SensorManager.AXIS_MINUS_X
      Surface.ROTATION_180 -> SensorManager.AXIS_MINUS_X to SensorManager.AXIS_MINUS_Y
      Surface.ROTATION_270 -> SensorManager.AXIS_MINUS_Y to SensorManager.AXIS_X
      else -> SensorManager.AXIS_X to SensorManager.AXIS_Y
    }
    if (!SensorManager.remapCoordinateSystem(rotation, axes.first, axes.second, remapped)) return null
    val heading = CompassMath.heading(remapped) ?: return null
    SensorManager.getOrientation(remapped, orientation)
    return CompassReading(CompassMath.normalize(heading + correction), accuracy, trueNorth,
      abs(Math.toDegrees(orientation[1].toDouble())), timestampNs)
  }

  private fun filtered(old: FloatArray?, sample: FloatArray): FloatArray {
    if (old == null) return sample.copyOf(3)
    for (i in 0..2) old[i] += 0.2f * (sample[i] - old[i])
    return old
  }
}
