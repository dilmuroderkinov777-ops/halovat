package uz.halovat.focus

import android.app.NotificationManager
import android.content.Context
import android.media.AudioAttributes
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationAttributes
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager

/** Own a finite alarm vibration independently of the phone's notification/ringer profile. */
internal object HalovatReminderVibration {
  private val handler = Handler(Looper.getMainLooper())
  private fun prefs(c: Context) = c.getSharedPreferences("halovat.reminder.vibration.v4", Context.MODE_PRIVATE)
  private fun vibrator(c: Context): Vibrator = if (Build.VERSION.SDK_INT >= 31)
    c.getSystemService(VibratorManager::class.java).defaultVibrator
    else c.getSystemService(Vibrator::class.java)

  fun hasVibrator(c: Context) = vibrator(c).hasVibrator()

  @Synchronized
  fun start(c: Context, identifier: String): Map<String, Any?> {
    HalovatFocusController.reconcile(c)
    stop(c)
    val p = prefs(c)
    p.edit().putLong("lastRequestAt", System.currentTimeMillis()).putString("lastIdentifier", identifier).apply()
    val motor = vibrator(c)
    val error = when {
      !motor.hasVibrator() -> "Bu qurilmada vibratsiya motori topilmadi."
      c.getSystemService(NotificationManager::class.java).currentInterruptionFilter == NotificationManager.INTERRUPTION_FILTER_NONE ->
        "Telefonning “Mutlaqo jim” rejimi alarm vibratsiyasini ham bloklaydi. Tizimdagi Bezovta qilmang sozlamasini tekshiring."
      else -> null
    }
    if (error != null) {
      p.edit().putString("lastError", error).apply()
      return mapOf("ok" to false, "reason" to error)
    }
    try {
      val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()
      if (Build.VERSION.SDK_INT >= 33) motor.vibrate(VibrationEffect.createOneShot(10_000, VibrationEffect.DEFAULT_AMPLITUDE),
        VibrationAttributes.Builder().setUsage(VibrationAttributes.USAGE_ALARM).build())
      else if (Build.VERSION.SDK_INT >= 26) motor.vibrate(VibrationEffect.createOneShot(10_000, VibrationEffect.DEFAULT_AMPLITUDE), attributes)
      else motor.vibrate(10_000L, attributes)
      val until = System.currentTimeMillis() + 10_000L
      p.edit().putString("activeIdentifier", identifier).putLong("until", until).remove("lastError").apply()
      handler.postDelayed({
        // A close or a newer reminder must not be affected by an older timeout.
        if (p.getString("activeIdentifier", null) == identifier && p.getLong("until", 0) == until) stop(c, identifier)
      }, 10_000L)
      return mapOf("ok" to true)
    } catch (error: RuntimeException) {
      val message = error.message ?: "Android vibratsiya buyrug‘ini qabul qilmadi."
      p.edit().putString("lastError", message).apply()
      return mapOf("ok" to false, "reason" to message)
    }
  }

  @Synchronized
  fun stop(c: Context, identifier: String? = null) {
    HalovatReminderAttention.stop(identifier)
    val p = prefs(c)
    val active = p.getString("activeIdentifier", null)
    if (active == null || (identifier != null && active != identifier)) return
    vibrator(c).cancel()
    p.edit().remove("activeIdentifier").remove("until").apply()
  }

  fun diagnostics(c: Context): Map<String, Any?> {
    val p = prefs(c)
    return mapOf("vibratorPresent" to hasVibrator(c), "vibrationError" to p.getString("lastError", null),
      "lastVibrationRequestAt" to p.getLong("lastRequestAt", 0), "reminderEngineVersion" to 5)
  }
}
