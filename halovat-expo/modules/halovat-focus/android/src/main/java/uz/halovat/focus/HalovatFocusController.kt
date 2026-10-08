package uz.halovat.focus

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.SystemClock
import android.telecom.Call
import android.telecom.CallScreeningService
import android.net.Uri
import org.json.JSONArray
import org.json.JSONObject

internal object HalovatFocusController {
  private const val PREFS = "halovat.focus.native.v1"
  private const val KEY_ACTIVE = "sessionActive"
  private const val KEY_EXPIRES_AT = "sessionExpiresAt"
  private const val KEY_MUTE_CALLS = "muteCalls"
  private const val KEY_MUTE_NOTIFICATIONS = "muteNotifications"
  private const val KEY_PREVIOUS_FILTER = "previousInterruptionFilter"
  private const val KEY_CHANGED_FILTER = "changedInterruptionFilter"
  private const val KEY_CALL_EVENTS = "callEvents"
  private const val MAX_CALL_EVENTS = 100

  private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun hasCallScreeningRole(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
    val manager = context.getSystemService(RoleManager::class.java) ?: return false
    return manager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
  }

  fun isSessionActive(context: Context): Boolean {
    val preferences = prefs(context)
    return preferences.getBoolean(KEY_ACTIVE, false) && preferences.getLong(KEY_EXPIRES_AT, 0L) > System.currentTimeMillis()
  }

  fun start(context: Context, durationSeconds: Int, muteCalls: Boolean, muteNotifications: Boolean): Map<String, Any?> {
    val notificationManager = context.getSystemService(NotificationManager::class.java)
    if (muteNotifications && !notificationManager.isNotificationPolicyAccessGranted) {
      return mapOf("ok" to false, "reason" to "dnd-access")
    }
    if (muteCalls && !hasCallScreeningRole(context)) {
      return mapOf("ok" to false, "reason" to "call-screening-role")
    }
    if (muteCalls && context.checkSelfPermission(android.Manifest.permission.READ_CONTACTS) != PackageManager.PERMISSION_GRANTED) {
      return mapOf("ok" to false, "reason" to "contacts-access")
    }
    if (!muteCalls && !muteNotifications) {
      end(context)
      return mapOf("ok" to true, "active" to false)
    }

    val safeDuration = durationSeconds.coerceIn(1, 3 * 60 * 60)
    prefs(context).edit().putLong("manualUntil", System.currentTimeMillis() + safeDuration * 1000L)
      .putBoolean("manualCalls", muteCalls).putBoolean("manualNotifications", muteNotifications).apply()
    reconcile(context)
    return mapOf("ok" to true, "active" to true, "expiresInSeconds" to safeDuration)
  }

  fun end(context: Context) {
    prefs(context).edit().remove("manualUntil").remove("manualCalls").remove("manualNotifications").apply()
    reconcile(context)
  }

  // Manual prayer sessions and the two automatic modes own independent lifetimes.
  // Ending one owner must not restore sound while another owner is still active.
  fun reconcile(context: Context) {
    val p = prefs(context)
    val now = System.currentTimeMillis()
    val manualUntil = p.getLong("manualUntil", 0L)
    val manual = manualUntil > now
    val prayerUntil = HalovatAutoQuiet.prayerEnd(context)
    val mosque = HalovatAutoQuiet.mosqueInside(context)
    val automatic = mosque || prayerUntil > now
    val manager = context.getSystemService(NotificationManager::class.java)
    val muteNotifications = (automatic || (manual && p.getBoolean("manualNotifications", false))) && manager.isNotificationPolicyAccessGranted
    val muteCalls = (automatic || (manual && p.getBoolean("manualCalls", false))) && hasCallScreeningRole(context) &&
      context.checkSelfPermission(android.Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
    if (muteNotifications) {
      // Silence calls and ordinary notifications while keeping the user's prayer alarm eligible.
      // A total-silence mode set by the user before Halovat started must stay intact.
      val baseline = if (p.getBoolean(KEY_CHANGED_FILTER, false)) p.getInt(KEY_PREVIOUS_FILTER, NotificationManager.INTERRUPTION_FILTER_ALL)
        else manager.currentInterruptionFilter
      val desiredFilter = if (Build.VERSION.SDK_INT < 35 && baseline == NotificationManager.INTERRUPTION_FILTER_NONE)
        NotificationManager.INTERRUPTION_FILTER_NONE else NotificationManager.INTERRUPTION_FILTER_ALARMS
      if (!p.getBoolean(KEY_CHANGED_FILTER, false)) {
        val previous = manager.currentInterruptionFilter
        p.edit().putInt(KEY_PREVIOUS_FILTER, previous).putBoolean(KEY_CHANGED_FILTER,
          Build.VERSION.SDK_INT >= 35 || previous != desiredFilter).apply()
      }
      try {
        // Android 15+ uses an app-owned rule. Another owner's active DND is not our rule.
        if (Build.VERSION.SDK_INT >= 35 || manager.currentInterruptionFilter != desiredFilter)
          manager.setInterruptionFilter(desiredFilter)
        p.edit().putInt("appliedInterruptionFilter", desiredFilter).remove("lastQuietError").apply()
      } catch (error: SecurityException) { p.edit().putString("lastQuietError", error.message ?: "DND access denied").apply() }
    } else restoreNotificationFilter(context)
    val until = if (mosque) Long.MAX_VALUE else maxOf(if (manual) manualUntil else 0L, prayerUntil)
    p.edit().putBoolean(KEY_ACTIVE, muteCalls || muteNotifications).putBoolean(KEY_MUTE_CALLS, muteCalls)
      .putBoolean(KEY_MUTE_NOTIFICATIONS, muteNotifications).putLong(KEY_EXPIRES_AT, until).apply()
    context.getSystemService(AlarmManager::class.java).cancel(restorePendingIntent(context))
    if (manual) scheduleRestore(context, manualUntil - now)
  }
  private fun restoreNotificationFilter(context: Context) {
    val preferences = prefs(context)
    if (!preferences.getBoolean(KEY_CHANGED_FILTER, false)) return
    val notificationManager = context.getSystemService(NotificationManager::class.java)
    if (notificationManager.isNotificationPolicyAccessGranted &&
      (Build.VERSION.SDK_INT >= 35 || notificationManager.currentInterruptionFilter == preferences.getInt("appliedInterruptionFilter", NotificationManager.INTERRUPTION_FILTER_NONE))
    ) {
      try {
        notificationManager.setInterruptionFilter(
          if (Build.VERSION.SDK_INT >= 35) NotificationManager.INTERRUPTION_FILTER_ALL
          else preferences.getInt(KEY_PREVIOUS_FILTER, NotificationManager.INTERRUPTION_FILTER_ALL)
        )
      } catch (_: SecurityException) {
        // The user may have revoked DND access during the session.
      }
    }
    preferences.edit().putBoolean(KEY_CHANGED_FILTER, false).remove(KEY_PREVIOUS_FILTER).remove("appliedInterruptionFilter").apply()
  }

  private fun restorePendingIntent(context: Context): PendingIntent {
    val intent = Intent(context, HalovatFocusRestoreReceiver::class.java).setAction(HalovatFocusRestoreReceiver.ACTION_RESTORE)
    return PendingIntent.getBroadcast(
      context,
      7542,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  private fun scheduleRestore(context: Context, durationMs: Long) {
    val alarmManager = context.getSystemService(AlarmManager::class.java)
    val triggerAt = SystemClock.elapsedRealtime() + durationMs
    if (Build.VERSION.SDK_INT < 31 || alarmManager.canScheduleExactAlarms()) alarmManager.setExactAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, restorePendingIntent(context))
    else alarmManager.setAndAllowWhileIdle(AlarmManager.ELAPSED_REALTIME_WAKEUP, triggerAt, restorePendingIntent(context))
  }

  fun restoreIfExpired(context: Context) { reconcile(context) }

  fun shouldMuteCalls(context: Context): Boolean {
    val preferences = prefs(context)
    return isSessionActive(context) && preferences.getBoolean(KEY_MUTE_CALLS, false)
  }

  fun addCallEvent(context: Context, phoneNumber: String?) {
    val preferences = prefs(context)
    val existing = try { JSONArray(preferences.getString(KEY_CALL_EVENTS, "[]")) } catch (_: Exception) { JSONArray() }
    val updated = JSONArray()
    for (index in maxOf(0, existing.length() - MAX_CALL_EVENTS + 1) until existing.length()) {
      updated.put(existing.getJSONObject(index))
    }
    updated.put(JSONObject().put("phoneNumber", phoneNumber).put("timestamp", System.currentTimeMillis()))
    preferences.edit().putString(KEY_CALL_EVENTS, updated.toString()).apply()
  }

  fun getCallEvents(context: Context): List<Map<String, Any?>> {
    val array = try { JSONArray(prefs(context).getString(KEY_CALL_EVENTS, "[]")) } catch (_: Exception) { JSONArray() }
    return (0 until array.length()).mapNotNull { index ->
      val event = array.optJSONObject(index) ?: return@mapNotNull null
      mapOf("phoneNumber" to event.optString("phoneNumber").takeUnless { it == "null" || it.isBlank() }, "timestamp" to event.optLong("timestamp"))
    }.sortedByDescending { it["timestamp"] as? Long ?: 0L }
  }

  fun clearCallEvents(context: Context) {
    prefs(context).edit().putString(KEY_CALL_EVENTS, "[]").apply()
  }
}

class HalovatCallScreeningService : CallScreeningService() {
  override fun onScreenCall(callDetails: Call.Details) {
    val context = applicationContext
    val isIncoming = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && callDetails.callDirection == Call.Details.DIRECTION_INCOMING
    val mute = isIncoming && HalovatFocusController.shouldMuteCalls(context)
    if (mute) {
      val number: String? = callDetails.handle?.let { handle: Uri -> handle.schemeSpecificPart }
      HalovatFocusController.addCallEvent(context, number)
    }
    val response = CallScreeningService.CallResponse.Builder()
      .setDisallowCall(false)
      .setRejectCall(false)
      .apply { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) setSilenceCall(mute) }
      .build()
    respondToCall(callDetails, response)
  }
}

class HalovatFocusRestoreReceiver : android.content.BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    when (intent?.action) {
      Intent.ACTION_BOOT_COMPLETED -> HalovatFocusController.end(context)
      ACTION_RESTORE -> HalovatFocusController.restoreIfExpired(context)
    }
  }

  companion object {
    const val ACTION_RESTORE = "uz.halovat.focus.RESTORE_SESSION"
  }
}
