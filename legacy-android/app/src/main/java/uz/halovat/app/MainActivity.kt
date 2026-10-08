package uz.halovat.app

import android.Manifest
import android.app.NotificationManager
import android.app.role.RoleManager
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Spa
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.google.android.gms.location.LocationServices
import kotlinx.coroutines.launch
import uz.halovat.app.domain.PrayerPreferences
import uz.halovat.app.domain.PrayerStatus
import uz.halovat.app.domain.TasbeehProgress
import uz.halovat.app.domain.QuietSource
import uz.halovat.app.platform.geofence.MosqueGeofences
import uz.halovat.app.platform.PrayerLabels
import uz.halovat.app.platform.location.CityLocationResolver
import uz.halovat.app.platform.location.CityLocationOption
import uz.halovat.app.platform.quiet.QuietModeCoordinator
import uz.halovat.app.platform.reminders.PrayerReminderScheduler
import java.time.Duration
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

private val Evergreen = Color(0xFF145746)
private val Ink = Color(0xFF1E2B27)
private val Parchment = Color(0xFFF6F4ED)
private val Gold = Color(0xFFC59A47)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        setContent {
            HalovatRoot(
                openCalls = intent.getBooleanExtra("open_calls", false),
                openSettings = intent.getBooleanExtra("open_settings", false),
            )
        }
    }
}

@Composable
private fun HalovatRoot(openCalls: Boolean, openSettings: Boolean) {
    val vm: MainViewModel = viewModel()
    val state by vm.state.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val activity = context as ComponentActivity
    val scope = rememberCoroutineScope()
    var selectedTab by rememberSaveable { mutableIntStateOf(if (openCalls || openSettings) 4 else 0) }
    var showCalls by rememberSaveable { mutableStateOf(openCalls) }
    var rationale by remember { mutableStateOf<String?>(null) }
    var rationaleKind by remember { mutableStateOf("") }
    var callRoleGranted by remember { mutableStateOf(false) }
    var dndGranted by remember { mutableStateOf(false) }
    var contactsGranted by remember { mutableStateOf(false) }
    var notificationGranted by remember { mutableStateOf(Build.VERSION.SDK_INT < 33) }
    var locationGranted by remember { mutableStateOf(MosqueGeofences.hasForegroundLocation(context)) }
    var backgroundLocationGranted by remember { mutableStateOf(Build.VERSION.SDK_INT < 29) }
    var cityDetecting by remember { mutableStateOf(false) }
    val notificationManager = remember { context.getSystemService(NotificationManager::class.java) }

    fun detectCity(showResult: Boolean = true) {
        scope.launch {
            cityDetecting = true
            runCatching { CityLocationResolver.detect(context) }
                .onSuccess { detected ->
                    val previous = state.settings
                    if (previous.citySlug != detected.slug || previous.latitude != detected.latitude || previous.longitude != detected.longitude) {
                        vm.saveSettings(previous.copy(
                            city = detected.name,
                            citySlug = detected.slug,
                            latitude = detected.latitude,
                            longitude = detected.longitude,
                            timeZoneId = detected.timeZoneId,
                        ))
                    }
                    if (showResult) Toast.makeText(context, detected.name, Toast.LENGTH_SHORT).show()
                }
                .onFailure { error ->
                    if (showResult) Toast.makeText(context, error.message ?: context.getString(R.string.calendar_city_manual), Toast.LENGTH_LONG).show()
                }
            cityDetecting = false
        }
    }

    fun openCalendarSource() {
        if (state.settings.citySlug.isBlank()) {
            Toast.makeText(context, context.getString(R.string.calendar_city_manual), Toast.LENGTH_LONG).show()
            return
        }
        val zone = runCatching { ZoneId.of(state.settings.timeZoneId) }.getOrDefault(ZoneId.systemDefault())
        val month = java.time.Instant.ofEpochMilli(state.now).atZone(zone).monthValue
        val url = state.prayerDay.sourceUrl ?: "https://namozvaqti.uz/uz/oylik/$month/${state.settings.citySlug}"
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }

    val notificationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { notificationGranted = it }
    val locationPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        locationGranted = MosqueGeofences.hasForegroundLocation(context)
    }
    val backgroundPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {
        backgroundLocationGranted = Build.VERSION.SDK_INT < 29 || context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
    }
    val contactsPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { contactsGranted = it }
    val roleRequest = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) {
        callRoleGranted = Build.VERSION.SDK_INT >= 29 && context.getSystemService(RoleManager::class.java).isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
        if (callRoleGranted) vm.saveSettings(state.settings.copy(callSummaryEnabled = true))
    }

    LaunchedEffect(Unit) {
        dndGranted = notificationManager.isNotificationPolicyAccessGranted
        notificationGranted = Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
        contactsGranted = context.checkSelfPermission(Manifest.permission.READ_CONTACTS) == android.content.pm.PackageManager.PERMISSION_GRANTED
        callRoleGranted = Build.VERSION.SDK_INT >= 29 && context.getSystemService(RoleManager::class.java).isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
        backgroundLocationGranted = Build.VERSION.SDK_INT < 29 || context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
        vm.repository.pruneCallEvents()
        QuietModeCoordinator.reconcile(context, vm.repository)
        PrayerReminderScheduler.scheduleNext(context, vm.repository)
    }
    LaunchedEffect(locationGranted) { if (locationGranted) detectCity(showResult = false) }
    DisposableEffect(activity.lifecycle) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                vm.refreshPrayerCalendar()
                dndGranted = notificationManager.isNotificationPolicyAccessGranted
                notificationGranted = Build.VERSION.SDK_INT < 33 || context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
                contactsGranted = context.checkSelfPermission(Manifest.permission.READ_CONTACTS) == android.content.pm.PackageManager.PERMISSION_GRANTED
                locationGranted = MosqueGeofences.hasForegroundLocation(context)
                backgroundLocationGranted = Build.VERSION.SDK_INT < 29 || context.checkSelfPermission(Manifest.permission.ACCESS_BACKGROUND_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED
                callRoleGranted = Build.VERSION.SDK_INT >= 29 && context.getSystemService(RoleManager::class.java).isRoleHeld(RoleManager.ROLE_CALL_SCREENING)
            }
        }
        activity.lifecycle.addObserver(observer)
        onDispose { activity.lifecycle.removeObserver(observer) }
    }
    LaunchedEffect(state.settings, state.prayerDay.fromLocalCalendar, state.calendarRefreshing, state.prayerRecords) {
        PrayerReminderScheduler.scheduleNext(context, vm.repository)
    }

    val colors = lightColorScheme(primary = Evergreen, onPrimary = Color.White, secondary = Gold, background = Parchment, surface = Color.White, onSurface = Ink)
    MaterialTheme(colorScheme = colors) {
        Surface(modifier = Modifier.fillMaxSize(), color = Parchment) {
            Scaffold(
                containerColor = Parchment,
                bottomBar = {
                    NavigationBar(containerColor = Color.White) {
                        val tabs = listOf(
                            stringResource(R.string.tab_home) to Icons.Filled.Home,
                            stringResource(R.string.tab_prayers) to Icons.Filled.CalendarMonth,
                            stringResource(R.string.tab_tasbeeh) to Icons.Filled.Spa,
                            stringResource(R.string.tab_mosque) to Icons.Filled.LocationOn,
                            stringResource(R.string.tab_settings) to Icons.Filled.Settings,
                        )
                        tabs.forEachIndexed { index, (label, icon) ->
                            NavigationBarItem(selected = selectedTab == index, onClick = { selectedTab = index; showCalls = false }, icon = { Icon(icon, contentDescription = label) }, label = { Text(label) })
                        }
                    }
                },
            ) { padding ->
                when (selectedTab) {
                    0 -> ModernHomeScreen(state, modifier = Modifier.padding(padding), onGrantDnd = { rationaleKind = "dnd"; rationale = context.getString(R.string.permission_rationale_dnd); selectedTab = 4 }, onDurationChange = { vm.saveSettings(state.settings.copy(quietDurationMinutes = it)) }, onDetectCity = {
                        if (locationGranted) detectCity() else locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                    }, onOpenCalendarSource = { openCalendarSource() }, onStart = { minutes ->
                        scope.launch {
                            val lease = QuietModeCoordinator.start(context, vm.repository, QuietSource.MANUAL, minutes)
                            if (lease == null) { rationaleKind = "dnd"; rationale = context.getString(R.string.permission_rationale_dnd) }
                        }
                    }, onEnd = { scope.launch { QuietModeCoordinator.endManual(context, vm.repository) } }, onOpenTab = { selectedTab = it })
                    1 -> PrayerTrackerScreen(
                        records = state.prayerRecords,
                        now = state.now,
                        zone = runCatching { ZoneId.of(state.settings.timeZoneId) }.getOrDefault(ZoneId.systemDefault()),
                        onMark = { date, name, status -> vm.markPrayer(date, name, status) },
                        onClear = { date, name -> vm.clearPrayer(date, name) },
                        onCompleteQada = { date, name -> vm.completeQada(date, name) },
                        modifier = Modifier.padding(padding),
                    )
                    2 -> TasbeehScreen(state.tasbeeh, onProgressChange = { vm.saveTasbeeh(it) }, modifier = Modifier.padding(padding))
                    3 -> MosqueScreen(
                        settings = state.settings,
                        foregroundGranted = locationGranted,
                        backgroundGranted = backgroundLocationGranted,
                        onCurrentLocation = {
                            if (!locationGranted) locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                            else LocationServices.getFusedLocationProviderClient(context).lastLocation.addOnSuccessListener { location ->
                                if (location != null) vm.saveSettings(state.settings.copy(mosqueLatitude = location.latitude, mosqueLongitude = location.longitude))
                                else Toast.makeText(context, context.getString(R.string.location_not_found), Toast.LENGTH_LONG).show()
                            }
                        },
                        onSave = { updated, enabled ->
                            scope.launch {
                                vm.repository.saveSettings(updated.copy(mosqueGeofenceEnabled = enabled))
                                if (enabled) {
                                    try {
                                        MosqueGeofences.register(context, vm.repository)
                                        Toast.makeText(context, context.getString(R.string.geofence_enabled_toast), Toast.LENGTH_SHORT).show()
                                    } catch (e: Exception) {
                                        vm.repository.saveSettings(updated.copy(mosqueGeofenceEnabled = false))
                                        Toast.makeText(context, context.getString(R.string.geofence_failed_toast), Toast.LENGTH_LONG).show()
                                    }
                                } else runCatching { MosqueGeofences.remove(context) }
                            }
                        },
                        onRequestForeground = { locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION)) },
                        onRequestBackground = {
                            if (Build.VERSION.SDK_INT >= 30) context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
                            else if (Build.VERSION.SDK_INT >= 29) backgroundPermission.launch(Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                        },
                        modifier = Modifier.padding(padding),
                    )
                    else -> if (showCalls) CallsScreen(state.calls, onClear = { vm.clearCalls() }, onBack = { showCalls = false }, modifier = Modifier.padding(padding)) else SimpleSettingsScreen(
                        state = state,
                        dndGranted = dndGranted,
                        notificationsGranted = notificationGranted,
                        roleGranted = callRoleGranted,
                        onDnd = { rationaleKind = "dnd"; rationale = context.getString(R.string.permission_rationale_dnd) },
                        onNotifications = { if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS) },
                        onCallSummary = { enabled ->
                            if (!enabled) vm.saveSettings(state.settings.copy(callSummaryEnabled = false))
                            else if (Build.VERSION.SDK_INT < 29) Toast.makeText(context, context.getString(R.string.call_role_requires_android_10), Toast.LENGTH_LONG).show()
                            else {
                                rationaleKind = "calls"
                                rationale = context.getString(R.string.permission_rationale_calls)
                            }
                        },
                        onOpenCalls = { showCalls = true },
                        onDetectCity = {
                            if (locationGranted) detectCity() else locationPermission.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
                        },
                        onRefreshCalendar = { vm.refreshPrayerCalendar(force = true) },
                        onSelectCity = { city ->
                            vm.saveSettings(state.settings.copy(
                                city = city.name,
                                citySlug = city.slug,
                                latitude = city.latitude,
                                longitude = city.longitude,
                                timeZoneId = "Asia/Tashkent",
                            ))
                        },
                        onOpenCalendarSource = { openCalendarSource() },
                        onSave = { vm.saveSettings(it) },
                        cityDetecting = cityDetecting,
                        modifier = Modifier.padding(padding),
                    )
                }
            }
        }
    }

    if (rationale != null) {
        AlertDialog(
            onDismissRequest = { rationale = null },
            title = { Text(stringResource(R.string.permission_required)) },
            text = { Text(rationale!!) },
            confirmButton = {
                TextButton(onClick = {
                    val action = rationaleKind
                    rationale = null
                    when (action) {
                        "dnd" -> context.startActivity(Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS))
                        "calls" -> if (Build.VERSION.SDK_INT >= 29) {
                            val roles = context.getSystemService(RoleManager::class.java)
                            if (roles.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) roleRequest.launch(roles.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING))
                        }
                        "contacts" -> contactsPermission.launch(Manifest.permission.READ_CONTACTS)
                    }
                }) { Text(stringResource(R.string.permission_continue)) }
            },
            dismissButton = { TextButton(onClick = { rationale = null }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun HomeScreen(
    state: MainUiState,
    modifier: Modifier = Modifier,
    onGrantDnd: () -> Unit,
    onDurationChange: (Int) -> Unit,
    onDetectCity: () -> Unit,
    onOpenCalendarSource: () -> Unit,
    onStart: (Int) -> Unit,
    onEnd: () -> Unit,
) {
    val context = LocalContext.current
    val leases = state.leases
    val active = leases.isNotEmpty()
    val next = state.prayerDay.next
    val selectedDuration = state.settings.quietDurationMinutes
    val prayerZone = remember(state.settings.timeZoneId) { runCatching { ZoneId.of(state.settings.timeZoneId) }.getOrDefault(ZoneId.systemDefault()) }
    val dndGranted = context.getSystemService(NotificationManager::class.java).isNotificationPolicyAccessGranted
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(start = 18.dp, top = 22.dp, end = 18.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Column {
                    Text(stringResource(R.string.app_name), style = MaterialTheme.typography.headlineSmall, color = Evergreen, fontWeight = FontWeight.Bold)
                    Text(stringResource(R.string.app_tagline), style = MaterialTheme.typography.bodyMedium, color = Ink.copy(alpha = .68f))
                }
                Box(Modifier.size(48.dp).clip(CircleShape).background(Evergreen), contentAlignment = Alignment.Center) { Text("H", color = Gold, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleLarge) }
            }
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.LocationOn, contentDescription = null, tint = Evergreen, modifier = Modifier.size(17.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(state.settings.city, color = Ink, fontWeight = FontWeight.SemiBold)
                }
                TextButton(onClick = onDetectCity, contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)) {
                    Text(if (state.calendarRefreshing) stringResource(R.string.calendar_updating) else stringResource(R.string.detect_city), style = MaterialTheme.typography.labelMedium)
                }
            }
            Text(formatLocalizedDate("EEEE, d MMMM", state.now, context, prayerZone), color = Ink.copy(alpha = .65f), style = MaterialTheme.typography.bodySmall)
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Evergreen), shape = RoundedCornerShape(24.dp), modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(22.dp)) {
                    Text(stringResource(R.string.next_prayer), color = Color.White.copy(alpha = .75f))
                    Text(next?.let { PrayerLabels.localized(context, it.name) } ?: "—", style = MaterialTheme.typography.headlineMedium, color = Color.White, fontWeight = FontWeight.SemiBold)
                    Text(next?.let { formatTime(it.atMillis, prayerZone) } ?: "--:--", style = MaterialTheme.typography.titleLarge, color = Gold)
                    Spacer(Modifier.height(14.dp))
                    val remaining = next?.let { Duration.ofMillis((it.atMillis - state.now).coerceAtLeast(0)) }
                    Text(remaining?.let {
                        if (it.toHours() > 0) context.getString(R.string.countdown_hours, it.toHours(), it.toMinutesPart())
                        else context.getString(R.string.countdown_minutes, it.toMinutes())
                    } ?: "", color = Color.White, style = MaterialTheme.typography.titleMedium)
                }
            }
        }
        if (!dndGranted) item {
            Card(colors = CardDefaults.cardColors(containerColor = Color(0xFFFFF0D1)), shape = RoundedCornerShape(18.dp)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.quiet_access_needed), fontWeight = FontWeight.SemiBold)
                    Button(onClick = onGrantDnd) { Text(stringResource(R.string.grant_access)) }
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(10.dp).clip(CircleShape).background(if (active) Gold else Color(0xFFD4DBD7)))
                        Spacer(Modifier.width(9.dp))
                        Text(if (active) stringResource(R.string.quiet_active) else stringResource(R.string.quiet_time_hint), fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                        if (active) Text(formatRemaining(leases.minOf { it.endsAt } - state.now, context), color = Evergreen, fontWeight = FontWeight.Bold)
                    }
                    if (leases.isNotEmpty()) Text(leases.joinToString(" · ") { sourceName(it.source, context) }, color = Ink.copy(alpha = .62f), style = MaterialTheme.typography.bodySmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(20, 30, 45, 60).forEach { minutes ->
                            FilterChip(selected = selectedDuration == minutes, onClick = { onDurationChange(minutes) }, label = { Text("${minutes}m") })
                        }
                    }
                    Button(onClick = if (active) onEnd else ({ onStart(selectedDuration) }), modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) {
                        Text(if (active) stringResource(R.string.quiet_off) else stringResource(R.string.quiet_on))
                    }
                }
            }
        }
        item {
            SectionHeading(stringResource(R.string.today_prayers), state.settings.city)
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(horizontal = 18.dp)) {
                    state.prayerDay.prayers.forEachIndexed { index, prayer ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(PrayerLabels.localized(context, prayer.name), color = if (prayer.name == next?.name) Evergreen else Ink, fontWeight = if (prayer.name == next?.name) FontWeight.Bold else FontWeight.Normal)
                            Text(formatTime(prayer.atMillis, prayerZone), fontWeight = FontWeight.SemiBold)
                        }
                        if (index != state.prayerDay.prayers.lastIndex) HorizontalDivider(color = Parchment)
                    }
                }
            }
            Spacer(Modifier.height(6.dp))
            Text(
                stringResource(if (state.prayerDay.fromLocalCalendar) R.string.calendar_source_name else R.string.calendar_calculated_note),
                color = if (state.prayerDay.fromLocalCalendar) Evergreen else Ink.copy(alpha = .62f),
                style = MaterialTheme.typography.bodySmall,
                modifier = Modifier.clickable(onClick = onOpenCalendarSource),
            )
            if (state.prayerDay.fromLocalCalendar) {
                Text(stringResource(R.string.calendar_source_note), color = Ink.copy(alpha = .55f), style = MaterialTheme.typography.bodySmall)
                TextButton(onClick = onOpenCalendarSource, contentPadding = PaddingValues(horizontal = 0.dp, vertical = 0.dp)) {
                    Text(stringResource(R.string.calendar_open_source), style = MaterialTheme.typography.labelMedium)
                }
            }
        }
    }
}

@Composable
private fun MosqueScreen(
    settings: PrayerPreferences,
    foregroundGranted: Boolean,
    backgroundGranted: Boolean,
    onCurrentLocation: () -> Unit,
    onSave: (PrayerPreferences, Boolean) -> Unit,
    onRequestForeground: () -> Unit,
    onRequestBackground: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var name by remember(settings.mosqueName) { mutableStateOf(settings.mosqueName) }
    var enabled by remember(settings.mosqueGeofenceEnabled) { mutableStateOf(settings.mosqueGeofenceEnabled) }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { ScreenTitle(stringResource(R.string.mosque_title), stringResource(R.string.mosque_simple_note)) }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.mosque_quiet_switch), fontWeight = FontWeight.SemiBold)
                            Text(stringResource(if (enabled) R.string.mosque_enabled_status else R.string.mosque_disabled_status), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .58f))
                        }
                        Switch(checked = enabled, onCheckedChange = { requested ->
                            if (requested && settings.mosqueLatitude == null) {
                                Toast.makeText(context, context.getString(R.string.mosque_location_missing), Toast.LENGTH_LONG).show()
                            } else if (requested && !foregroundGranted) {
                                onRequestForeground()
                            } else if (requested && !backgroundGranted) {
                                onRequestBackground()
                            } else {
                                enabled = requested
                                onSave(settings.copy(mosqueName = name.ifBlank { "Masjid" }, mosqueRadiusMeters = 180f), requested)
                            }
                        })
                    }
                    HorizontalDivider(color = Parchment)
                    OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.mosque_name)) }, singleLine = true)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Filled.LocationOn, contentDescription = null, tint = Evergreen, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text(if (settings.mosqueLatitude == null) stringResource(R.string.mosque_location_missing) else stringResource(R.string.location_saved), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .65f), modifier = Modifier.weight(1f))
                    }
                    OutlinedButton(onClick = {
                        if (foregroundGranted) onCurrentLocation() else onRequestForeground()
                    }, modifier = Modifier.fillMaxWidth()) { Text(stringResource(R.string.mosque_set_location)) }
                    if (enabled && !backgroundGranted) TextButton(onClick = onRequestBackground) { Text(stringResource(R.string.background_location_button)) }
                    Button(onClick = {
                        if (settings.mosqueLatitude == null || settings.mosqueLongitude == null) {
                            Toast.makeText(context, context.getString(R.string.mosque_location_missing), Toast.LENGTH_LONG).show()
                            return@Button
                        }
                        onSave(settings.copy(mosqueName = name.ifBlank { "Masjid" }, mosqueRadiusMeters = 180f), enabled)
                    }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.save_mosque)) }
                }
            }
        }
    }
}

@Composable
private fun CallsScreen(calls: List<uz.halovat.app.domain.CallEvent>, onClear: () -> Unit, onBack: () -> Unit, modifier: Modifier = Modifier) {
    val context = LocalContext.current
    Column(modifier.fillMaxSize().padding(horizontal = 18.dp, vertical = 18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) {
                TextButton(onClick = onBack, contentPadding = PaddingValues(horizontal = 0.dp)) { Text("‹  ${stringResource(R.string.settings_title)}") }
                ScreenTitle(stringResource(R.string.summary_title), stringResource(R.string.call_summary_privacy_note))
            }
            if (calls.isNotEmpty()) TextButton(onClick = onClear) { Text(stringResource(R.string.clear)) }
        }
        Spacer(Modifier.height(12.dp))
        if (calls.isEmpty()) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { Text(stringResource(R.string.summary_empty), color = Ink.copy(alpha = .6f)) }
        else LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            items(calls, key = { it.id }) { event ->
                Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(18.dp), modifier = Modifier.fillMaxWidth()) {
                    Row(Modifier.fillMaxWidth().clickable(enabled = event.number != null) {
                        val intent = Intent(Intent.ACTION_DIAL, Uri.fromParts("tel", event.number, null))
                        context.startActivity(intent)
                    }.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(event.number ?: stringResource(R.string.private_caller), fontWeight = FontWeight.SemiBold)
                            Text(formatLocalizedDate("d MMM · HH:mm", event.receivedAt, context), color = Ink.copy(alpha = .62f), style = MaterialTheme.typography.bodySmall)
                        }
                        if (event.number != null) Icon(Icons.Filled.Call, contentDescription = stringResource(R.string.call_action), tint = Evergreen)
                    }
                }
            }
        }
    }
}

@Composable
private fun SettingsScreen(
    state: MainUiState,
    dndGranted: Boolean,
    notificationsGranted: Boolean,
    roleGranted: Boolean,
    contactsGranted: Boolean,
    onDnd: () -> Unit,
    onNotifications: () -> Unit,
    onCallSummary: (Boolean) -> Unit,
    onContacts: () -> Unit,
    onSave: (PrayerPreferences) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    var city by remember(state.settings.city) { mutableStateOf(state.settings.city) }
    var latitude by remember(state.settings.latitude) { mutableStateOf(state.settings.latitude.toString()) }
    var longitude by remember(state.settings.longitude) { mutableStateOf(state.settings.longitude.toString()) }
    var method by remember(state.settings.calculationMethod) { mutableStateOf(state.settings.calculationMethod) }
    var enabledReminders by remember(state.settings.enabledReminders) { mutableStateOf(state.settings.enabledReminders) }
    var hanafi by remember(state.settings.hanafi) { mutableStateOf(state.settings.hanafi) }
    var duration by remember(state.settings.quietDurationMinutes) { mutableIntStateOf(state.settings.quietDurationMinutes) }
    var showCityPicker by remember { mutableStateOf(false) }
    var fajr by remember(state.settings.fajrAdjustment) { mutableStateOf(state.settings.fajrAdjustment.toString()) }
    var dhuhr by remember(state.settings.dhuhrAdjustment) { mutableStateOf(state.settings.dhuhrAdjustment.toString()) }
    var asr by remember(state.settings.asrAdjustment) { mutableStateOf(state.settings.asrAdjustment.toString()) }
    var maghrib by remember(state.settings.maghribAdjustment) { mutableStateOf(state.settings.maghribAdjustment.toString()) }
    var isha by remember(state.settings.ishaAdjustment) { mutableStateOf(state.settings.ishaAdjustment.toString()) }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { ScreenTitle(stringResource(R.string.settings_title), stringResource(R.string.language_note)) }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    CapabilityRow(stringResource(R.string.dnd_status), dndGranted, if (dndGranted) stringResource(R.string.permission_granted) else stringResource(R.string.permission_missing), onClick = onDnd)
                    CapabilityRow(stringResource(R.string.notifications_status), notificationsGranted, if (notificationsGranted) stringResource(R.string.permission_granted) else stringResource(R.string.permission_missing), onClick = onNotifications)
                    HorizontalDivider(color = Parchment)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.call_summary_toggle), fontWeight = FontWeight.SemiBold)
                            Text(stringResource(R.string.permission_rationale_calls), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .6f))
                        }
                        Switch(checked = state.settings.callSummaryEnabled && roleGranted, onCheckedChange = onCallSummary)
                    }
                    CapabilityRow(stringResource(R.string.call_role_status), roleGranted, if (roleGranted) stringResource(R.string.permission_granted) else stringResource(R.string.permission_missing))
                    CapabilityRow(stringResource(R.string.contacts_permission), contactsGranted, if (contactsGranted) stringResource(R.string.permission_granted) else stringResource(R.string.optional), onClick = onContacts)
                    Text(stringResource(R.string.contacts_limit_note), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .6f))
                    HorizontalDivider(color = Parchment)
                    Text(stringResource(R.string.auto_reply_status), fontWeight = FontWeight.SemiBold)
                    Text(stringResource(R.string.auto_reply_disabled), style = MaterialTheme.typography.bodySmall)
                    Text(stringResource(R.string.manual_fallback), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .65f))
                    Text(stringResource(R.string.no_sms_permissions_note), style = MaterialTheme.typography.bodySmall, color = Evergreen)
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.prayer_times_settings), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    OutlinedTextField(city, { city = it }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.prayer_city)) }, singleLine = true)
                    OutlinedTextField(latitude, { latitude = it }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.latitude)) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
                    OutlinedTextField(longitude, { longitude = it }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.longitude)) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true)
                    Text(stringResource(R.string.calculation_method), fontWeight = FontWeight.Medium)
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        listOf(
                            "MUSLIM_WORLD_LEAGUE" to stringResource(R.string.calculation_method_mwl),
                            "EGYPTIAN" to stringResource(R.string.calculation_method_egypt),
                            "TURKEY" to stringResource(R.string.calculation_method_turkey),
                        ).forEach { (value, label) ->
                            FilterChip(selected = method == value, onClick = { method = value }, label = { Text(label) })
                        }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.madhab), Modifier.weight(1f))
                        FilterChip(selected = hanafi, onClick = { hanafi = true }, label = { Text(stringResource(R.string.hanafi)) })
                        Spacer(Modifier.width(6.dp))
                        FilterChip(selected = !hanafi, onClick = { hanafi = false }, label = { Text(stringResource(R.string.shafii)) })
                    }
                    Text(stringResource(R.string.local_adjustment_note), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .7f))
                    Text(stringResource(R.string.prayer_reminders_settings), fontWeight = FontWeight.Medium)
                    listOf(listOf("Bomdod", "Peshin", "Asr"), listOf("Shom", "Xufton")).forEach { row ->
                        Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                            row.forEach { prayer ->
                                FilterChip(
                                    selected = prayer in enabledReminders,
                                    onClick = { enabledReminders = if (prayer in enabledReminders) enabledReminders - prayer else enabledReminders + prayer },
                                    label = { Text(PrayerLabels.localized(context, prayer)) },
                                )
                            }
                        }
                    }
                    listOf(
                        stringResource(R.string.fajr_adjustment) to (fajr to { value: String -> fajr = value }),
                        stringResource(R.string.dhuhr_adjustment) to (dhuhr to { value: String -> dhuhr = value }),
                        stringResource(R.string.asr_adjustment) to (asr to { value: String -> asr = value }),
                        stringResource(R.string.maghrib_adjustment) to (maghrib to { value: String -> maghrib = value }),
                        stringResource(R.string.isha_adjustment) to (isha to { value: String -> isha = value }),
                    ).forEach { (label, pair) -> OutlinedTextField(pair.first, pair.second, Modifier.fillMaxWidth(), label = { Text(label) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true) }
                    Text(stringResource(R.string.quiet_duration_settings), fontWeight = FontWeight.Medium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(20, 30, 45, 60).forEach { minutes -> FilterChip(selected = duration == minutes, onClick = { duration = minutes }, label = { Text("${minutes}m") }) }
                    }
                    Button(onClick = {
                        val lat = latitude.replace(',', '.').toDoubleOrNull() ?: state.settings.latitude
                        val lon = longitude.replace(',', '.').toDoubleOrNull() ?: state.settings.longitude
                        onSave(state.settings.copy(city = city.ifBlank { "Toshkent" }, latitude = lat.coerceIn(-90.0, 90.0), longitude = lon.coerceIn(-180.0, 180.0), calculationMethod = method, hanafi = hanafi, quietDurationMinutes = duration, enabledReminders = enabledReminders, fajrAdjustment = fajr.toIntOrNull() ?: 0, dhuhrAdjustment = dhuhr.toIntOrNull() ?: 0, asrAdjustment = asr.toIntOrNull() ?: 0, maghribAdjustment = maghrib.toIntOrNull() ?: 0, ishaAdjustment = isha.toIntOrNull() ?: 0))
                    }, Modifier.fillMaxWidth()) { Text(stringResource(R.string.save_settings)) }
                    Text(stringResource(R.string.prayer_local_note), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .62f))
                    Text(stringResource(R.string.inexact_alarm_note), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .62f))
                }
            }
        }
    }
}

@Composable
private fun SimpleSettingsScreen(
    state: MainUiState,
    dndGranted: Boolean,
    notificationsGranted: Boolean,
    roleGranted: Boolean,
    onDnd: () -> Unit,
    onNotifications: () -> Unit,
    onCallSummary: (Boolean) -> Unit,
    onOpenCalls: () -> Unit,
    onDetectCity: () -> Unit,
    onSelectCity: (CityLocationOption) -> Unit,
    onRefreshCalendar: () -> Unit,
    onOpenCalendarSource: () -> Unit,
    onSave: (PrayerPreferences) -> Unit,
    cityDetecting: Boolean,
    modifier: Modifier = Modifier,
) {
    var duration by remember(state.settings.quietDurationMinutes) { mutableIntStateOf(state.settings.quietDurationMinutes) }
    var showCityPicker by remember { mutableStateOf(false) }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { ScreenTitle(stringResource(R.string.settings_title), stringResource(R.string.settings_summary)) }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(stringResource(R.string.prayer_times_settings), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(state.settings.city, fontWeight = FontWeight.SemiBold)
                    Text(
                        stringResource(if (state.prayerDay.fromLocalCalendar) R.string.calendar_source_name else R.string.calendar_calculated_note),
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = .58f),
                    )
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        TextButton(onClick = onDetectCity, enabled = !cityDetecting) {
                            Text(if (cityDetecting) stringResource(R.string.city_detecting) else stringResource(R.string.detect_city))
                        }
                        TextButton(onClick = { showCityPicker = true }) { Text(stringResource(R.string.choose_city)) }
                    }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        TextButton(onClick = onRefreshCalendar, enabled = !state.calendarRefreshing) {
                            Text(if (state.calendarRefreshing) stringResource(R.string.calendar_updating) else stringResource(R.string.calendar_refresh))
                        }
                        TextButton(onClick = onOpenCalendarSource) { Text(stringResource(R.string.calendar_source_short)) }
                    }
                    if (state.prayerDay.fromLocalCalendar) Text(stringResource(R.string.calendar_source_note), color = Ink.copy(alpha = .56f), style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        item {
            Card(colors = CardDefaults.cardColors(containerColor = Color.White), shape = RoundedCornerShape(22.dp)) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(stringResource(R.string.settings_phone_section), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.prayer_reminder_toggle), Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                        Switch(checked = state.settings.enabledReminders.isNotEmpty(), onCheckedChange = { checked ->
                            onSave(state.settings.copy(enabledReminders = if (checked) setOf("Bomdod", "Peshin", "Asr", "Shom", "Xufton") else emptySet()))
                        })
                    }
                    HorizontalDivider(color = Parchment)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.notifications_status), fontWeight = FontWeight.SemiBold)
                            Text(stringResource(R.string.notification_simple_note), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .58f))
                        }
                        TextButton(onClick = onNotifications) {
                            Text(if (notificationsGranted) stringResource(R.string.permission_granted) else stringResource(R.string.permission_missing))
                        }
                    }
                    HorizontalDivider(color = Parchment)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(stringResource(R.string.call_summary_toggle), fontWeight = FontWeight.SemiBold)
                            Text(stringResource(R.string.call_summary_simple_note), style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .58f))
                        }
                        Switch(checked = state.settings.callSummaryEnabled && roleGranted, onCheckedChange = onCallSummary)
                    }
                    TextButton(onClick = onOpenCalls, contentPadding = PaddingValues(horizontal = 0.dp)) { Text(stringResource(R.string.calls_history)) }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(stringResource(R.string.dnd_status), Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                        TextButton(onClick = onDnd) {
                            Text(if (dndGranted) stringResource(R.string.permission_granted) else stringResource(R.string.permission_missing))
                        }
                    }
                    HorizontalDivider(color = Parchment)
                    Text(stringResource(R.string.quiet_duration_settings), fontWeight = FontWeight.Medium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(20, 30, 45, 60).forEach { minutes ->
                            FilterChip(selected = duration == minutes, onClick = {
                                duration = minutes
                                onSave(state.settings.copy(quietDurationMinutes = minutes))
                            }, label = { Text("${minutes}m") })
                        }
                    }
                }
            }
        }
    }
    if (showCityPicker) {
        AlertDialog(
            onDismissRequest = { showCityPicker = false },
            title = { Text(stringResource(R.string.choose_city_title)) },
            text = {
                LazyColumn(Modifier.heightIn(max = 420.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    items(CityLocationResolver.cityOptions, key = { it.slug }) { city ->
                        TextButton(onClick = {
                            onSelectCity(city)
                            showCityPicker = false
                        }, modifier = Modifier.fillMaxWidth()) { Text(city.name, modifier = Modifier.fillMaxWidth()) }
                    }
                }
            },
            confirmButton = { TextButton(onClick = { showCityPicker = false }) { Text(stringResource(R.string.cancel)) } },
        )
    }
}

@Composable
private fun ScreenTitle(title: String, subtitle: String) {
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Text(title, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold, color = Evergreen)
        Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = Ink.copy(alpha = .67f))
    }
}

@Composable
private fun SectionHeading(title: String, subtitle: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = Ink)
        Text(subtitle, style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = .62f))
    }
}

@Composable
private fun CapabilityRow(label: String, granted: Boolean, status: String, onClick: (() -> Unit)? = null) {
    Row(Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable { onClick() } else Modifier).padding(vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(9.dp).clip(CircleShape).background(if (granted) Evergreen else Gold))
        Spacer(Modifier.width(9.dp))
        Text(label, Modifier.weight(1f), fontWeight = FontWeight.Medium)
        Text(status, color = if (granted) Evergreen else Ink.copy(alpha = .62f), style = MaterialTheme.typography.bodySmall)
    }
}

private fun permissionText(granted: Boolean, context: android.content.Context) = context.getString(if (granted) R.string.permission_status_granted_short else R.string.permission_status_missing_short)
private fun formatLocalizedDate(pattern: String, millis: Long, context: android.content.Context, zone: ZoneId = ZoneId.systemDefault()): String {
    val language = context.resources.configuration.locales.get(0)?.language
    val locale = if (language == "ru") Locale.forLanguageTag("ru-RU") else Locale.forLanguageTag("uz-UZ")
    return DateTimeFormatter.ofPattern(pattern, locale).format(Instant.ofEpochMilli(millis).atZone(zone))
}
private fun formatTime(millis: Long, zone: ZoneId = ZoneId.systemDefault()) = DateTimeFormatter.ofPattern("HH:mm").format(Instant.ofEpochMilli(millis).atZone(zone))
private fun formatRemaining(millis: Long, context: android.content.Context): String {
    val duration = Duration.ofMillis(millis.coerceAtLeast(0))
    return if (duration.toHours() > 0) context.getString(R.string.countdown_hours, duration.toHours(), duration.toMinutesPart())
    else context.getString(R.string.countdown_minutes, duration.toMinutes())
}
private fun sourceName(source: QuietSource, context: android.content.Context) = context.getString(when (source) {
    QuietSource.MANUAL -> R.string.source_manual
    QuietSource.PRAYER -> R.string.source_prayer
    QuietSource.MOSQUE -> R.string.source_mosque
})
