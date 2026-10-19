package uz.halovat.focus

import android.Manifest
import android.app.AlarmManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.location.LocationManager
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import org.json.JSONArray

internal object HalovatAutoQuiet {
  private fun prefs(c: Context) = c.getSharedPreferences("halovat.auto.quiet.v1", Context.MODE_PRIVATE)
  private const val REGION_ID = "halovat-selected-mosque"

  private fun schedule(c: Context): PrayerQuietSchedule {
    val p = prefs(c)
    val windows = try { JSONArray(p.getString("windows", "[]")) } catch (_: Exception) { JSONArray() }
    val stored = (0 until windows.length()).mapNotNull {
      val item = windows.optJSONObject(it) ?: return@mapNotNull null
      val start = item.optLong("start"); val end = item.optLong("end")
      if (start <= 0 || end <= start) null else QuietWindow(start, end, item.optLong("leadInMs", 0L).coerceIn(0L, 10_000L))
    }
    val previewEnd = p.getLong("previewEnd", 0L)
    val preview = if (previewEnd > System.currentTimeMillis()) listOf(QuietWindow(p.getLong("previewStart", 0L), previewEnd, 0L)) else emptyList()
    return PrayerQuietSchedule(stored + preview)
  }

  fun preview(c: Context): Map<String, Long> {
    val alarm = c.getSystemService(AlarmManager::class.java)
    require(Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms()) { "Aniq alarm ruxsati kerak." }
    val start = System.currentTimeMillis() + 15_000L
    val end = start + 30_000L
    prefs(c).edit().putLong("previewStart", start).putLong("previewEnd", end).apply()
    refresh(c)
    return mapOf("start" to start, "end" to end)
  }

  fun cancelPreview(c: Context) {
    prefs(c).edit().remove("previewStart").remove("previewEnd").apply()
    refresh(c)
  }

  fun prayerEnd(c: Context): Long {
    return schedule(c).activeEnd(System.currentTimeMillis())
  }

  fun mosqueInside(c: Context) = prefs(c).getBoolean("mosqueEnabled", false) && prefs(c).getBoolean("inside", false)

  fun quietLeadIn(c: Context): Long {
    return schedule(c).leadIn(System.currentTimeMillis())
  }

  fun setWindows(c: Context, json: String) {
    val windows = JSONArray(json)
    require(windows.length() <= 2000)
    val through = (0 until windows.length()).maxOfOrNull {
      val item = windows.getJSONObject(it)
      require(item.getLong("start") > 0 && item.getLong("end") > item.getLong("start"))
      item.getLong("end")
    } ?: 0L
    prefs(c).edit().putString("windows", json).putLong("scheduleThrough", through).apply()
    refresh(c)
  }

  fun refresh(c: Context) {
    HalovatFocusController.reconcile(c)
    val now = System.currentTimeMillis()
    // Wake with the prayer notification; finish its lead-in under the receiver's wake lock.
    val next = schedule(c).nextBoundary(now)
    val alarm = c.getSystemService(AlarmManager::class.java)
    val pending = PendingIntent.getBroadcast(c, 7543, Intent(c, HalovatAutoQuietReceiver::class.java).setAction("uz.halovat.focus.PRAYER_BOUNDARY"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    alarm.cancel(pending)
    prefs(c).edit().putLong("nextBoundary", next ?: 0L).apply()
    if (next != null) {
      if (Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms()) alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending)
      else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, pending)
    }
  }

  private fun regionPending(c: Context): PendingIntent {
    val flags = PendingIntent.FLAG_UPDATE_CURRENT or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
    return PendingIntent.getBroadcast(c, 7544, Intent(c, HalovatAutoQuietReceiver::class.java).setAction("uz.halovat.focus.MOSQUE_TRANSITION"), flags)
  }

  fun configureMosque(c: Context, latitude: Double, longitude: Double, enabled: Boolean, complete: (Exception?) -> Unit) {
    val p = prefs(c)
    val client = LocationServices.getGeofencingClient(c)
    if (!enabled) {
      p.edit().putBoolean("mosqueEnabled", false).putBoolean("inside", false).remove("regionError").apply()
      HalovatFocusController.reconcile(c)
      client.removeGeofences(regionPending(c)).addOnCompleteListener { complete(null) }
      return
    }
    if (c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
      (Build.VERSION.SDK_INT >= 29 && c.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED)) {
      val error = SecurityException("Aniq va fon joylashuv ruxsati kerak. Sozlamalarda “Har doim ruxsat berish”ni tanlang.")
      p.edit().putString("regionError", error.message).putBoolean("inside", false).apply()
      HalovatFocusController.reconcile(c)
      complete(error); return
    }
    if (!latitude.isFinite() || !longitude.isFinite() || latitude !in -90.0..90.0 || longitude !in -180.0..180.0) {
      complete(IllegalArgumentException("Masjid koordinatalari noto‘g‘ri.")); return
    }
    val region = Geofence.Builder().setRequestId(REGION_ID).setCircularRegion(latitude, longitude, 150f)
      .setExpirationDuration(Geofence.NEVER_EXPIRE).setNotificationResponsiveness(30_000)
      .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT).build()
    val request = GeofencingRequest.Builder().setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER or GeofencingRequest.INITIAL_TRIGGER_EXIT).addGeofence(region).build()
    // Persist before registration so the initial transition is not discarded.
    val sameRegion = p.getBoolean("mosqueEnabled", false) && p.getString("latitude", "") == latitude.toString() && p.getString("longitude", "") == longitude.toString()
    p.edit().putBoolean("mosqueEnabled", true).putString("latitude", latitude.toString()).putString("longitude", longitude.toString()).apply()
    if (!sameRegion) { p.edit().putBoolean("inside", false).apply(); HalovatFocusController.reconcile(c) }
    client.addGeofences(request, regionPending(c)).addOnSuccessListener {
      p.edit().remove("regionError").putLong("regionRegisteredAt", System.currentTimeMillis()).apply()
      // A fresh, accurate fix can establish the state while the initial geofence
      // event is still queued by Play services. Ambiguous boundary fixes are ignored.
      LocationServices.getFusedLocationProviderClient(c).lastLocation.addOnSuccessListener { location ->
        if (location != null && p.getBoolean("mosqueEnabled", false) &&
          p.getString("latitude", "") == latitude.toString() && p.getString("longitude", "") == longitude.toString() &&
          android.os.SystemClock.elapsedRealtimeNanos() - location.elapsedRealtimeNanos in 0..120_000_000_000L &&
          location.hasAccuracy() && location.accuracy <= 100f) {
          val distances = FloatArray(1)
          android.location.Location.distanceBetween(location.latitude, location.longitude, latitude, longitude, distances)
          if (distances[0] + location.accuracy < 150f || distances[0] - location.accuracy > 150f) {
            p.edit().putBoolean("inside", distances[0] < 150f).apply()
            HalovatFocusController.reconcile(c)
          }
        }
      }
      complete(null)
    }.addOnFailureListener {
      // Preserve the desired setting so foreground/provider/boot recovery can retry.
      p.edit().putBoolean("inside", false).putString("regionError", "Masjid hududi ulanmagan: ${it.message}").apply()
      HalovatFocusController.reconcile(c)
      complete(it)
    }
  }

  fun transition(c: Context, intent: Intent) {
    val event = GeofencingEvent.fromIntent(intent) ?: return
    if (event.hasError()) {
      // Avoid leaving the device silently muted when location monitoring fails.
      prefs(c).edit().putBoolean("inside", false).putString("regionError", "Masjid kuzatuvi xatosi: ${event.errorCode}. GPS va Google Play xizmatlarini tekshiring.").apply()
      HalovatFocusController.reconcile(c); return
    }
    if (event.triggeringGeofences?.none { it.requestId == REGION_ID } != false) return
    if (event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_ENTER && event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_EXIT) return
    prefs(c).edit().putBoolean("inside", event.geofenceTransition == Geofence.GEOFENCE_TRANSITION_ENTER).remove("regionError").apply()
    HalovatFocusController.reconcile(c)
  }

  fun restoreRegion(c: Context, resetInside: Boolean = false, complete: () -> Unit) {
    val p = prefs(c)
    if (resetInside) {
      p.edit().putBoolean("inside", false).apply()
      HalovatFocusController.reconcile(c)
    }
    if (!p.getBoolean("mosqueEnabled", false)) { complete(); return }
    configureMosque(c, p.getString("latitude", "0")!!.toDouble(), p.getString("longitude", "0")!!.toDouble(), true) { complete() }
  }
}

class HalovatAutoQuietReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED -> {
        val pending = goAsync()
        HalovatFocusController.end(context)
        HalovatAutoQuiet.refresh(context)
        HalovatAutoQuiet.restoreRegion(context, resetInside = true) { pending.finish() }
      }
      LocationManager.PROVIDERS_CHANGED_ACTION -> {
        val pending = goAsync()
        HalovatAutoQuiet.restoreRegion(context, resetInside = true) { pending.finish() }
      }
      "uz.halovat.focus.MOSQUE_TRANSITION" -> HalovatAutoQuiet.transition(context, intent)
      "uz.halovat.focus.PRAYER_BOUNDARY" -> {
        val delay = HalovatAutoQuiet.quietLeadIn(context)
        if (delay == 0L) { HalovatAutoQuiet.refresh(context); return }
        val pending = goAsync()
        val lock = context.getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Halovat:prayerLeadIn")
        lock.acquire(delay + 5_000L)
        Handler(Looper.getMainLooper()).postDelayed({
          try { HalovatAutoQuiet.refresh(context) }
          finally { if (lock.isHeld) lock.release(); pending.finish() }
        }, delay)
      }
      else -> HalovatAutoQuiet.refresh(context)
    }
  }
}
