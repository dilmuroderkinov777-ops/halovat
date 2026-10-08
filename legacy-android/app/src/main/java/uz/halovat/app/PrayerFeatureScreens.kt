package uz.halovat.app

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.SelfImprovement
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uz.halovat.app.domain.PrayerRecord
import uz.halovat.app.domain.PrayerStatus
import uz.halovat.app.domain.PrayerTime
import uz.halovat.app.domain.TasbeehProgress
import uz.halovat.app.platform.PrayerLabels
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.temporal.TemporalAdjusters
import java.util.Locale

private val FeatureGreen = Color(0xFF086C49)
private val FeatureDeepGreen = Color(0xFF07563C)
private val FeatureMint = Color(0xFFE5F6EC)
private val FeatureGold = Color(0xFFE2B653)
private val FeatureInk = Color(0xFF1C2B25)
private val FeatureMuted = Color(0xFF78847D)
private val FeatureRed = Color(0xFFE74752)
private val FeatureLine = Color(0xFFE8EDE8)

@Composable
fun ModernHomeScreen(
    state: MainUiState,
    modifier: Modifier = Modifier,
    onGrantDnd: () -> Unit,
    onDurationChange: (Int) -> Unit,
    onDetectCity: () -> Unit,
    onOpenCalendarSource: () -> Unit,
    onStart: (Int) -> Unit,
    onEnd: () -> Unit,
    onOpenTab: (Int) -> Unit,
) {
    val context = LocalContext.current
    val prayerZone = remember(state.settings.timeZoneId) { runCatching { ZoneId.of(state.settings.timeZoneId) }.getOrDefault(ZoneId.systemDefault()) }
    val next = state.prayerDay.next
    val localToday = remember(state.now, prayerZone) { Instant.ofEpochMilli(state.now).atZone(prayerZone).toLocalDate() }
    val nextIsTomorrow = next?.let { Instant.ofEpochMilli(it.atMillis).atZone(prayerZone).toLocalDate().isAfter(localToday) } == true
    val dndGranted = context.getSystemService(android.app.NotificationManager::class.java).isNotificationPolicyAccessGranted
    val active = state.leases.isNotEmpty()
    LazyColumn(
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 18.dp, top = 20.dp, end = 18.dp, bottom = 26.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(stringResource(R.string.greeting), style = MaterialTheme.typography.bodyMedium, color = FeatureMuted)
                    Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold, color = FeatureDeepGreen)
                }
                TextButton(onClick = onDetectCity, shape = CircleShape) {
                    Icon(Icons.Filled.LocationOn, contentDescription = null, tint = FeatureGreen, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(state.settings.city, color = FeatureInk, fontWeight = FontWeight.SemiBold)
                }
            }
            Text(formatFeatureDate("EEEE, d MMMM", state.now, context, prayerZone), color = FeatureMuted, style = MaterialTheme.typography.bodyMedium)
        }
        item {
            Card(shape = RoundedCornerShape(28.dp), colors = CardDefaults.cardColors(containerColor = FeatureDeepGreen), modifier = Modifier.fillMaxWidth()) {
                Box(Modifier.background(Brush.linearGradient(listOf(Color(0xFF0C8154), FeatureDeepGreen, Color(0xFF064B36))))) {
                    Column(Modifier.fillMaxWidth().padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Column {
                                Text(
                                    if (nextIsTomorrow) "${stringResource(R.string.next_prayer)} · ${stringResource(R.string.tomorrow)}" else stringResource(R.string.next_prayer),
                                    color = Color.White.copy(alpha = .75f),
                                    style = MaterialTheme.typography.bodyMedium,
                                )
                                Text(next?.let { PrayerLabels.localized(context, it.name) } ?: "—", color = Color.White, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                            }
                            Icon(Icons.Filled.NotificationsActive, contentDescription = null, tint = Color(0xFF8FE6AF), modifier = Modifier.size(32.dp))
                        }
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                            Text(next?.let { featureTime(it.atMillis, prayerZone) } ?: "--:--", color = FeatureGold, fontSize = 42.sp, fontWeight = FontWeight.Bold, lineHeight = 46.sp)
                            Text(next?.let { featureRemaining(it.atMillis - state.now, context) } ?: "", color = Color.White, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(bottom = 8.dp))
                        }
                        Text(state.settings.city + " · " + stringResource(R.string.local_prayer_times), color = Color.White.copy(alpha = .76f), style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
        item {
            Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                state.prayerDay.prayers.filter { it.name != "Quyosh" }.forEach { prayer ->
                    PrayerTimePill(prayer, prayer == next, prayerZone)
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                QuickAction(R.string.quick_prayers, Icons.Filled.CalendarMonth, Modifier.weight(1f)) { onOpenTab(1) }
                QuickAction(R.string.quick_tasbeeh, Icons.Filled.Spa, Modifier.weight(1f)) { onOpenTab(2) }
                QuickAction(R.string.quick_mosque, Icons.Filled.LocationOn, Modifier.weight(1f)) { onOpenTab(3) }
            }
        }
        if (!dndGranted) item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF2D7)), shape = RoundedCornerShape(20.dp)) {
                Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Filled.NotificationsActive, contentDescription = null, tint = FeatureGreen, modifier = Modifier.size(22.dp))
                    Text(stringResource(R.string.quiet_access_needed), fontWeight = FontWeight.Medium, color = FeatureInk, style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                    TextButton(onClick = onGrantDnd, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)) { Text(stringResource(R.string.grant_access_short)) }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(10.dp).clip(CircleShape).background(if (active) FeatureGreen else Color(0xFFD5DDD8)))
                        Spacer(Modifier.width(9.dp))
                        Text(if (active) stringResource(R.string.quiet_active) else stringResource(R.string.quiet_time_hint), fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        if (active) Text(formatFeatureRemaining(state.leases.minOf { it.endsAt } - state.now, context), color = FeatureGreen, fontWeight = FontWeight.Bold)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        listOf(20, 30, 45, 60).forEach { minutes ->
                            FilterChip(selected = state.settings.quietDurationMinutes == minutes, onClick = { onDurationChange(minutes) }, label = { Text("${minutes}m") })
                        }
                    }
                    Button(onClick = if (active) onEnd else ({ onStart(state.settings.quietDurationMinutes) }), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp)) {
                        Text(if (active) stringResource(R.string.quiet_off) else stringResource(R.string.quiet_on))
                    }
                }
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.today_prayers), style = MaterialTheme.typography.titleLarge, color = FeatureInk, fontWeight = FontWeight.Bold)
                Text(state.settings.city, color = FeatureMuted, style = MaterialTheme.typography.bodySmall)
            }
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(horizontal = 18.dp)) {
                    state.prayerDay.prayers.forEachIndexed { index, prayer ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text(PrayerLabels.localized(context, prayer.name), color = if (prayer.name == next?.name) FeatureGreen else FeatureInk, fontWeight = if (prayer.name == next?.name) FontWeight.Bold else FontWeight.Normal)
                            Text(featureTime(prayer.atMillis, prayerZone), fontWeight = FontWeight.SemiBold, color = FeatureInk)
                        }
                        if (index != state.prayerDay.prayers.lastIndex) androidx.compose.material3.HorizontalDivider(color = FeatureLine)
                    }
                }
            }
            Spacer(Modifier.height(4.dp))
            Text(stringResource(if (state.prayerDay.fromLocalCalendar) R.string.calendar_source_name else R.string.calendar_calculated_note), color = FeatureGreen, style = MaterialTheme.typography.bodySmall, modifier = Modifier.clickable(onClick = onOpenCalendarSource))
        }
    }
}

@Composable
private fun PrayerTimePill(prayer: PrayerTime, selected: Boolean, zone: ZoneId) {
    val context = LocalContext.current
    Column(
        Modifier.width(60.dp).clip(RoundedCornerShape(17.dp)).background(if (selected) FeatureMint else Color.White).padding(horizontal = 4.dp, vertical = 12.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(PrayerLabels.localized(context, prayer.name), style = MaterialTheme.typography.labelSmall, color = if (selected) FeatureGreen else FeatureMuted, maxLines = 1)
        Text(featureTime(prayer.atMillis, zone), style = MaterialTheme.typography.titleSmall, color = FeatureInk, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun QuickAction(label: Int, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(modifier.clip(RoundedCornerShape(19.dp)).background(Color.White).clickable(onClick = onClick).padding(vertical = 15.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Icon(icon, contentDescription = null, tint = FeatureGreen, modifier = Modifier.size(23.dp))
        Text(stringResource(label), color = FeatureGreen, style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, textAlign = TextAlign.Center)
    }
}

private enum class TrackingPeriod { WEEK, MONTH, YEAR }

@Composable
fun PrayerTrackerScreen(
    records: List<PrayerRecord>,
    now: Long,
    zone: ZoneId,
    onMark: (LocalDate, String, PrayerStatus) -> Unit,
    onClear: (LocalDate, String) -> Unit,
    onCompleteQada: (LocalDate, String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val today = remember(now, zone) { Instant.ofEpochMilli(now).atZone(zone).toLocalDate() }
    val context = LocalContext.current
    var period by rememberSaveable { mutableStateOf(TrackingPeriod.WEEK.name) }
    var anchorText by rememberSaveable { mutableStateOf(today.toString()) }
    val anchor = remember(anchorText) { runCatching { LocalDate.parse(anchorText) }.getOrDefault(today) }
    val selectedPeriod = runCatching { TrackingPeriod.valueOf(period) }.getOrDefault(TrackingPeriod.WEEK)
    val recordsByKey = remember(records) { records.associateBy { recordKey(it.date, it.prayerName) } }
    val bounds = periodBounds(selectedPeriod, anchor)
    val periodRecords = records.filter { it.date >= bounds.first && it.date <= bounds.second }
    val prayed = periodRecords.count { it.status == PrayerStatus.PRAYED }
    val missed = periodRecords.count { it.status == PrayerStatus.MISSED }
    val qadaPending = records.filter { it.status == PrayerStatus.MISSED && !it.qadaCompleted }.sortedBy { it.date }
    val totalPrayers = when (selectedPeriod) {
        TrackingPeriod.WEEK -> 35
        TrackingPeriod.MONTH -> YearMonth.from(anchor).lengthOfMonth() * 5
        TrackingPeriod.YEAR -> if (anchor.isLeapYear) 366 * 5 else 365 * 5
    }
    val chartData = when (selectedPeriod) {
        TrackingPeriod.WEEK -> {
            val start = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            (0..6).map { offset ->
                val date = start.plusDays(offset.toLong())
                ChartDatum(formatFeatureDate("EE", date, context), records.count { it.date == date && it.status == PrayerStatus.PRAYED } / 5f)
            }
        }
        TrackingPeriod.MONTH -> {
            val month = YearMonth.from(anchor)
            (1..month.lengthOfMonth()).map { day ->
                val date = month.atDay(day)
                ChartDatum(day.toString(), records.count { it.date == date && it.status == PrayerStatus.PRAYED } / 5f)
            }
        }
        TrackingPeriod.YEAR -> (1..12).map { month ->
            val ym = YearMonth.of(anchor.year, month)
            val done = records.count { YearMonth.from(it.date) == ym && it.status == PrayerStatus.PRAYED }
            ChartDatum(formatFeatureDate("MMM", ym.atDay(1), context), done / (ym.lengthOfMonth() * 5f))
        }
    }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            FeatureScreenTitle(stringResource(R.string.tracker_title), stringResource(R.string.tracker_subtitle))
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = FeatureDeepGreen), shape = RoundedCornerShape(24.dp)) {
                Row(Modifier.fillMaxWidth().padding(18.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text(stringResource(R.string.tracker_prayed), color = Color.White.copy(alpha = .75f), style = MaterialTheme.typography.bodySmall)
                        Text("$prayed / $totalPrayers", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(stringResource(R.string.tracker_missed), color = Color.White.copy(alpha = .75f), style = MaterialTheme.typography.bodySmall)
                        Text("$missed", color = Color(0xFFFF8791), style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(stringResource(R.string.tracker_qada_pending), color = Color.White.copy(alpha = .75f), style = MaterialTheme.typography.bodySmall)
                        Text("${qadaPending.size}", color = FeatureGold, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.fillMaxWidth()) {
                listOf(
                    TrackingPeriod.WEEK to stringResource(R.string.period_week),
                    TrackingPeriod.MONTH to stringResource(R.string.period_month),
                    TrackingPeriod.YEAR to stringResource(R.string.period_year),
                ).forEach { (value, label) ->
                    FilterChip(selected = selectedPeriod == value, onClick = { period = value.name }, label = { Text(label) }, modifier = Modifier.weight(1f))
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Text(periodTitle(selectedPeriod, anchor, context), fontWeight = FontWeight.Bold, color = FeatureInk)
                        Row {
                            TextButton(onClick = { anchorText = moveAnchor(selectedPeriod, anchor, -1).toString() }) { Text("‹", fontSize = 23.sp) }
                            TextButton(onClick = { anchorText = moveAnchor(selectedPeriod, anchor, 1).coerceAtMost(today).toString() }, enabled = bounds.first < periodBounds(selectedPeriod, today).first) { Text("›", fontSize = 23.sp) }
                        }
                    }
                    Text(stringResource(R.string.tracker_chart_caption), color = FeatureMuted, style = MaterialTheme.typography.bodySmall)
                    CompletionChart(chartData)
                }
            }
        }
        when (selectedPeriod) {
            TrackingPeriod.WEEK -> item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                    Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(stringResource(R.string.tracker_week_grid), fontWeight = FontWeight.Bold)
                        WeekPrayerGrid(anchor, today, recordsByKey, onMark, onClear)
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.horizontalScroll(rememberScrollState())) {
                            LegendDot(FeatureGreen, stringResource(R.string.status_prayed))
                            LegendDot(FeatureRed, stringResource(R.string.status_missed))
                            LegendDot(Color(0xFFD5DDE0), stringResource(R.string.status_unmarked))
                        }
                        Text(stringResource(R.string.tracker_tap_hint), color = FeatureMuted, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
            TrackingPeriod.MONTH -> item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(stringResource(R.string.tracker_days), fontWeight = FontWeight.Bold)
                        val month = YearMonth.from(anchor)
                        (1..month.lengthOfMonth()).forEach { day ->
                            val date = month.atDay(day)
                            DaySummaryRow(date, today, recordsByKey, onMark, onClear)
                        }
                    }
                }
            }
            TrackingPeriod.YEAR -> item {
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                    Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(stringResource(R.string.tracker_months), fontWeight = FontWeight.Bold)
                        (1..12).forEach { month ->
                            val ym = YearMonth.of(anchor.year, month)
                            val done = records.count { YearMonth.from(it.date) == ym && it.status == PrayerStatus.PRAYED }
                            val missedMonth = records.count { YearMonth.from(it.date) == ym && it.status == PrayerStatus.MISSED }
                            Row(Modifier.fillMaxWidth().padding(vertical = 7.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                                Text(formatFeatureDate("MMMM", ym.atDay(1), context), modifier = Modifier.weight(1f), color = FeatureInk)
                                Text(stringResource(R.string.tracker_done_count, done), color = FeatureGreen, style = MaterialTheme.typography.bodySmall)
                                Spacer(Modifier.width(10.dp))
                                Text("× $missedMonth", color = FeatureRed, style = MaterialTheme.typography.bodySmall)
                            }
                        }
                    }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.tracker_qada_title), fontWeight = FontWeight.Bold)
                            Text(stringResource(R.string.tracker_qada_explainer), style = MaterialTheme.typography.bodySmall, color = FeatureMuted)
                        }
                        Text(qadaPending.size.toString(), color = FeatureRed, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    }
                    if (qadaPending.isEmpty()) Text(stringResource(R.string.tracker_qada_empty), color = FeatureMuted, style = MaterialTheme.typography.bodyMedium)
                    else qadaPending.take(8).forEach { record ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Text(PrayerLabels.localized(LocalContext.current, record.prayerName), color = FeatureInk, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                            Text(formatFeatureDate("d MMM", record.date, LocalContext.current), color = FeatureMuted, style = MaterialTheme.typography.bodySmall)
                            TextButton(onClick = { onCompleteQada(record.date, record.prayerName) }) { Text(stringResource(R.string.tracker_qada_done), color = FeatureGreen) }
                        }
                    }
                    if (qadaPending.size > 8) Text(stringResource(R.string.tracker_qada_more, qadaPending.size - 8), color = FeatureMuted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun WeekPrayerGrid(
    anchor: LocalDate,
    today: LocalDate,
    records: Map<String, PrayerRecord>,
    onMark: (LocalDate, String, PrayerStatus) -> Unit,
    onClear: (LocalDate, String) -> Unit,
) {
    val start = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
    val names = listOf("Bomdod", "Peshin", "Asr", "Shom", "Xufton")
    Row(Modifier.horizontalScroll(rememberScrollState())) {
        Column(Modifier.width(61.dp)) {
            Spacer(Modifier.height(36.dp))
            names.forEach { name ->
                Box(Modifier.height(40.dp), contentAlignment = Alignment.CenterStart) {
                    Text(PrayerLabels.localized(LocalContext.current, name), style = MaterialTheme.typography.labelSmall, color = FeatureInk, maxLines = 1)
                }
            }
        }
        (0..6).forEach { offset ->
            val date = start.plusDays(offset.toLong())
            Column(Modifier.width(38.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Column(Modifier.height(36.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Text(formatFeatureDate("EE", date, LocalContext.current).take(2), style = MaterialTheme.typography.labelSmall, color = if (date == today) FeatureGreen else FeatureMuted)
                    Text(date.dayOfMonth.toString(), style = MaterialTheme.typography.labelMedium, color = FeatureInk, fontWeight = if (date == today) FontWeight.Bold else FontWeight.Normal)
                }
                names.forEach { name ->
                    val record = records[recordKey(date, name)]
                    PrayerStatusCell(record, enabled = !date.isAfter(today)) {
                        when (record?.status) {
                            null -> onMark(date, name, PrayerStatus.PRAYED)
                            PrayerStatus.PRAYED -> onMark(date, name, PrayerStatus.MISSED)
                            PrayerStatus.MISSED -> onClear(date, name)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DaySummaryRow(
    date: LocalDate,
    today: LocalDate,
    records: Map<String, PrayerRecord>,
    onMark: (LocalDate, String, PrayerStatus) -> Unit,
    onClear: (LocalDate, String) -> Unit,
) {
    val names = listOf("Bomdod", "Peshin", "Asr", "Shom", "Xufton")
    val dateRecords = names.map { records[recordKey(date, it)] }
    val done = dateRecords.count { it?.status == PrayerStatus.PRAYED }
    Row(Modifier.fillMaxWidth().padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.width(66.dp)) {
            Text(formatFeatureDate("EE", date, LocalContext.current), color = FeatureMuted, style = MaterialTheme.typography.labelSmall)
            Text(date.dayOfMonth.toString(), color = FeatureInk, fontWeight = if (date == today) FontWeight.Bold else FontWeight.Medium)
        }
        Row(Modifier.weight(1f), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
            names.forEachIndexed { index, name ->
                PrayerStatusCell(dateRecords[index], enabled = !date.isAfter(today), compact = true) {
                    when (dateRecords[index]?.status) {
                        null -> onMark(date, name, PrayerStatus.PRAYED)
                        PrayerStatus.PRAYED -> onMark(date, name, PrayerStatus.MISSED)
                        PrayerStatus.MISSED -> onClear(date, name)
                    }
                }
            }
        }
        Text("$done/5", color = FeatureGreen, style = MaterialTheme.typography.labelSmall, modifier = Modifier.width(34.dp), textAlign = TextAlign.End)
    }
}

@Composable
private fun PrayerStatusCell(record: PrayerRecord?, enabled: Boolean, compact: Boolean = false, onClick: () -> Unit) {
    val background = when (record?.status) {
        PrayerStatus.PRAYED -> FeatureGreen
        PrayerStatus.MISSED -> FeatureRed
        null -> Color(0xFFE6EAEC)
    }
    val icon = when (record?.status) {
        PrayerStatus.PRAYED -> Icons.Filled.Check
        PrayerStatus.MISSED -> Icons.Filled.Close
        null -> Icons.Filled.Remove
    }
    Box(
        Modifier.size(if (compact) 27.dp else 30.dp).clip(CircleShape).background(background)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = null, tint = if (record == null) Color(0xFF9AA4A8) else Color.White, modifier = Modifier.size(if (compact) 15.dp else 17.dp))
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Box(Modifier.size(9.dp).clip(CircleShape).background(color))
        Text(label, color = FeatureMuted, style = MaterialTheme.typography.labelSmall)
    }
}

private data class ChartDatum(val label: String, val ratio: Float)

@Composable
private fun CompletionChart(data: List<ChartDatum>) {
    Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
        if (data.all { it.ratio == 0f }) {
            Box(Modifier.fillMaxWidth().height(104.dp), contentAlignment = Alignment.Center) {
                Text(stringResource(R.string.tracker_chart_empty), color = FeatureMuted, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center)
            }
        } else {
            Canvas(Modifier.fillMaxWidth().height(104.dp)) {
                val spacing = 3.dp.toPx()
                val barWidth = ((size.width - spacing * (data.size - 1)) / data.size).coerceAtLeast(2.dp.toPx())
                val base = size.height - 2.dp.toPx()
                data.forEachIndexed { index, datum ->
                    val height = (base * datum.ratio.coerceIn(0f, 1f)).coerceAtLeast(3.dp.toPx())
                    val left = index * (barWidth + spacing)
                    drawRoundRect(Color(0xFFE9F0EB), topLeft = androidx.compose.ui.geometry.Offset(left, 0f), size = androidx.compose.ui.geometry.Size(barWidth, base), cornerRadius = androidx.compose.ui.geometry.CornerRadius(barWidth / 2))
                    if (datum.ratio > 0f) drawRoundRect(FeatureGreen, topLeft = androidx.compose.ui.geometry.Offset(left, base - height), size = androidx.compose.ui.geometry.Size(barWidth, height), cornerRadius = androidx.compose.ui.geometry.CornerRadius(barWidth / 2))
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            data.forEachIndexed { index, datum ->
                val show = data.size <= 12 || index == 0 || index == data.lastIndex || index % 5 == 4
                Text(if (show) datum.label else "", color = FeatureMuted, style = MaterialTheme.typography.labelSmall, maxLines = 1)
            }
        }
    }
}

@Composable
fun TasbeehScreen(progress: TasbeehProgress, onProgressChange: (TasbeehProgress) -> Unit, modifier: Modifier = Modifier) {
    val presets = listOf(
        Triple("subhanallah", R.string.tasbeeh_subhanallah, 33),
        Triple("alhamdulillah", R.string.tasbeeh_alhamdulillah, 33),
        Triple("allahuakbar", R.string.tasbeeh_allahuakbar, 34),
        Triple("astaghfirullah", R.string.tasbeeh_astaghfirullah, 100),
    )
    val preset = presets.firstOrNull { it.first == progress.presetId } ?: presets.first()
    var count by rememberSaveable(progress.presetId) { mutableIntStateOf(progress.count) }
    val haptics = LocalHapticFeedback.current
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(18.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        item {
            FeatureScreenTitle(stringResource(R.string.tasbeeh_title), stringResource(R.string.tasbeeh_subtitle))
        }
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(stringResource(preset.second), style = MaterialTheme.typography.titleLarge, color = FeatureDeepGreen, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
                Text(stringResource(R.string.tasbeeh_target, preset.third), color = FeatureMuted, style = MaterialTheme.typography.bodyMedium)
            }
        }
        item {
            Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(vertical = 7.dp)) {
                Canvas(Modifier.size(278.dp).clip(CircleShape).clickable {
                    count += 1
                    onProgressChange(progress.copy(count = count))
                    haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                }) {
                    val stroke = 11.dp.toPx()
                    drawCircle(color = Color(0xFFDCE8DF), style = Stroke(stroke))
                    drawArc(color = FeatureGreen, startAngle = -90f, sweepAngle = 360f * (count.toFloat() / preset.third).coerceIn(0f, 1f), useCenter = false, style = Stroke(stroke, cap = StrokeCap.Round))
                    drawCircle(color = FeatureDeepGreen, radius = size.minDimension * .40f)
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.clickable {
                    count += 1
                    onProgressChange(progress.copy(count = count))
                    haptics.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                }.padding(30.dp)) {
                    Text(count.toString(), color = Color.White, fontSize = 54.sp, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.tasbeeh_count), color = Color.White.copy(alpha = .8f))
                    Spacer(Modifier.height(8.dp))
                    Icon(Icons.Filled.SelfImprovement, contentDescription = null, tint = FeatureGold, modifier = Modifier.size(27.dp))
                }
            }
        }
        item {
            Text(if (count >= preset.third) stringResource(R.string.tasbeeh_cycle_done) else stringResource(R.string.tasbeeh_progress, count, preset.third), color = FeatureGreen, fontWeight = FontWeight.SemiBold)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.tasbeeh_choose), fontWeight = FontWeight.Bold)
                    presets.forEach { item ->
                        Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp)).background(if (item.first == preset.first) FeatureMint else Color.Transparent).clickable {
                            count = if (item.first == preset.first) count else 0
                            onProgressChange(TasbeehProgress(item.first, count))
                        }.padding(horizontal = 12.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Filled.Spa, contentDescription = null, tint = FeatureGreen, modifier = Modifier.size(20.dp))
                            Spacer(Modifier.width(10.dp))
                            Text(stringResource(item.second), Modifier.weight(1f), color = FeatureInk, fontWeight = FontWeight.Medium)
                            Text("${item.third}", color = FeatureMuted, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            }
        }
        item {
            OutlinedButton(onClick = { count = 0; onProgressChange(progress.copy(count = 0)) }, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.tasbeeh_reset))
            }
        }
    }
}

@Composable
private fun FeatureScreenTitle(title: String, subtitle: String) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = FeatureDeepGreen)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = FeatureMuted)
    }
}

private fun periodBounds(period: TrackingPeriod, anchor: LocalDate): Pair<LocalDate, LocalDate> = when (period) {
    TrackingPeriod.WEEK -> anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)) to anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).plusDays(6)
    TrackingPeriod.MONTH -> YearMonth.from(anchor).atDay(1) to YearMonth.from(anchor).atEndOfMonth()
    TrackingPeriod.YEAR -> LocalDate.of(anchor.year, 1, 1) to LocalDate.of(anchor.year, 12, 31)
}

private fun moveAnchor(period: TrackingPeriod, anchor: LocalDate, delta: Long): LocalDate = when (period) {
    TrackingPeriod.WEEK -> anchor.plusWeeks(delta)
    TrackingPeriod.MONTH -> anchor.plusMonths(delta)
    TrackingPeriod.YEAR -> anchor.plusYears(delta)
}

private fun periodTitle(period: TrackingPeriod, anchor: LocalDate, context: android.content.Context): String = when (period) {
    TrackingPeriod.WEEK -> {
        val start = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
        val end = start.plusDays(6)
        "${formatFeatureDate("d MMM", start, context)} – ${formatFeatureDate("d MMM", end, context)}"
    }
    TrackingPeriod.MONTH -> formatFeatureDate("MMMM yyyy", anchor, context)
    TrackingPeriod.YEAR -> anchor.year.toString()
}

private fun recordKey(date: LocalDate, prayer: String) = "$date|$prayer"

private fun formatFeatureDate(pattern: String, date: LocalDate, context: android.content.Context): String {
    val language = context.resources.configuration.locales.get(0)?.language
    val locale = if (language == "ru") Locale.forLanguageTag("ru-RU") else Locale.forLanguageTag("uz-UZ")
    return DateTimeFormatter.ofPattern(pattern, locale).format(date)
}

private fun formatFeatureDate(pattern: String, millis: Long, context: android.content.Context, zone: ZoneId): String =
    formatFeatureDate(pattern, Instant.ofEpochMilli(millis).atZone(zone).toLocalDate(), context)

private fun featureTime(millis: Long, zone: ZoneId) = DateTimeFormatter.ofPattern("HH:mm").format(Instant.ofEpochMilli(millis).atZone(zone))

private fun featureRemaining(millis: Long, context: android.content.Context): String {
    val d = java.time.Duration.ofMillis(millis.coerceAtLeast(0))
    return if (d.toHours() > 0) context.getString(R.string.countdown_hours, d.toHours(), d.toMinutesPart()) else context.getString(R.string.countdown_minutes, d.toMinutes())
}

private fun formatFeatureRemaining(millis: Long, context: android.content.Context): String = featureRemaining(millis, context)
