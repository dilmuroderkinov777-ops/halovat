package uz.halovat.app.platform.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.app.NotificationManagerCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import uz.halovat.app.HalovatApplication
import uz.halovat.app.domain.QuietSource
import uz.halovat.app.platform.notifications.HalovatNotifications
import uz.halovat.app.platform.quiet.QuietModeCoordinator
import uz.halovat.app.domain.PrayerStatus
import java.time.LocalDate

class ReminderActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        NotificationManagerCompat.from(context).cancel(3100)
        when (intent.action) {
            HalovatNotifications.ACTION_PRAYER_DONE,
            HalovatNotifications.ACTION_PRAYER_MISSED -> {
                val date = intent.getStringExtra(PrayerReminderScheduler.EXTRA_PRAYER_DATE)?.let { runCatching { LocalDate.parse(it) }.getOrNull() } ?: return
                val prayerName = intent.getStringExtra(PrayerReminderScheduler.EXTRA_PRAYER_NAME) ?: return
                val status = if (intent.action == HalovatNotifications.ACTION_PRAYER_DONE) PrayerStatus.PRAYED else PrayerStatus.MISSED
                val pending = goAsync()
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        val app = context.applicationContext as HalovatApplication
                        app.repository.setPrayerStatus(date, prayerName, status)
                    } finally {
                        pending.finish()
                    }
                }
                return
            }
            HalovatNotifications.ACTION_SKIP -> return
            HalovatNotifications.ACTION_SNOOZE_10 -> {
                PrayerReminderScheduler.scheduleSnooze(context, intent.getStringExtra("prayer_name") ?: "Namoz")
                return
            }
        }
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as HalovatApplication
                val lease = QuietModeCoordinator.start(context, app.repository, QuietSource.PRAYER, 20)
                if (lease == null) HalovatNotifications.postDndPermissionRequired(context)
            } finally {
                pending.finish()
            }
        }
    }
}
