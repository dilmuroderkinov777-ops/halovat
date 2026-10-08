package uz.halovat.app.platform.geofence

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingEvent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import uz.halovat.app.HalovatApplication
import uz.halovat.app.domain.QuietSource
import uz.halovat.app.platform.quiet.QuietModeCoordinator

class MosqueGeofenceReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val event = GeofencingEvent.fromIntent(intent) ?: return
        if (event.hasError()) return
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as HalovatApplication
                when (event.geofenceTransition) {
                    Geofence.GEOFENCE_TRANSITION_ENTER -> if (app.repository.settings.first().mosqueGeofenceEnabled) {
                        QuietModeCoordinator.start(context, app.repository, QuietSource.MOSQUE, 90, stableId = MosqueGeofences.GEOFENCE_ID)
                    }
                    Geofence.GEOFENCE_TRANSITION_EXIT -> QuietModeCoordinator.end(context, app.repository, MosqueGeofences.GEOFENCE_ID)
                }
            } finally {
                pending.finish()
            }
        }
    }
}
