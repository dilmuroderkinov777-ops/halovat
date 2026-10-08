package uz.halovat.app.platform.calls

import android.os.Build
import android.telecom.Call
import android.telecom.CallScreeningService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import uz.halovat.app.HalovatApplication
import uz.halovat.app.domain.CallEvent
import uz.halovat.app.domain.CallEventPolicy
import uz.halovat.app.domain.QuietSessionPolicy

class PrayerCallScreeningService : CallScreeningService() {
    override fun onScreenCall(details: Call.Details) {
        val incoming = if (Build.VERSION.SDK_INT >= 29) details.callDirection == Call.Details.DIRECTION_INCOMING else true
        if (!incoming) return

        // Always allow the call immediately. The service records metadata only after that response.
        val allow = CallResponse.Builder()
            .setDisallowCall(false)
            .setRejectCall(false)
            .setSkipCallLog(false)
            .setSkipNotification(false)
            .build()
        respondToCall(details, allow)

        val number = CallEventPolicy.normalizeNumber(details.handle?.schemeSpecificPart)
        val receivedAt = System.currentTimeMillis()
        val callTimestamp = details.creationTimeMillis.takeIf { it > 0L } ?: receivedAt
        CoroutineScope(Dispatchers.IO).launch {
            val app = application as HalovatApplication
            val settings = app.repository.settings.first()
            if (!settings.callSummaryEnabled) return@launch
            val lease = QuietSessionPolicy.callSession(app.repository.leasesNow(), receivedAt) ?: return@launch
            val dedupe = "$callTimestamp-${number?.hashCode() ?: "private"}"
            app.repository.addCallEvent(CallEvent(dedupe, number, receivedAt, lease.id))
        }
    }
}
