package uz.halovat.app

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import uz.halovat.app.data.NamozvaqtiCalendarSource
import uz.halovat.app.domain.PrayerCalendarMonth
import uz.halovat.app.domain.PrayerDay
import uz.halovat.app.domain.PrayerPreferences
import uz.halovat.app.domain.PrayerRecord
import uz.halovat.app.domain.PrayerScheduleProvider
import uz.halovat.app.domain.QuietLease
import uz.halovat.app.domain.TasbeehProgress
import java.time.Instant
import java.time.YearMonth
import java.time.ZoneId

data class MainUiState(
    val settings: PrayerPreferences = PrayerPreferences(),
    val prayerDay: PrayerDay = PrayerDay(emptyList(), null),
    val leases: List<QuietLease> = emptyList(),
    val calls: List<uz.halovat.app.domain.CallEvent> = emptyList(),
    val prayerRecords: List<PrayerRecord> = emptyList(),
    val tasbeeh: TasbeehProgress = TasbeehProgress(),
    val now: Long = System.currentTimeMillis(),
    val calendarRefreshing: Boolean = false,
)

private data class MainData(
    val settings: PrayerPreferences,
    val leases: List<QuietLease>,
    val calls: List<uz.halovat.app.domain.CallEvent>,
    val prayerRecords: List<PrayerRecord>,
    val tasbeeh: TasbeehProgress,
    val calendars: List<PrayerCalendarMonth>,
    val calendarRefreshing: Boolean,
)

class MainViewModel(application: Application) : AndroidViewModel(application) {
    val repository = (application as HalovatApplication).repository
    private val app = application as HalovatApplication
    private val prayerCalendarSource = NamozvaqtiCalendarSource()
    private val calendars = MutableStateFlow<List<PrayerCalendarMonth>>(emptyList())
    private val calendarRefreshing = MutableStateFlow(false)
    private val refreshMutex = Mutex()
    private val ticks = flow {
        while (true) {
            emit(System.currentTimeMillis())
            delay(30_000)
        }
    }

    init {
        viewModelScope.launch {
            repository.settings.collect { settings -> refreshCalendars(settings, force = false) }
        }
    }

    private val trackingData = combine(repository.prayerRecords, repository.tasbeehProgress) { records, tasbeeh -> records to tasbeeh }
    private val coreData = combine(repository.settings, repository.quietLeases, repository.callEvents) { settings, leases, calls -> Triple(settings, leases, calls) }
    private val calendarData = combine(calendars, calendarRefreshing) { months, refreshing -> months to refreshing }
    private val mainData = combine(coreData, calendarData, trackingData) { core, calendar, tracking ->
        MainData(core.first, core.second, core.third, tracking.first, tracking.second, calendar.first, calendar.second)
    }

    val state = combine(mainData, ticks) { data, now ->
        val settings = data.settings
        MainUiState(
            settings = settings,
            prayerDay = PrayerScheduleProvider().today(settings, now, PrayerScheduleProvider().zone(settings), data.calendars),
            leases = data.leases.filter { it.endsAt > now },
            calls = data.calls.sortedByDescending { it.receivedAt },
            prayerRecords = data.prayerRecords,
            tasbeeh = data.tasbeeh,
            now = now,
            calendarRefreshing = data.calendarRefreshing,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), MainUiState())

    fun saveSettings(settings: PrayerPreferences) = viewModelScope.launch { repository.saveSettings(settings) }
    fun clearCalls() = viewModelScope.launch { repository.clearCallEvents() }
    fun markPrayer(date: java.time.LocalDate, prayerName: String, status: uz.halovat.app.domain.PrayerStatus) = viewModelScope.launch {
        if (status == uz.halovat.app.domain.PrayerStatus.MISSED) repository.setPrayerStatus(date, prayerName, status)
        else repository.setPrayerStatus(date, prayerName, status)
    }
    fun clearPrayer(date: java.time.LocalDate, prayerName: String) = viewModelScope.launch { repository.clearPrayerStatus(date, prayerName) }
    fun completeQada(date: java.time.LocalDate, prayerName: String) = viewModelScope.launch { repository.setQadaCompleted(date, prayerName, true) }
    fun saveTasbeeh(progress: TasbeehProgress) = viewModelScope.launch { repository.saveTasbeehProgress(progress) }

    fun refreshPrayerCalendar(force: Boolean = false) = viewModelScope.launch {
        refreshCalendars(repository.settingsNow(), force = force)
    }

    private suspend fun refreshCalendars(settings: PrayerPreferences, force: Boolean) {
        refreshMutex.withLock {
            if (settings.citySlug.isBlank()) return@withLock
            val provider = PrayerScheduleProvider()
            val zone: ZoneId = provider.zone(settings)
            val currentMonth = YearMonth.from(Instant.now().atZone(zone))
            val wanted = listOf(currentMonth, currentMonth.plusMonths(1))
            val cached = wanted.mapNotNull { app.prayerCalendarStore.get(settings.citySlug, it.year, it.monthValue) }
            calendars.value = cached
            val now = System.currentTimeMillis()
            val due = wanted.filter { month ->
                val item = cached.firstOrNull { it.year == month.year && it.month == month.monthValue }
                force || item == null || now - item.fetchedAtMillis > CACHE_REFRESH_MILLIS
            }
            if (due.isEmpty()) return@withLock
            calendarRefreshing.value = true
            try {
                for (month in due) {
                    val fetched = runCatching { prayerCalendarSource.fetch(settings.citySlug, month) }.getOrNull() ?: continue
                    app.prayerCalendarStore.save(fetched)
                    calendars.value = (calendars.value.filterNot { it.year == fetched.year && it.month == fetched.month } + fetched)
                }
            } finally {
                calendarRefreshing.value = false
            }
        }
    }

    private companion object {
        const val CACHE_REFRESH_MILLIS = 24 * 60 * 60 * 1000L
    }
}

private suspend fun uz.halovat.app.data.AppRepository.settingsNow(): PrayerPreferences = settings.first()
