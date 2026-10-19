package uz.halovat.focus

import org.junit.Assert.*
import org.junit.Test

class PrayerQuietScheduleTest {
  @Test fun entersAtStartAndRestoresAtEnd() {
    val schedule = PrayerQuietSchedule(listOf(QuietWindow(20_000L, 1_520_000L)))
    assertEquals(0L, schedule.activeEnd(19_999L))
    assertEquals(1_520_000L, schedule.activeEnd(20_000L))
    assertEquals(1_520_000L, schedule.activeEnd(1_519_999L))
    assertEquals(0L, schedule.activeEnd(1_520_000L))
    assertNull(schedule.nextBoundary(1_520_000L))
  }

  @Test fun notificationLeadInDoesNotMuteItsFirstTenSeconds() {
    val schedule = PrayerQuietSchedule(listOf(QuietWindow(30_000L, 1_520_000L, 10_000L)))
    assertEquals(20_000L, schedule.nextBoundary(15_000L))
    assertEquals(10_000L, schedule.leadIn(20_000L))
    assertEquals(0L, schedule.activeEnd(20_000L))
    assertEquals(0L, schedule.leadIn(30_000L))
    assertEquals(1_520_000L, schedule.activeEnd(30_000L))
    assertEquals(1_520_000L, schedule.nextBoundary(30_000L))
  }

  @Test fun resumeDuringLeadInUsesOnlyTheRemainingDelay() {
    val schedule = PrayerQuietSchedule(listOf(QuietWindow(30_000L, 90_000L, 10_000L)))
    assertEquals(25_000L, schedule.nextBoundary(25_000L))
    assertEquals(5000L, schedule.leadIn(25_000L))
  }

  @Test fun overlapKeepsQuietUntilLastOwnerEnds() {
    val schedule = PrayerQuietSchedule(listOf(QuietWindow(10L, 40L), QuietWindow(20L, 60L)))
    assertEquals(60L, schedule.activeEnd(30L))
    assertEquals(60L, schedule.activeEnd(40L))
    assertEquals(0L, schedule.activeEnd(60L))
  }

  @Test fun emptyAndExpiredSchedulesDoNotRearm() {
    assertNull(PrayerQuietSchedule(emptyList()).nextBoundary(100L))
    assertNull(PrayerQuietSchedule(listOf(QuietWindow(10L, 90L))).nextBoundary(100L))
  }
}
