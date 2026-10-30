package uz.halovat.focus

import org.junit.Assert.*
import org.junit.Test

class PrayerWidgetScheduleTest {
  private val hour = 3_600_000L
  private fun prayer(id: String, at: Long) = WidgetPrayer(id, id, "$id vaqti", at, "05:30")
  private val prayers = listOf(prayer("isha", 0), prayer("fajr", 10 * hour), prayer("dhuhr", 17 * hour), prayer("asr", 20 * hour))

  @Test fun overnightUsesYesterdayIsha() {
    val frame = PrayerWidgetSchedule.frame(prayers, hour)!!
    assertEquals("isha", frame.current.id)
    assertEquals("fajr", frame.next.id)
    assertEquals(0.1f, frame.progress, 0.0001f)
  }

  @Test fun prayerBoundaryAdvancesAndResetsProgress() {
    val frame = PrayerWidgetSchedule.frame(prayers, 10 * hour)!!
    assertEquals("fajr", frame.current.id)
    assertEquals("dhuhr", frame.next.id)
    assertEquals(0f, frame.progress, 0f)
  }

  @Test fun missingAndExpiredSchedulesDoNotShowAFalseCountdown() {
    assertNull(PrayerWidgetSchedule.frame(emptyList(), hour))
    assertNull(PrayerWidgetSchedule.frame(prayers, -1))
    assertNull(PrayerWidgetSchedule.frame(prayers, 20 * hour))
    assertNull(PrayerWidgetSchedule.frame(prayers, 30 * hour))
  }

  @Test fun refreshesAtClockFormatTransitionsAndPrayerTime() {
    val beforeHour = PrayerWidgetSchedule.frame(prayers, 8 * hour)!!
    assertEquals(9 * hour + 1, PrayerWidgetSchedule.nextRefresh(beforeHour, 8 * hour))
    val belowHour = PrayerWidgetSchedule.frame(prayers, 9 * hour + 1)!!
    assertEquals(10 * hour, PrayerWidgetSchedule.nextRefresh(belowHour, 9 * hour + 1))
    assertEquals("00:%s", PrayerWidgetSchedule.countdownFormat(hour - 1))
    assertEquals("0%s", PrayerWidgetSchedule.countdownFormat(hour))
    assertEquals("0%s", PrayerWidgetSchedule.countdownFormat(10 * hour - 1))
    assertEquals("%s", PrayerWidgetSchedule.countdownFormat(10 * hour))
  }
}
