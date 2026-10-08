package uz.halovat.app.platform.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import uz.halovat.app.MainActivity
import uz.halovat.app.R
import uz.halovat.app.platform.reminders.ReminderActionReceiver
import uz.halovat.app.platform.reminders.PrayerReminderScheduler

object HalovatNotifications {
    const val CHANNEL_PRAYERS = "prayer_reminders"
    const val CHANNEL_SUMMARIES = "call_summaries"
    const val ACTION_QUIET_20 = "uz.halovat.app.action.QUIET_20"
    const val ACTION_SNOOZE_10 = "uz.halovat.app.action.SNOOZE_10"
    const val ACTION_SKIP = "uz.halovat.app.action.SKIP_REMINDER"
    const val ACTION_PRAYER_DONE = "uz.halovat.app.action.PRAYER_DONE"
    const val ACTION_PRAYER_MISSED = "uz.halovat.app.action.PRAYER_MISSED"

    fun createChannels(context: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL_PRAYERS, context.getString(R.string.today_prayers), NotificationManager.IMPORTANCE_DEFAULT))
        manager.createNotificationChannel(NotificationChannel(CHANNEL_SUMMARIES, context.getString(R.string.summary_title), NotificationManager.IMPORTANCE_DEFAULT))
    }

    fun postPrayerCheck(context: Context, prayerName: String, prayerDate: String, localizedPrayer: String) {
        createChannels(context)
        val contentIntent = PendingIntent.getActivity(
            context, 3100, Intent(context, MainActivity::class.java), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_PRAYERS)
            .setSmallIcon(android.R.drawable.ic_lock_silent_mode)
            .setContentTitle(context.getString(R.string.prayer_check_title, localizedPrayer))
            .setContentText(context.getString(R.string.prayer_check_body))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .addAction(0, context.getString(R.string.prayer_check_done), prayerStatusPending(context, ACTION_PRAYER_DONE, 3204, prayerName, prayerDate))
            .addAction(0, context.getString(R.string.prayer_check_missed), prayerStatusPending(context, ACTION_PRAYER_MISSED, 3205, prayerName, prayerDate))
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(3100, notification) }
    }

    fun postCallSummary(context: Context, count: Int) {
        if (count <= 0) return
        createChannels(context)
        val pending = PendingIntent.getActivity(
            context, 3300, Intent(context, MainActivity::class.java).putExtra("open_calls", true),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_SUMMARIES)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle(context.getString(R.string.summary_title))
            .setContentText(context.getString(R.string.calls_count, count))
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(3300, notification) }
    }

    fun postDndPermissionRequired(context: Context) {
        createChannels(context)
        val pending = PendingIntent.getActivity(
            context, 3301, Intent(context, MainActivity::class.java).putExtra("open_settings", true),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val notification = NotificationCompat.Builder(context, CHANNEL_PRAYERS)
            .setSmallIcon(android.R.drawable.ic_lock_silent_mode)
            .setContentTitle(context.getString(R.string.quiet_access_needed))
            .setContentText(context.getString(R.string.grant_access))
            .setContentIntent(pending)
            .setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
            .build()
        runCatching { NotificationManagerCompat.from(context).notify(3301, notification) }
    }

    private fun prayerStatusPending(context: Context, action: String, requestCode: Int, prayerName: String, prayerDate: String) = PendingIntent.getBroadcast(
        context, requestCode, Intent(context, ReminderActionReceiver::class.java).setAction(action)
            .putExtra(PrayerReminderScheduler.EXTRA_PRAYER_NAME, prayerName)
            .putExtra(PrayerReminderScheduler.EXTRA_PRAYER_DATE, prayerDate),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    private fun actionPending(context: Context, action: String, requestCode: Int, prayerName: String? = null) = PendingIntent.getBroadcast(
        context, requestCode, Intent(context, ReminderActionReceiver::class.java).setAction(action).putExtra("prayer_name", prayerName),
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
}
