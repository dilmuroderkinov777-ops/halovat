package uz.halovat.app.platform

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import uz.halovat.app.HalovatApplication
import uz.halovat.app.platform.geofence.MosqueGeofences
import uz.halovat.app.platform.quiet.QuietModeCoordinator
import uz.halovat.app.platform.reminders.PrayerReminderScheduler

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as HalovatApplication
                app.repository.pruneCallEvents()
                QuietModeCoordinator.reconcile(context, app.repository)
                PrayerReminderScheduler.scheduleNext(context, app.repository)
                val settings = app.repository.settings.first()
                if (settings.mosqueGeofenceEnabled) {
                    runCatching { MosqueGeofences.register(context, app.repository) }
                        .onFailure { app.repository.saveSettings(settings.copy(mosqueGeofenceEnabled = false)) }
                }
            } finally {
                pending.finish()
            }
        }
    }
}
