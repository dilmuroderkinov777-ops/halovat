package uz.halovat.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class SessionPolicyTest {
    @Test
    fun endingManualLeaseDoesNotEndOverlappingMosqueLease() {
        val now = 10_000L
        val manual = QuietLease("manual-1", QuietSource.MANUAL, now, now + 60_000)
        val mosque = QuietLease("mosque-1", QuietSource.MOSQUE, now + 500, now + 90_000)

        val remaining = QuietSessionPolicy.end(listOf(manual, mosque), manual.id, now + 1_000)

        assertEquals(listOf(mosque), remaining)
        assertEquals(mosque, QuietSessionPolicy.callSession(remaining, now + 1_000))
    }

    @Test
    fun repeatedGeofenceEnterUpdatesSameLeaseInsteadOfDuplicatingIt() {
        val first = QuietLease("mosque-1", QuietSource.MOSQUE, 1_000, 50_000)
        val refreshed = first.copy(startedAt = 2_000, endsAt = 90_000)

        val result = QuietSessionPolicy.upsert(listOf(first), refreshed, 2_000)

        assertEquals(1, result.size)
        assertEquals(refreshed, result.single())
    }

    @Test
    fun existingDndIsNotClaimedByHalovat() {
        assertFalse(QuietSessionPolicy.shouldTakeDndOwnership(currentFilter = 2, allFilter = 1))
        assertTrue(QuietSessionPolicy.shouldTakeDndOwnership(currentFilter = 1, allFilter = 1))
    }

    @Test
    fun privateNumbersStayNullAndMalformedNumbersAreNormalized() {
        assertNull(CallEventPolicy.normalizeNumber(null))
        assertNull(CallEventPolicy.normalizeNumber("anonymous"))
        assertEquals("+998901234567", CallEventPolicy.normalizeNumber("+998 (90) 123-45-67"))
    }

    @Test
    fun duplicateCallEventAndRetentionWindowAreHandled() {
        val now = 86_400_000L
        val event = CallEvent("call-1", "+998901234567", now - 1_000, "manual-1")
        val repeated = event.copy(receivedAt = now + 1_000)
        val old = event.copy(id = "old", receivedAt = now - CallEventPolicy.RETENTION_MILLIS - 1)

        assertTrue(CallEventPolicy.isDuplicate(listOf(event), repeated))
        assertEquals(listOf(event), CallEventPolicy.retained(listOf(event, old), now))
    }

    @Test
    fun prayerTimesUseLocalCalendarDateAndMinuteAdjustment() {
        val provider = PrayerScheduleProvider()
        val zone = ZoneId.of("Asia/Tashkent")
        val date = LocalDate.of(2026, 10, 2)
        val base = provider.forDate(PrayerPreferences(), date)
        val adjusted = provider.forDate(PrayerPreferences(fajrAdjustment = 5), date)

        assertTrue(base.all { Instant.ofEpochMilli(it.atMillis).atZone(zone).toLocalDate() == date })
        assertEquals(5 * 60_000L, adjusted.first { it.name == "Bomdod" }.atMillis - base.first { it.name == "Bomdod" }.atMillis)
    }

    @Test
    fun afterIshaNextPrayerIsTomorrowFajr() {
        val provider = PrayerScheduleProvider()
        val zone = ZoneId.of("Asia/Tashkent")
        val date = LocalDate.of(2026, 10, 2)
        val isha = provider.forDate(PrayerPreferences(), date).last().atMillis

        val next = provider.today(PrayerPreferences(), isha + 60_000, zone).next

        assertEquals("Bomdod", next?.name)
        assertTrue((next?.atMillis ?: 0) > isha)
    }
}
