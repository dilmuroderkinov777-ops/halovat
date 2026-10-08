package uz.halovat.app.platform.reminders

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import uz.halovat.app.HalovatApplication
import uz.halovat.app.platform.notifications.HalovatNotifications
import uz.halovat.app.platform.PrayerLabels

class PrayerReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val pending = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val app = context.applicationContext as HalovatApplication
                val prayerName = intent.getStringExtra(PrayerReminderScheduler.EXTRA_PRAYER_NAME) ?: "Namoz"
                val prayerDate = intent.getStringExtra(PrayerReminderScheduler.EXTRA_PRAYER_DATE) ?: ""
                HalovatNotifications.postPrayerCheck(context, prayerName, prayerDate, PrayerLabels.localized(context, prayerName))
                PrayerReminderScheduler.scheduleNext(context, app.repository)
            } finally {
                pending.finish()
            }
        }
    }
}
