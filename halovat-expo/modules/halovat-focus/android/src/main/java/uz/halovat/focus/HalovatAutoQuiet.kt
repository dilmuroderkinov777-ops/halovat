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
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import org.json.JSONArray

internal object HalovatAutoQuiet {
  private fun prefs(c: Context) = c.getSharedPreferences("halovat.auto.quiet.v1", Context.MODE_PRIVATE)
  private const val REGION_ID = "halovat-selected-mosque"

  fun prayerEnd(c: Context): Long {
    val now = System.currentTimeMillis()
    val windows = JSONArray(prefs(c).getString("windows", "[]"))
    var end = 0L
    for (i in 0 until windows.length()) {
      val item = windows.getJSONObject(i)
      if (item.getLong("start") <= now && item.getLong("end") > now) end = maxOf(end, item.getLong("end"))
    }
    return end
  }

  fun mosqueInside(c: Context) = prefs(c).getBoolean("mosqueEnabled", false) && prefs(c).getBoolean("inside", false)

  fun quietLeadIn(c: Context): Long {
    val now = System.currentTimeMillis()
    val windows = JSONArray(prefs(c).getString("windows", "[]"))
    for (i in 0 until windows.length()) {
      val item = windows.getJSONObject(i)
      val delay = item.getLong("start") - now
      val lead = item.optLong("leadInMs", 0L).coerceIn(0L, 10_000L)
      if (lead > 0 && delay in 1..lead) return delay
    }
    return 0L
  }

  fun setWindows(c: Context, json: String) {
    JSONArray(json) // Validate before saving or changing the current mode.
    prefs(c).edit().putString("windows", json).apply()
    refresh(c)
  }

  fun refresh(c: Context) {
    HalovatFocusController.reconcile(c)
    val now = System.currentTimeMillis()
    val windows = JSONArray(prefs(c).getString("windows", "[]"))
    var next = Long.MAX_VALUE
    for (i in 0 until windows.length()) {
      val item = windows.getJSONObject(i)
      val start = item.getLong("start")
      val wakeAt = start - item.optLong("leadInMs", 0L).coerceIn(0L, 10_000L)
      // Wake with the prayer notification, then finish the short lead-in in this receiver.
      // A second allow-while-idle alarm ten seconds later can be throttled by Doze.
      if (start > now) next = minOf(next, maxOf(now, wakeAt))
      if (item.getLong("end") > now) next = minOf(next, item.getLong("end"))
    }
    val alarm = c.getSystemService(AlarmManager::class.java)
    val pending = PendingIntent.getBroadcast(c, 7543, Intent(c, HalovatAutoQuietReceiver::class.java).setAction("uz.halovat.focus.PRAYER_BOUNDARY"), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    alarm.cancel(pending)
    if (next != Long.MAX_VALUE) {
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
      p.edit().putBoolean("mosqueEnabled", false).putBoolean("inside", false).apply()
      HalovatFocusController.reconcile(c)
      client.removeGeofences(regionPending(c)).addOnCompleteListener { complete(null) }
      return
    }
    if (c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED ||
      (Build.VERSION.SDK_INT >= 29 && c.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) != PackageManager.PERMISSION_GRANTED)) {
      complete(SecurityException("Background precise location required")); return
    }
    val region = Geofence.Builder().setRequestId(REGION_ID).setCircularRegion(latitude, longitude, 150f)
      .setExpirationDuration(Geofence.NEVER_EXPIRE).setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT).build()
    val request = GeofencingRequest.Builder().setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER or GeofencingRequest.INITIAL_TRIGGER_EXIT).addGeofence(region).build()
    // Persist before registration so the initial transition is not discarded.
    val sameRegion = p.getBoolean("mosqueEnabled", false) && p.getString("latitude", "") == latitude.toString() && p.getString("longitude", "") == longitude.toString()
    p.edit().putBoolean("mosqueEnabled", true).putString("latitude", latitude.toString()).putString("longitude", longitude.toString()).apply()
    if (!sameRegion) { p.edit().putBoolean("inside", false).apply(); HalovatFocusController.reconcile(c) }
    client.addGeofences(request, regionPending(c)).addOnSuccessListener { complete(null) }.addOnFailureListener {
      p.edit().putBoolean("mosqueEnabled", false).putBoolean("inside", false).apply()
      HalovatFocusController.reconcile(c)
      complete(it)
    }
  }

  fun transition(c: Context, intent: Intent) {
    val event = GeofencingEvent.fromIntent(intent) ?: return
    if (event.hasError()) {
      // Avoid leaving the device silently muted when location monitoring fails.
      prefs(c).edit().putBoolean("inside", false).apply()
      HalovatFocusController.reconcile(c); return
    }
    if (event.triggeringGeofences?.none { it.requestId == REGION_ID } != false) return
    if (event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_ENTER && event.geofenceTransition != Geofence.GEOFENCE_TRANSITION_EXIT) return
    prefs(c).edit().putBoolean("inside", event.geofenceTransition == Geofence.GEOFENCE_TRANSITION_ENTER).apply()
    HalovatFocusController.reconcile(c)
  }

  fun restoreRegion(c: Context, complete: () -> Unit) {
    val p = prefs(c)
    p.edit().putBoolean("inside", false).apply()
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
        HalovatAutoQuiet.restoreRegion(context) { pending.finish() }
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
