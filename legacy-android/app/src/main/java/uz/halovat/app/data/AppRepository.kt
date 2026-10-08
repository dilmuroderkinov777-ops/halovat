package uz.halovat.app.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject
import uz.halovat.app.domain.CallEvent
import uz.halovat.app.domain.CallEventPolicy
import uz.halovat.app.domain.PrayerPreferences
import uz.halovat.app.domain.PrayerRecord
import uz.halovat.app.domain.PrayerStatus
import uz.halovat.app.domain.QuietLease
import uz.halovat.app.domain.QuietSessionPolicy
import uz.halovat.app.domain.QuietSource
import uz.halovat.app.domain.TasbeehProgress
import java.time.LocalDate

private val Context.halovatStore by preferencesDataStore(name = "halovat")

class AppRepository(private val context: Context) {
    private val store = context.halovatStore
    private val eventsKey = stringPreferencesKey("call_events")
    private val leasesKey = stringPreferencesKey("quiet_leases")
    private val ownsDndKey = booleanPreferencesKey("owns_dnd_change")
    private val previousFilterKey = intPreferencesKey("previous_dnd_filter")
    private val quietGroupStartedAtKey = longPreferencesKey("quiet_group_started_at")
    private val prayerRecordsKey = stringPreferencesKey("prayer_tracking_records")
    private val tasbeehKey = stringPreferencesKey("tasbeeh_progress")

    val settings: Flow<PrayerPreferences> = store.data.map { p ->
        PrayerPreferences(
            city = p[stringPreferencesKey("city")] ?: "Toshkent",
            citySlug = p[stringPreferencesKey("city_slug")] ?: "toshkent",
            latitude = p[stringPreferencesKey("latitude")]?.toDoubleOrNull() ?: 41.2995,
            longitude = p[stringPreferencesKey("longitude")]?.toDoubleOrNull() ?: 69.2401,
            timeZoneId = p[stringPreferencesKey("time_zone_id")] ?: "Asia/Tashkent",
            calculationMethod = p[stringPreferencesKey("method")] ?: "MUSLIM_WORLD_LEAGUE",
            hanafi = p[booleanPreferencesKey("hanafi")] ?: true,
            fajrAdjustment = p[intPreferencesKey("adj_fajr")] ?: 0,
            dhuhrAdjustment = p[intPreferencesKey("adj_dhuhr")] ?: 0,
            asrAdjustment = p[intPreferencesKey("adj_asr")] ?: 0,
            maghribAdjustment = p[intPreferencesKey("adj_maghrib")] ?: 0,
            ishaAdjustment = p[intPreferencesKey("adj_isha")] ?: 0,
            enabledReminders = p[stringPreferencesKey("enabled_reminders")]
                ?.split(',')?.filter(String::isNotBlank)?.toSet()
                ?: setOf("Bomdod", "Peshin", "Asr", "Shom", "Xufton"),
            quietDurationMinutes = p[intPreferencesKey("quiet_duration")] ?: 20,
            callSummaryEnabled = p[booleanPreferencesKey("call_summary")] ?: false,
            mosqueName = p[stringPreferencesKey("mosque_name")] ?: "",
            mosqueLatitude = p[stringPreferencesKey("mosque_lat")]?.toDoubleOrNull(),
            mosqueLongitude = p[stringPreferencesKey("mosque_lon")]?.toDoubleOrNull(),
            mosqueRadiusMeters = p[floatPreferencesKey("mosque_radius")] ?: 120f,
            mosqueGeofenceEnabled = p[booleanPreferencesKey("mosque_enabled")] ?: false,
        )
    }

    val quietLeases: Flow<List<QuietLease>> = store.data.map { p -> decodeLeases(p[leasesKey]) }

    val callEvents: Flow<List<CallEvent>> = store.data.map { p ->
        CallEventPolicy.retained(decodeEvents(p[eventsKey]), System.currentTimeMillis())
    }

    val prayerRecords: Flow<List<PrayerRecord>> = store.data.map { p -> decodePrayerRecords(p[prayerRecordsKey]) }
    val tasbeehProgress: Flow<TasbeehProgress> = store.data.map { p -> decodeTasbeeh(p[tasbeehKey]) }

    suspend fun setPrayerStatus(date: LocalDate, prayerName: String, status: PrayerStatus) {
        store.edit { p ->
            val records = decodePrayerRecords(p[prayerRecordsKey]).associateBy { recordKey(it.date, it.prayerName) }.toMutableMap()
            val key = recordKey(date, prayerName)
            if (status == PrayerStatus.MISSED) {
                records[key] = PrayerRecord(date, prayerName, status, qadaCompleted = false)
            } else {
                records[key] = PrayerRecord(date, prayerName, status, qadaCompleted = false)
            }
            p[prayerRecordsKey] = encodePrayerRecords(records.values.sortedWith(compareBy(PrayerRecord::date, PrayerRecord::prayerName)))
        }
    }

    suspend fun clearPrayerStatus(date: LocalDate, prayerName: String) {
        store.edit { p ->
            val records = decodePrayerRecords(p[prayerRecordsKey]).filterNot { it.date == date && it.prayerName == prayerName }
            p[prayerRecordsKey] = encodePrayerRecords(records)
        }
    }

    suspend fun setQadaCompleted(date: LocalDate, prayerName: String, completed: Boolean) {
        store.edit { p ->
            val records = decodePrayerRecords(p[prayerRecordsKey]).map { record ->
                if (record.date == date && record.prayerName == prayerName && record.status == PrayerStatus.MISSED) {
                    record.copy(qadaCompleted = completed, markedAtMillis = System.currentTimeMillis())
                } else record
            }
            p[prayerRecordsKey] = encodePrayerRecords(records)
        }
    }

    suspend fun saveTasbeehProgress(progress: TasbeehProgress) {
        store.edit { it[tasbeehKey] = JSONObject().put("preset", progress.presetId).put("count", progress.count.coerceAtLeast(0)).toString() }
    }

    suspend fun saveSettings(value: PrayerPreferences) {
        store.edit { p ->
            p[stringPreferencesKey("city")] = value.city
            p[stringPreferencesKey("city_slug")] = value.citySlug
            p[stringPreferencesKey("latitude")] = value.latitude.toString()
            p[stringPreferencesKey("longitude")] = value.longitude.toString()
            p[stringPreferencesKey("time_zone_id")] = value.timeZoneId
            p[stringPreferencesKey("method")] = value.calculationMethod
            p[booleanPreferencesKey("hanafi")] = value.hanafi
            p[intPreferencesKey("adj_fajr")] = value.fajrAdjustment
            p[intPreferencesKey("adj_dhuhr")] = value.dhuhrAdjustment
            p[intPreferencesKey("adj_asr")] = value.asrAdjustment
            p[intPreferencesKey("adj_maghrib")] = value.maghribAdjustment
            p[intPreferencesKey("adj_isha")] = value.ishaAdjustment
            p[stringPreferencesKey("enabled_reminders")] = value.enabledReminders.joinToString(",")
            p[intPreferencesKey("quiet_duration")] = value.quietDurationMinutes
            p[booleanPreferencesKey("call_summary")] = value.callSummaryEnabled
            p[stringPreferencesKey("mosque_name")] = value.mosqueName
            value.mosqueLatitude?.let { p[stringPreferencesKey("mosque_lat")] = it.toString() }
                ?: p.remove(stringPreferencesKey("mosque_lat"))
            value.mosqueLongitude?.let { p[stringPreferencesKey("mosque_lon")] = it.toString() }
                ?: p.remove(stringPreferencesKey("mosque_lon"))
            p[floatPreferencesKey("mosque_radius")] = value.mosqueRadiusMeters
            p[booleanPreferencesKey("mosque_enabled")] = value.mosqueGeofenceEnabled
        }
    }

    suspend fun updateLeases(transform: (List<QuietLease>) -> List<QuietLease>) {
        store.edit { p ->
            val now = System.currentTimeMillis()
            val current = QuietSessionPolicy.active(decodeLeases(p[leasesKey]), now)
            val updated = transform(current)
            p[leasesKey] = encodeLeases(updated)
        }
    }

    suspend fun leasesNow(): List<QuietLease> = store.data.map { decodeLeases(it[leasesKey]) }.first()

    suspend fun dndOwnership(): Pair<Boolean, Int?> = store.data.map { p ->
        (p[ownsDndKey] == true) to p[previousFilterKey]
    }.first()

    suspend fun setDndOwnership(owns: Boolean, previous: Int? = null) {
        store.edit { p ->
            p[ownsDndKey] = owns
            if (previous != null) p[previousFilterKey] = previous else p.remove(previousFilterKey)
        }
    }

    suspend fun quietGroupStartedAt(): Long? = store.data.map { it[quietGroupStartedAtKey] }.first()

    suspend fun setQuietGroupStartedAt(value: Long?) {
        store.edit { p -> if (value == null) p.remove(quietGroupStartedAtKey) else p[quietGroupStartedAtKey] = value }
    }

    suspend fun addCallEvent(event: CallEvent): Boolean {
        var inserted = false
        store.edit { p ->
            val now = System.currentTimeMillis()
            val events = CallEventPolicy.retained(decodeEvents(p[eventsKey]), now)
            val duplicate = CallEventPolicy.isDuplicate(events, event)
            if (!duplicate) {
                p[eventsKey] = encodeEvents((events + event).takeLast(100))
                inserted = true
            } else {
                p[eventsKey] = encodeEvents(events)
            }
        }
        return inserted
    }

    suspend fun clearCallEvents() = store.edit { it[eventsKey] = "[]" }

    suspend fun pruneCallEvents() {
        store.edit { p -> p[eventsKey] = encodeEvents(CallEventPolicy.retained(decodeEvents(p[eventsKey]), System.currentTimeMillis())) }
    }

    private fun encodeLeases(values: List<QuietLease>) = JSONArray().apply {
        values.forEach { put(JSONObject().put("id", it.id).put("source", it.source.name).put("start", it.startedAt).put("end", it.endsAt)) }
    }.toString()

    private fun decodeLeases(raw: String?): List<QuietLease> = runCatching {
        val array = JSONArray(raw ?: "[]")
        (0 until array.length()).mapNotNull { i ->
            val o = array.getJSONObject(i)
            QuietLease(o.getString("id"), QuietSource.valueOf(o.getString("source")), o.getLong("start"), o.getLong("end"))
        }
    }.getOrDefault(emptyList())

    private fun encodeEvents(values: List<CallEvent>) = JSONArray().apply {
        values.forEach { put(JSONObject().put("id", it.id).put("number", it.number).put("at", it.receivedAt).put("session", it.sessionId)) }
    }.toString()

    private fun decodeEvents(raw: String?): List<CallEvent> = runCatching {
        val array = JSONArray(raw ?: "[]")
        (0 until array.length()).mapNotNull { i ->
            val o = array.getJSONObject(i)
            CallEvent(o.getString("id"), o.optString("number").takeIf(String::isNotBlank), o.getLong("at"), o.getString("session"))
        }
    }.getOrDefault(emptyList())

    private fun recordKey(date: LocalDate, prayerName: String) = "$date|$prayerName"

    private fun encodePrayerRecords(values: Collection<PrayerRecord>) = JSONArray().apply {
        values.forEach { record ->
            put(JSONObject()
                .put("date", record.date.toString())
                .put("prayer", record.prayerName)
                .put("status", record.status.name)
                .put("qada", record.qadaCompleted)
                .put("marked", record.markedAtMillis))
        }
    }.toString()

    private fun decodePrayerRecords(raw: String?): List<PrayerRecord> = runCatching {
        val array = JSONArray(raw ?: "[]")
        (0 until array.length()).mapNotNull { i ->
            val item = array.getJSONObject(i)
            PrayerRecord(
                date = LocalDate.parse(item.getString("date")),
                prayerName = item.getString("prayer"),
                status = PrayerStatus.valueOf(item.getString("status")),
                qadaCompleted = item.optBoolean("qada", false),
                markedAtMillis = item.optLong("marked", 0L),
            )
        }
    }.getOrDefault(emptyList())

    private fun decodeTasbeeh(raw: String?): TasbeehProgress = runCatching {
        val item = JSONObject(raw ?: "{}")
        TasbeehProgress(item.optString("preset", "subhanallah"), item.optInt("count", 0).coerceAtLeast(0))
    }.getOrDefault(TasbeehProgress())

    companion object {
        const val RETENTION_MILLIS = CallEventPolicy.RETENTION_MILLIS
    }
}

