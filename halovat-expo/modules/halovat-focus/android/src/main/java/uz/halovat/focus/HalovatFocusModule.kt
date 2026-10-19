package uz.halovat.focus

import android.app.NotificationManager
import android.app.AlarmManager
import android.net.Uri
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.media.AudioManager
import expo.modules.notifications.service.NotificationsService
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise

class HalovatFocusModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HalovatFocus")

    Function("getStatus") {
      val context = appContext.reactContext?.applicationContext
        ?: return@Function mapOf("supported" to false)
      val notificationManager = context.getSystemService(NotificationManager::class.java)
      mapOf(
        "supported" to true,
        "dndAccess" to notificationManager.isNotificationPolicyAccessGranted,
        "callScreeningSupported" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q),
        "callScreeningRole" to HalovatFocusController.hasCallScreeningRole(context),
        "sessionActive" to HalovatFocusController.isSessionActive(context),
        "exactAlarmAccess" to (Build.VERSION.SDK_INT < 31 || context.getSystemService(AlarmManager::class.java).canScheduleExactAlarms()),
        "batteryUnrestricted" to context.getSystemService(PowerManager::class.java).isIgnoringBatteryOptimizations(context.packageName),
        "manufacturer" to Build.MANUFACTURER,
        "model" to Build.MODEL,
        "androidVersion" to Build.VERSION.RELEASE,
        "nextQuietBoundary" to context.getSharedPreferences("halovat.auto.quiet.v1", Context.MODE_PRIVATE).getLong("nextBoundary", 0L),
        "prayerScheduleThrough" to context.getSharedPreferences("halovat.auto.quiet.v1", Context.MODE_PRIVATE).getLong("scheduleThrough", 0L),
        "quietAppliedAt" to context.getSharedPreferences("halovat.focus.native.v1", Context.MODE_PRIVATE).getLong("quietAppliedAt", 0L),
        "quietError" to context.getSharedPreferences("halovat.focus.native.v1", Context.MODE_PRIVATE).getString("lastQuietError", null),
        "prayerWindowCount" to org.json.JSONArray(context.getSharedPreferences("halovat.auto.quiet.v1", Context.MODE_PRIVATE).getString("windows", "[]")).length(),
        "mosqueInside" to HalovatAutoQuiet.mosqueInside(context),
        "mosqueQuietError" to context.getSharedPreferences("halovat.auto.quiet.v1", Context.MODE_PRIVATE).getString("regionError", null),
        "mosqueRegisteredAt" to context.getSharedPreferences("halovat.auto.quiet.v1", Context.MODE_PRIVATE).getLong("regionRegisteredAt", 0L),
        "reminderPopupAccess" to (Build.VERSION.SDK_INT < 34 || notificationManager.canUseFullScreenIntent()),
        "interruptionFilter" to notificationManager.currentInterruptionFilter,
        "ringerMode" to context.getSystemService(AudioManager::class.java).ringerMode,
        "alarmVolume" to context.getSystemService(AudioManager::class.java).getStreamVolume(AudioManager.STREAM_ALARM),
        "reminderReceiver" to NotificationsService.findDesignatedBroadcastReceiver(context, Intent(NotificationsService.NOTIFICATION_EVENT_ACTION))?.name,
      ) + HalovatReminderVibration.diagnostics(context) + HalovatReminderAttention.diagnostics(context)
    }

    Function("openDndSettings") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      val intent = Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      true
    }

    Function("openExactAlarmSettings") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      if (Build.VERSION.SDK_INT >= 31) context.startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    Function("openBatterySettings") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      // MIUI battery saver is separate from Android's Doze exemption. App details
      // provides the supported entry point to its per-app battery/autostart controls.
      val appDetails = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}"))
      val optimizationList = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)
      val miui = Build.MANUFACTURER.lowercase().let { it.contains("xiaomi") || it.contains("redmi") || it.contains("poco") }
      val candidates = if (miui) listOf(appDetails, optimizationList) else listOf(optimizationList, appDetails)
      candidates.any { intent ->
        try {
          context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
          true
        } catch (_: android.content.ActivityNotFoundException) {
          false
        } catch (_: SecurityException) {
          false
        }
      }
    }

    Function("openReminderPopupSettings") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      if (Build.VERSION.SDK_INT >= 34) context.startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
        Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      else context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
        Uri.parse("package:${context.packageName}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      true
    }

    Function("startVibrationPreview") {
      val context = appContext.reactContext?.applicationContext ?: return@Function mapOf("ok" to false, "reason" to "Android context unavailable")
      HalovatReminderVibration.start(context, "halovat-vibration-preview")
    }

    Function("stopVibrationPreview") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      HalovatReminderVibration.stop(context, "halovat-vibration-preview")
      true
    }

    Function("setPrayerQuietWindows") { json: String ->
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      HalovatAutoQuiet.setWindows(context, json)
      true
    }

    AsyncFunction("setMosqueRegion") { latitude: Double, longitude: Double, enabled: Boolean, promise: Promise ->
      val context = appContext.reactContext?.applicationContext
      if (context == null) promise.reject("E_UNAVAILABLE", "Android context unavailable", null)
      else HalovatAutoQuiet.configureMosque(context, latitude, longitude, enabled) { error ->
        if (error == null) promise.resolve(true) else promise.reject("E_GEOFENCE", error.message, error)
      }
    }

    Function("scheduleQuietPreview") {
      val context = appContext.reactContext?.applicationContext ?: throw IllegalStateException("Android context unavailable")
      HalovatAutoQuiet.preview(context)
    }
    Function("cancelQuietPreview") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      HalovatAutoQuiet.cancelPreview(context)
      true
    }

    Function("requestCallScreeningRole") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return@Function false
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      val roleManager = context.getSystemService(RoleManager::class.java)
      if (roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) return@Function true
      val activity = appContext.activityProvider?.currentActivity ?: return@Function false
      activity.startActivityForResult(roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING), 7541)
      true
    }

    Function("setQuietSession") { durationSeconds: Int, muteCalls: Boolean, muteNotifications: Boolean ->
      val context = appContext.reactContext?.applicationContext
        ?: return@Function mapOf("ok" to false, "reason" to "unavailable")
      HalovatFocusController.start(context, durationSeconds, muteCalls, muteNotifications)
    }

    Function("endQuietSession") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      HalovatFocusController.end(context)
      true
    }

    Function("getCallEvents") {
      val context = appContext.reactContext?.applicationContext ?: return@Function emptyList<Map<String, Any?>>()
      HalovatFocusController.getCallEvents(context)
    }

    Function("clearCallEvents") {
      val context = appContext.reactContext?.applicationContext ?: return@Function false
      HalovatFocusController.clearCallEvents(context)
      true
    }
  }
}
