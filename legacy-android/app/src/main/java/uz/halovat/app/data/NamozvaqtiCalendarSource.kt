package uz.halovat.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import uz.halovat.app.domain.PrayerCalendarMonth
import java.net.HttpURLConnection
import java.net.URL
import java.time.YearMonth
import java.util.Locale

/** Reads the public monthly table shown by namozvaqti.uz and keeps its attribution URL. */
class NamozvaqtiCalendarSource {
    suspend fun fetch(citySlug: String, yearMonth: YearMonth): PrayerCalendarMonth = withContext(Dispatchers.IO) {
        require(citySlug.matches(Regex("[a-z0-9-]+"))) { "Unsupported city name" }
        val sourceUrl = "https://namozvaqti.uz/uz/oylik/${yearMonth.monthValue}/$citySlug"
        val connection = URL(sourceUrl).openConnection() as HttpURLConnection
        try {
            connection.connectTimeout = 8_000
            connection.readTimeout = 8_000
            connection.setRequestProperty("User-Agent", "Halovat/0.1 (prayer schedule with source attribution)")
            connection.setRequestProperty("Accept", "text/html")
            val status = connection.responseCode
            if (status !in 200..299) throw IllegalStateException("Namozvaqti.uz returned HTTP $status")
            val html = connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() }
            parse(html, citySlug, yearMonth, sourceUrl)
        } finally {
            connection.disconnect()
        }
    }

    private fun parse(html: String, citySlug: String, yearMonth: YearMonth, sourceUrl: String): PrayerCalendarMonth {
        val lowerHtml = html.lowercase(Locale.ROOT)
        val monthName = MONTH_NAMES[yearMonth.monthValue - 1]
        require(lowerHtml.contains(yearMonth.year.toString()) && lowerHtml.contains(monthName)) {
            "The prayer calendar page does not match ${yearMonth.year}-${yearMonth.monthValue}"
        }

        val days = linkedMapOf<Int, List<Int>>()
        ROW.findAll(html).forEach { rowMatch ->
            val cells = CELL.findAll(rowMatch.groupValues[1]).map { cell ->
                cell.groupValues[1]
                    .replace(HTML_TAGS, " ")
                    .replace("&nbsp;", " ", ignoreCase = true)
                    .replace("&#039;", "'", ignoreCase = true)
                    .replace("&amp;", "&", ignoreCase = true)
                    .trim()
            }.toList()
            if (cells.size < 7) return@forEach
            val day = DAY.find(cells.first())?.groupValues?.get(1)?.toIntOrNull() ?: return@forEach
            val times = cells.drop(1).mapNotNull(::toMinutes)
            if (day in 1..yearMonth.lengthOfMonth() && times.size >= 6) days[day] = times.take(6)
        }
        require(days.size >= 28) { "Namozvaqti.uz did not return a complete monthly prayer table" }
        return PrayerCalendarMonth(
            citySlug = citySlug,
            year = yearMonth.year,
            month = yearMonth.monthValue,
            days = days,
            sourceUrl = sourceUrl,
            fetchedAtMillis = System.currentTimeMillis(),
        )
    }

    private fun toMinutes(value: String): Int? {
        val match = TIME.matchEntire(value) ?: return null
        val hour = match.groupValues[1].toIntOrNull() ?: return null
        val minute = match.groupValues[2].toIntOrNull() ?: return null
        return (hour * 60 + minute).takeIf { hour in 0..23 && minute in 0..59 }
    }

    private companion object {
        val ROW = Regex("<tr\\b[^>]*>(.*?)</tr>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        val CELL = Regex("<td\\b[^>]*>(.*?)</td>", setOf(RegexOption.IGNORE_CASE, RegexOption.DOT_MATCHES_ALL))
        val HTML_TAGS = Regex("<[^>]+>")
        val DAY = Regex("^\\s*(\\d{1,2})\\b")
        val TIME = Regex("(\\d{1,2}):(\\d{2})")
        val MONTH_NAMES = listOf(
            "yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust",
            "sentyabr", "oktyabr", "noyabr", "dekabr",
        )
    }
}
