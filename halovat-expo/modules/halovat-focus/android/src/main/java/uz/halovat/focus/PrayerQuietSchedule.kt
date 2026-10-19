package uz.halovat.focus

internal data class QuietWindow(val start: Long, val end: Long, val leadInMs: Long = 0L)

internal class PrayerQuietSchedule(private val windows: List<QuietWindow>) {
  fun activeEnd(now: Long): Long = windows.filter { it.start <= now && it.end > now }.maxOfOrNull { it.end } ?: 0L

  fun leadIn(now: Long): Long = windows.mapNotNull { window ->
    val delay = window.start - now
    delay.takeIf { delay > 0 && delay <= window.leadInMs.coerceIn(0L, 10_000L) }
  }.minOrNull() ?: 0L

  fun nextBoundary(now: Long): Long? = windows.flatMap {
    val wakeAt = it.start - it.leadInMs.coerceIn(0L, 10_000L)
    listOfNotNull(if (it.start > now) maxOf(now, wakeAt) else null, it.end.takeIf { end -> end > now })
  }.minOrNull()
}
