package uz.halovat.app.domain

data class PrayerPreferences(
    val city: String = "Toshkent",
    val citySlug: String = "toshkent",
    val latitude: Double = 41.2995,
    val longitude: Double = 69.2401,
    val timeZoneId: String = "Asia/Tashkent",
    val calculationMethod: String = "MUSLIM_WORLD_LEAGUE",
    val hanafi: Boolean = true,
    val fajrAdjustment: Int = 0,
    val dhuhrAdjustment: Int = 0,
    val asrAdjustment: Int = 0,
    val maghribAdjustment: Int = 0,
    val ishaAdjustment: Int = 0,
    val enabledReminders: Set<String> = setOf("Bomdod", "Peshin", "Asr", "Shom", "Xufton"),
    val quietDurationMinutes: Int = 20,
    val callSummaryEnabled: Boolean = false,
    val mosqueName: String = "",
    val mosqueLatitude: Double? = null,
    val mosqueLongitude: Double? = null,
    val mosqueRadiusMeters: Float = 120f,
    val mosqueGeofenceEnabled: Boolean = false,
)

enum class QuietSource { MANUAL, PRAYER, MOSQUE }

data class QuietLease(
    val id: String,
    val source: QuietSource,
    val startedAt: Long,
    val endsAt: Long,
)

data class CallEvent(
    val id: String,
    val number: String?,
    val receivedAt: Long,
    val sessionId: String,
)

object QuietSessionPolicy {
    fun active(leases: List<QuietLease>, now: Long): List<QuietLease> = leases.filter { it.endsAt > now }

    fun upsert(leases: List<QuietLease>, lease: QuietLease, now: Long): List<QuietLease> =
        active(leases, now).filterNot { it.id == lease.id } + lease

    fun end(leases: List<QuietLease>, leaseId: String, now: Long): List<QuietLease> =
        active(leases, now).filterNot { it.id == leaseId }

    fun callSession(leases: List<QuietLease>, now: Long): QuietLease? = active(leases, now).minByOrNull { it.startedAt }

    fun shouldTakeDndOwnership(currentFilter: Int, allFilter: Int): Boolean = currentFilter == allFilter
}

object CallEventPolicy {
    const val RETENTION_MILLIS = 24 * 60 * 60 * 1000L

    fun normalizeNumber(raw: String?): String? = raw
        ?.takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) }
        ?.filter { it.isDigit() || it == '+' }
        ?.takeIf { it.isNotBlank() }

    fun retained(events: List<CallEvent>, now: Long): List<CallEvent> = events.filter {
        val age = now - it.receivedAt
        age >= 0L && age <= RETENTION_MILLIS
    }

    fun isDuplicate(events: List<CallEvent>, candidate: CallEvent): Boolean = events.any { it.id == candidate.id }
}

data class PrayerTime(val name: String, val atMillis: Long)

data class PrayerDay(
    val prayers: List<PrayerTime>,
    val next: PrayerTime?,
    val fromLocalCalendar: Boolean = false,
    val sourceUrl: String? = null,
)

enum class PrayerStatus { PRAYED, MISSED }

data class PrayerRecord(
    val date: java.time.LocalDate,
    val prayerName: String,
    val status: PrayerStatus,
    val qadaCompleted: Boolean = false,
    val markedAtMillis: Long = System.currentTimeMillis(),
)

data class TasbeehProgress(
    val presetId: String = "subhanallah",
    val count: Int = 0,
)

data class PrayerCalendarMonth(
    val citySlug: String,
    val year: Int,
    val month: Int,
    /** Day of month -> [Bomdod, Quyosh, Peshin, Asr, Shom, Xufton] minutes after midnight. */
    val days: Map<Int, List<Int>>,
    val sourceUrl: String,
    val fetchedAtMillis: Long,
)
