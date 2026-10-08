package uz.halovat.app.platform.reminders

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import uz.halovat.app.data.AppRepository
import uz.halovat.app.HalovatApplication
import uz.halovat.app.domain.PrayerScheduleProvider
import uz.halovat.app.platform.PrayerLabels
import kotlinx.coroutines.flow.first
import java.time.ZoneId
import java.time.YearMonth
import java.time.Instant
import java.time.LocalDate

object PrayerReminderScheduler {
    suspend fun scheduleNext(context: Context, repository: AppRepository) {
        val settings = repository.settings.first()
        val now = System.currentTimeMillis()
        if (settings.enabledReminders.isEmpty()) {
            cancelNext(context)
            return
        }
        val provider = PrayerScheduleProvider()
        val zone = provider.zone(settings)
        val app = context.applicationContext as HalovatApplication
        val currentMonth = YearMonth.from(Instant.ofEpochMilli(now).atZone(zone))
        val calendars = listOf(currentMonth, currentMonth.plusMonths(1))
            .mapNotNull { app.prayerCalendarStore.get(settings.citySlug, it.year, it.monthValue) }
        val tracked = repository.prayerRecords.first().associateBy { "${it.date}|${it.prayerName}" }
        val today = java.time.Instant.ofEpochMilli(now).atZone(zone).toLocalDate()
        val upcomingCheck = (0L..1L).flatMap { dayOffset ->
            val date = today.plusDays(dayOffset)
            provider.forDate(settings, date, calendars)
                .filter { it.name in settings.enabledReminders && it.name != "Quyosh" && "${date}|${it.name}" !in tracked }
                .map { prayer -> Triple(date, prayer, prayer.atMillis + CHECK_DELAY_MILLIS) }
        }.filter { it.third > now }.minByOrNull { it.third }
        if (upcomingCheck == null) {
            cancelNext(context)
            return
        }
        val (prayerDate, prayer, checkAt) = upcomingCheck
        val intent = nextIntent(context).apply {
            putExtra(EXTRA_PRAYER_NAME, prayer.name)
            putExtra(EXTRA_PRAYER_DATE, prayerDate.toString())
        }
        val pending = PendingIntent.getBroadcast(
            context, 4100, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        context.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, checkAt, pending)
    }

    private fun cancelNext(context: Context) {
        val pending = PendingIntent.getBroadcast(context, 4100, nextIntent(context), PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        pending?.let { context.getSystemService(AlarmManager::class.java).cancel(it); it.cancel() }
    }

    private fun nextIntent(context: Context) = Intent(context, PrayerReminderReceiver::class.java).setAction(ACTION_PRAYER_REMINDER)

    fun scheduleSnooze(context: Context, prayerName: String) {
        val time = System.currentTimeMillis() + 10 * 60_000L
        val intent = Intent(context, PrayerReminderReceiver::class.java).apply {
            action = ACTION_PRAYER_REMINDER
            putExtra(EXTRA_PRAYER_NAME, prayerName)
            data = android.net.Uri.parse("halovat://snooze/$time")
        }
        val pending = PendingIntent.getBroadcast(context, time.hashCode(), intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        context.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, time, pending)
    }

    const val ACTION_PRAYER_REMINDER = "uz.halovat.app.action.PRAYER_REMINDER"
    const val EXTRA_PRAYER_NAME = "prayer_name"
    const val EXTRA_PRAYER_DATE = "prayer_date"
    const val CHECK_DELAY_MILLIS = 30 * 60_000L
}
