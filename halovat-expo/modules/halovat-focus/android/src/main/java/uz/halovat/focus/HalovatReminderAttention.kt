package uz.halovat.focus

import android.Manifest
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.content.ContextCompat

/** Screen + torch alerts, owned by one reminder and bounded to its ten-second deadline. */
internal object HalovatReminderAttention {
  private val handler = Handler(Looper.getMainLooper())
  private fun prefs(c: Context) = c.getSharedPreferences("halovat.reminder.attention.v1", Context.MODE_PRIVATE)
  private var active: Session? = null // Accessed only on the main looper.

  private class Session(val context: Context, val identifier: String, val until: Long) {
    var screenLock: PowerManager.WakeLock? = null
    var manager: CameraManager? = null
    var camera: String? = null
    var callback: CameraManager.TorchCallback? = null
    var torchOn = false
    var ownsTorch = false
    var pulse: Runnable? = null
    var timeout: Runnable? = null
  }

  fun hasFlashlight(c: Context) = c.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_FLASH)
  fun hasCameraPermission(c: Context) = ContextCompat.checkSelfPermission(c, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED

  fun start(c: Context, identifier: String, startedAt: Long) {
    val context = c.applicationContext
    handler.post {
      // A fast notification close must not start a flash after the user dismissed it.
      if (context.getSystemService(NotificationManager::class.java).activeNotifications.none { it.tag == identifier && it.id == 0 }) return@post
      active?.let { finish(it) }
      val session = Session(context, identifier, startedAt + 10_000L)
      val remaining = session.until - SystemClock.elapsedRealtime()
      if (remaining <= 0) return@post
      active = session
      prefs(context).edit().remove("flashlightError").remove("screenWakeError").apply()
      wakeScreen(session, remaining)
      startFlash(session)
      session.timeout = Runnable { if (active === session) finish(session) }.also { handler.postDelayed(it, remaining) }
    }
  }

  @Suppress("DEPRECATION")
  private fun wakeScreen(session: Session, remaining: Long) {
    val context = session.context
    val power = context.getSystemService(PowerManager::class.java)
    // Newer Android uses the full-screen alarm Activity's setTurnScreenOn().
    // Redmi Note 8 / older Android need a display wake lock even if MIUI keeps the alert as a banner.
    if (Build.VERSION.SDK_INT >= 33) {
      if (Build.VERSION.SDK_INT >= 34 && !context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent())
        prefs(context).edit().putString("screenWakeError", "Ekranni uyg‘otish uchun to‘liq ekran eslatmasiga ruxsat bering.").apply()
      return
    }
    if (power.isInteractive) return
    try {
      session.screenLock = power.newWakeLock(PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
        "Halovat:reminderScreen").apply { setReferenceCounted(false); acquire(remaining) }
      prefs(context).edit().putLong("lastScreenWakeAt", System.currentTimeMillis()).apply()
      handler.postDelayed({
        if (active === session && !power.isInteractive)
          prefs(context).edit().putString("screenWakeError", "Telefon ekranni uyg‘otishni chekladi. Qulf ekranidagi bildirishnoma sozlamalarini tekshiring.").apply()
      }, 300L)
    } catch (error: RuntimeException) {
      prefs(context).edit().putString("screenWakeError", error.message ?: "Ekranni uyg‘otish bloklandi.").apply()
    }
  }

  private fun startFlash(session: Session) {
    val context = session.context
    if (!hasFlashlight(context)) return
    if (!hasCameraPermission(context)) {
      prefs(context).edit().putString("flashlightError", "Eslatma chirog‘i uchun kamera ruxsatini bering.").apply()
      return
    }
    try {
      val manager = context.getSystemService(CameraManager::class.java)
      val cameras = manager.cameraIdList.filter { manager.getCameraCharacteristics(it).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true }
      val camera = cameras.firstOrNull { manager.getCameraCharacteristics(it).get(CameraCharacteristics.LENS_FACING) == CameraCharacteristics.LENS_FACING_BACK }
        ?: cameras.firstOrNull() ?: return
      session.manager = manager
      session.camera = camera
      val pulse = object : Runnable {
        override fun run() {
          if (active !== session) return
          if (SystemClock.elapsedRealtime() >= session.until) { finish(session); return }
          try {
            val enabled = !session.torchOn
            manager.setTorchMode(camera, enabled)
            session.torchOn = enabled
            session.ownsTorch = true
            handler.postDelayed(this, if (enabled) 300L else 700L)
          } catch (error: Exception) { flashFailed(session, error.message ?: "Kamera chirog‘i hozir band.") }
        }
      }
      session.pulse = pulse
      val callback = object : CameraManager.TorchCallback() {
        var initialStateSeen = false
        override fun onTorchModeChanged(cameraId: String, enabled: Boolean) {
          if (cameraId != camera || active !== session || initialStateSeen) return
          initialStateSeen = true
          // Preserve a flashlight the user already switched on; do not blink or turn it off.
          if (enabled) flashFailed(session, "Chiroq avvaldan yoqilgan: uning holati saqlandi.")
          else handler.post(pulse)
        }
        override fun onTorchModeUnavailable(cameraId: String) {
          if (cameraId == camera && active === session) flashFailed(session, "Kamera chirog‘i hozir band.")
        }
      }
      session.callback = callback
      manager.registerTorchCallback(callback, handler)
    } catch (error: Exception) { flashFailed(session, error.message ?: "Kamera chirog‘i ishga tushmadi.") }
  }

  private fun flashFailed(session: Session, message: String) {
    prefs(session.context).edit().putString("flashlightError", message).apply()
    stopFlash(session)
  }

  private fun stopFlash(session: Session) {
    session.pulse?.let { handler.removeCallbacks(it) }
    session.callback?.let { try { session.manager?.unregisterTorchCallback(it) } catch (_: Exception) { } }
    session.callback = null
    if (session.ownsTorch && session.torchOn) try { session.camera?.let { session.manager?.setTorchMode(it, false) } } catch (_: Exception) { }
    session.ownsTorch = false
    session.torchOn = false
  }

  private fun finish(session: Session) {
    session.timeout?.let { handler.removeCallbacks(it) }
    stopFlash(session)
    session.screenLock?.let { if (it.isHeld) it.release() }
    session.screenLock = null
    if (active === session) active = null
  }

  fun stop(identifier: String? = null) {
    handler.post { active?.let { if (identifier == null || identifier == it.identifier) finish(it) } }
  }

  fun screenShown(c: Context) {
    prefs(c).edit().putLong("lastScreenWakeAt", System.currentTimeMillis()).remove("screenWakeError").apply()
  }

  fun diagnostics(c: Context): Map<String, Any?> = mapOf(
    "flashlightPresent" to hasFlashlight(c), "flashlightPermission" to hasCameraPermission(c),
    "flashlightError" to prefs(c).getString("flashlightError", null),
    "screenWakeError" to prefs(c).getString("screenWakeError", null),
    "lastScreenWakeAt" to prefs(c).getLong("lastScreenWakeAt", 0),
  )
}
