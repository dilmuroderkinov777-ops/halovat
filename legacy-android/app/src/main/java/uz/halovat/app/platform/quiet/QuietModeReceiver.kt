package uz.halovat.app.platform.quiet

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import uz.halovat.app.HalovatApplication

class QuietModeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val leaseId = intent.getStringExtra(QuietModeCoordinator.EXTRA_LEASE_ID) ?: return
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as HalovatApplication
                QuietModeCoordinator.end(context, app.repository, leaseId)
                app.repository.pruneCallEvents()
            } finally {
                pending.finish()
            }
        }
    }
}
