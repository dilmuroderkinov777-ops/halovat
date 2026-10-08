package uz.halovat.app.domain

import com.batoulapps.adhan2.CalculationMethod
import com.batoulapps.adhan2.Coordinates
import com.batoulapps.adhan2.Madhab
import com.batoulapps.adhan2.PrayerAdjustments
import com.batoulapps.adhan2.PrayerTimes
import com.batoulapps.adhan2.data.DateComponents
import java.time.LocalDate
import java.time.Instant
import java.time.ZoneId
import java.time.YearMonth

class PrayerScheduleProvider {
    fun forDate(
        preferences: PrayerPreferences,
        date: LocalDate,
        calendars: Collection<PrayerCalendarMonth> = emptyList(),
    ): List<PrayerTime> {
        val calendar = calendars.firstOrNull {
            it.citySlug == preferences.citySlug && it.year == date.year && it.month == date.monthValue
        }
        val row = calendar?.days?.get(date.dayOfMonth)
        if (row != null && row.size == 6) {
            val zone = zone(preferences)
            val names = listOf("Bomdod", "Quyosh", "Peshin", "Asr", "Shom", "Xufton")
            return names.mapIndexed { index, name ->
                val localTime = date.atStartOfDay().plusMinutes(row[index].toLong())
                PrayerTime(name, localTime.atZone(zone).toInstant().toEpochMilli())
            }
        }
        val calculationMethod = runCatching { CalculationMethod.valueOf(preferences.calculationMethod) }
            .getOrDefault(CalculationMethod.MUSLIM_WORLD_LEAGUE)
        val parameters = calculationMethod.parameters.copy(
            madhab = if (preferences.hanafi) Madhab.HANAFI else Madhab.SHAFI,
            prayerAdjustments = PrayerAdjustments(
                fajr = preferences.fajrAdjustment,
                dhuhr = preferences.dhuhrAdjustment,
                asr = preferences.asrAdjustment,
                maghrib = preferences.maghribAdjustment,
                isha = preferences.ishaAdjustment,
            ),
        )
        val calculated = PrayerTimes(
            Coordinates(preferences.latitude, preferences.longitude),
            DateComponents(date.year, date.monthValue, date.dayOfMonth),
            parameters,
        )
        return listOf(
            PrayerTime("Bomdod", calculated.fajr.toEpochMilliseconds()),
            PrayerTime("Quyosh", calculated.sunrise.toEpochMilliseconds()),
            PrayerTime("Peshin", calculated.dhuhr.toEpochMilliseconds()),
            PrayerTime("Asr", calculated.asr.toEpochMilliseconds()),
            PrayerTime("Shom", calculated.maghrib.toEpochMilliseconds()),
            PrayerTime("Xufton", calculated.isha.toEpochMilliseconds()),
        )
    }

    fun today(
        preferences: PrayerPreferences,
        nowMillis: Long = System.currentTimeMillis(),
        zone: ZoneId = zone(preferences),
        calendars: Collection<PrayerCalendarMonth> = emptyList(),
    ): PrayerDay {
        val today = Instant.ofEpochMilli(nowMillis).atZone(zone).toLocalDate()
        val prayers = forDate(preferences, today, calendars)
        val fromCalendar = calendars.any {
            it.citySlug == preferences.citySlug && it.year == today.year && it.month == today.monthValue && today.dayOfMonth in it.days
        }
        val next = prayers.firstOrNull { it.name != "Quyosh" && it.atMillis > nowMillis }
            ?: forDate(preferences, today.plusDays(1), calendars).first { it.name == "Bomdod" }
        val sourceUrl = calendars.firstOrNull {
            it.citySlug == preferences.citySlug && it.year == today.year && it.month == today.monthValue
        }?.sourceUrl
        return PrayerDay(prayers, next, fromCalendar, sourceUrl)
    }

    fun zone(preferences: PrayerPreferences): ZoneId = runCatching { ZoneId.of(preferences.timeZoneId) }
        .getOrDefault(ZoneId.systemDefault())
}
