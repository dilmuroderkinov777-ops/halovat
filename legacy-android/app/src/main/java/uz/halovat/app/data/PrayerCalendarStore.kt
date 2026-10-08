package uz.halovat.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject
import uz.halovat.app.domain.PrayerCalendarMonth

private val Context.prayerCalendarStore by preferencesDataStore(name = "prayer_calendars")

class PrayerCalendarStore(context: Context) {
    private val store = context.prayerCalendarStore

    suspend fun get(citySlug: String, year: Int, month: Int): PrayerCalendarMonth? {
        val key = stringPreferencesKey(keyName(citySlug, year, month))
        return store.data.map { preferences -> decode(preferences[key]) }.first()
    }

    suspend fun save(calendar: PrayerCalendarMonth) {
        val key = stringPreferencesKey(keyName(calendar.citySlug, calendar.year, calendar.month))
        store.edit { it[key] = encode(calendar) }
    }

    private fun encode(value: PrayerCalendarMonth): String = JSONObject().apply {
        put("city", value.citySlug)
        put("year", value.year)
        put("month", value.month)
        put("source", value.sourceUrl)
        put("fetchedAt", value.fetchedAtMillis)
        put("days", JSONArray().apply {
            value.days.toSortedMap().forEach { (day, times) ->
                put(JSONObject().put("day", day).put("times", JSONArray(times)))
            }
        })
    }.toString()

    private fun decode(raw: String?): PrayerCalendarMonth? = runCatching {
        if (raw.isNullOrBlank()) return null
        val json = JSONObject(raw)
        val daysJson = json.getJSONArray("days")
        val days = buildMap {
            for (i in 0 until daysJson.length()) {
                val entry = daysJson.getJSONObject(i)
                val timesJson = entry.getJSONArray("times")
                val times = (0 until timesJson.length()).map(timesJson::getInt)
                if (times.size == 6) put(entry.getInt("day"), times)
            }
        }
        PrayerCalendarMonth(
            citySlug = json.getString("city"),
            year = json.getInt("year"),
            month = json.getInt("month"),
            days = days,
            sourceUrl = json.getString("source"),
            fetchedAtMillis = json.getLong("fetchedAt"),
        )
    }.getOrNull()

    private fun keyName(citySlug: String, year: Int, month: Int) =
        "${citySlug.lowercase()}_${year}_${month.toString().padStart(2, '0')}"
}
