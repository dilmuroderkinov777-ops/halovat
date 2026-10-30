package uz.halovat.focus

internal data class WidgetPrayer(val id: String, val name: String, val currentLabel: String, val at: Long, val time: String)
internal data class WidgetPrayerFrame(val current: WidgetPrayer, val next: WidgetPrayer, val progress: Float)

internal object PrayerWidgetSchedule {
  fun frame(prayers: List<WidgetPrayer>, now: Long): WidgetPrayerFrame? {
    val nextIndex = prayers.indexOfFirst { it.at > now }
    if (nextIndex < 1) return null
    val current = prayers[nextIndex - 1]
    val next = prayers[nextIndex]
    return WidgetPrayerFrame(current, next, ((now - current.at).toDouble() / (next.at - current.at).coerceAtLeast(1)).toFloat().coerceIn(0f, 1f))
  }

  fun countdownFormat(remaining: Long): String = when {
    remaining < 3_600_000L -> "00:%s"
    remaining < 36_000_000L -> "0%s"
    else -> "%s"
  }

  // Chronometer changes its hour field below one hour. Rebind the zero padding
  // at that point as well as at the prayer boundary; no per-second app service.
  fun nextRefresh(frame: WidgetPrayerFrame, now: Long): Long = listOf(
    frame.next.at,
    frame.next.at - 3_600_000L + 1,
    frame.next.at - 36_000_000L + 1,
  ).filter { it > now }.minOrNull() ?: frame.next.at
}
