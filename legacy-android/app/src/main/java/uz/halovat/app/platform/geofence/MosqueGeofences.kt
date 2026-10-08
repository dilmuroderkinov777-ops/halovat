package uz.halovat.app.platform.geofence

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import com.google.android.gms.location.Geofence
import com.google.android.gms.location.GeofencingRequest
import com.google.android.gms.location.LocationServices
import uz.halovat.app.data.AppRepository
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.tasks.await

object MosqueGeofences {
    const val GEOFENCE_ID = "halovat-selected-mosque"
    private const val REQUEST_CODE = 5200

    suspend fun register(context: Context, repository: AppRepository) {
        val settings = repository.settings.first()
        val lat = settings.mosqueLatitude ?: error("Masjid koordinatasi yo‘q")
        val lon = settings.mosqueLongitude ?: error("Masjid koordinatasi yo‘q")
        check(hasFineLocation(context)) { "Aniq joylashuv ruxsati kerak" }
        if (Build.VERSION.SDK_INT >= 29) {
            check(ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED) {
                "Fon joylashuviga ruxsat berilmagan"
            }
        }
        val geofence = Geofence.Builder()
            .setRequestId(GEOFENCE_ID)
            .setCircularRegion(lat, lon, settings.mosqueRadiusMeters.coerceIn(50f, 1_000f))
            .setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER or Geofence.GEOFENCE_TRANSITION_EXIT)
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setLoiteringDelay(2 * 60 * 1000)
            .build()
        val request = GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofence(geofence)
            .build()
        LocationServices.getGeofencingClient(context).addGeofences(request, pendingIntent(context)).await()
    }

    suspend fun remove(context: Context) {
        LocationServices.getGeofencingClient(context).removeGeofences(pendingIntent(context)).await()
    }

    private fun pendingIntent(context: Context): PendingIntent {
        val intent = Intent(context, MosqueGeofenceReceiver::class.java).setAction("uz.halovat.app.action.MOSQUE_GEOFENCE")
        return PendingIntent.getBroadcast(
            context, REQUEST_CODE, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE,
        )
    }

    fun hasForegroundLocation(context: Context) =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

    private fun hasFineLocation(context: Context) =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
}
