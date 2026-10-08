package uz.halovat.focus

import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.app.NotificationChannel
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.media.RingtoneManager
import android.media.AudioAttributes
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.os.PowerManager
import android.view.Gravity
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.widget.Button
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.notifications.model.NotificationRequest
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.delegates.ExpoSchedulingDelegate
import expo.modules.notifications.service.interfaces.PresentationDelegate
import expo.modules.notifications.service.interfaces.SchedulingDelegate
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import kotlin.math.ceil

private const val CLOSE_ACTION = "uz.halovat.focus.REMINDER_CLOSED"
private const val REMINDER_ID = 0 // Keep Expo's tag + ID so its response and dismiss APIs still work.

private fun reminderData(notification: Notification): JSONObject? = notification.notificationRequest.content.body

private fun isHalovatReminder(notification: Notification): Boolean {
  val data = reminderData(notification) ?: return false
  return listOf("halovatTimeReminder", "halovatPrayerCheckin", "halovatDuaReminder", "halovatReminderPreview").any { data.optBoolean(it) }
}

internal fun closeReminder(context: Context, identifier: String) {
  if (identifier.isBlank()) return
  HalovatReminderVibration.stop(context, identifier)
  NotificationManagerCompat.from(context).cancel(identifier, REMINDER_ID)
  context.sendBroadcast(Intent(CLOSE_ACTION).setPackage(context.packageName).addFlags(Intent.FLAG_RECEIVER_FOREGROUND).putExtra("identifier", identifier))
}

class HalovatReminderCloseReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    closeReminder(context, intent.getStringExtra("identifier") ?: return)
  }
}

/** Expo's supported delegate hooks keep scheduling, categories and response parsing intact. */
class HalovatNotificationsService : NotificationsService() {
  override fun onReceive(context: Context, intent: Intent?) {
    val notification = intent?.getParcelableExtra<Notification>(NOTIFICATION_KEY)
    if (intent?.getStringExtra(EVENT_TYPE_KEY) != "present" || notification == null || !isHalovatReminder(notification)) {
      super.onReceive(context, intent)
      return
    }
    // This is a background broadcast (no FLAG_RECEIVER_FOREGROUND). Keep its process
    // and CPU alive while the finite ten-second alarm effect is playing, without a second notification.
    val pending = goAsync()
    val lock = context.getSystemService(PowerManager::class.java).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Halovat:reminderVibration")
    lock.acquire(15_000L)
    Thread {
      try { handleIntent(context, intent) }
      finally { Handler(Looper.getMainLooper()).postDelayed({ if (lock.isHeld) lock.release(); pending.finish() }, 12_000L) }
    }.start()
  }
  override fun getPresentationDelegate(context: Context): PresentationDelegate = HalovatReminderPresentation(context)
  override fun getSchedulingDelegate(context: Context): SchedulingDelegate = HalovatReminderScheduling(context)
  override fun onReceiveNotificationResponse(context: Context, intent: Intent) {
    val response = getNotificationResponseFromBroadcastIntent(intent)
    if (isHalovatReminder(response.notification)) closeReminder(context, response.notification.notificationRequest.identifier)
    super.onReceiveNotificationResponse(context, intent)
  }
}

private class HalovatReminderScheduling(private val context: Context) : SchedulingDelegate {
  private val delegate = ExpoSchedulingDelegate(context)
  override fun getAllScheduledNotifications() = delegate.getAllScheduledNotifications()
  override fun getScheduledNotification(identifier: String) = delegate.getScheduledNotification(identifier)
  override fun triggerNotification(identifier: String) = delegate.triggerNotification(identifier)
  override fun setupScheduledNotifications() {
    getAllScheduledNotifications().forEach { request ->
      try { scheduleNotification(request) } catch (error: Exception) { android.util.Log.e("HalovatReminders", "Could not restore ${request.identifier}", error) }
    }
  }
  private fun cancelLegacyAlarm(identifier: String) {
    // The previous APK's PendingIntents target Expo's original receiver. Cancel them on migration.
    val receiver = "expo.modules.notifications.service.NotificationsService"
    val intent = Intent(NotificationsService.NOTIFICATION_EVENT_ACTION,
      Uri.parse("expo-notifications://notifications/").buildUpon().appendPath("scheduled").appendPath(identifier).appendPath("trigger").build())
      .setComponent(ComponentName(context.packageName, receiver))
    val flags = PendingIntent.FLAG_NO_CREATE or (if (Build.VERSION.SDK_INT >= 31) PendingIntent.FLAG_MUTABLE else 0)
    PendingIntent.getBroadcast(context, receiver.hashCode(), intent, flags)?.let {
      context.getSystemService(AlarmManager::class.java).cancel(it)
      it.cancel()
    }
  }

  override fun scheduleNotification(request: NotificationRequest) {
    // Save the replacement successfully before removing a previous alarm.
    delegate.scheduleNotification(request)
    cancelLegacyAlarm(request.identifier)
  }

  override fun removeScheduledNotifications(identifiers: Collection<String>) {
    delegate.removeScheduledNotifications(identifiers)
    identifiers.forEach { cancelLegacyAlarm(it) }
  }

  override fun removeAllScheduledNotifications() {
    val identifiers = getAllScheduledNotifications().map { it.identifier }
    delegate.removeAllScheduledNotifications()
    identifiers.forEach { cancelLegacyAlarm(it) }
  }
}

private class HalovatReminderPresentation(context: Context) : ExpoPresentationDelegate(context) {
  override fun presentNotification(notification: Notification, behavior: NotificationBehaviorRecord?) {
    if (!isHalovatReminder(notification) || behavior?.shouldPresentAlert == false) {
      super.presentNotification(notification, behavior)
      return
    }
    CoroutineScope(Dispatchers.IO).launch {
      val compat = NotificationManagerCompat.from(context)
      if (!compat.areNotificationsEnabled()) return@launch
      val original = createNotification(notification, behavior)
      val identifier = notification.notificationRequest.identifier
      val data = reminderData(notification) ?: JSONObject()
      val channelId = if (data.optBoolean("halovatPrayerCheckin")) "prayer-checkin-v4" else "halovat-reminders-v4"
      val manager = context.getSystemService(NotificationManager::class.java)
      if (Build.VERSION.SDK_INT >= 26) {
        if (manager.getNotificationChannel(channelId) == null) manager.createNotificationChannel(NotificationChannel(
          channelId, if (data.optBoolean("halovatPrayerCheckin")) "Namozdan keyingi savollar" else "Halovat eslatmalari", NotificationManager.IMPORTANCE_HIGH).apply {
          enableVibration(true); vibrationPattern = longArrayOf(0, 10_000)
          lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
          setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
        })
        if (manager.getNotificationChannel(channelId)?.importance == NotificationManager.IMPORTANCE_NONE) return@launch
      }
      val vibration = HalovatReminderVibration.start(context, identifier)
      val startedAt = SystemClock.elapsedRealtime()
      val popup = Intent(context, HalovatReminderActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
        this.data = Uri.parse("halovat-reminder://popup/${Uri.encode(identifier)}")
        putExtra("identifier", identifier)
        putExtra("title", notification.notificationRequest.content.title)
        putExtra("body", notification.notificationRequest.content.text)
        putExtra("startedAt", startedAt)
        putExtra("closeLabel", data.optString("halovatPopupClose", "Yopish"))
        putExtra("vibrationLabel", data.optString("halovatPopupVibration", "Vibratsiya · {seconds} soniya"))
        putExtra("finishedLabel", data.optString("halovatPopupFinished", "Vibratsiya tugadi"))
        if (vibration["ok"] != true) putExtra("vibrationError", vibration["reason"] as? String)
        putExtra("actions", original.actions)
      }
      val popupIntent = PendingIntent.getActivity(context, identifier.hashCode(), popup, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val close = Intent(context, HalovatReminderCloseReceiver::class.java).apply {
        addFlags(Intent.FLAG_RECEIVER_FOREGROUND)
        this.data = Uri.parse("halovat-reminder://close/${Uri.encode(identifier)}")
        putExtra("identifier", identifier)
      }
      val closeIntent = PendingIntent.getBroadcast(context, identifier.hashCode(), close, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
      val builder = android.app.Notification.Builder.recoverBuilder(context, original)
        .setVibrate(longArrayOf(0, 10_000))
        .setCategory(NotificationCompat.CATEGORY_ALARM)
        .setPriority(NotificationCompat.PRIORITY_HIGH)
        .setContentIntent(popupIntent)
        .setDeleteIntent(closeIntent)
        .setAutoCancel(false)
        .setOnlyAlertOnce(false)
        .addAction(0, data.optString("halovatPopupClose", "Yopish"), closeIntent)
      if (Build.VERSION.SDK_INT >= 26) builder.setChannelId(channelId)
      if (Build.VERSION.SDK_INT < 34 || manager.canUseFullScreenIntent()) builder.setFullScreenIntent(popupIntent, true)
      compat.notify(identifier, REMINDER_ID, builder.build())
      // Post the notification first so Android can launch its full-screen intent while locked.
      HalovatReminderAttention.start(context, identifier, startedAt)
      // A live JS behavior indicates the app is foregrounded. Background launch uses FSI only.
      if (behavior != null) Handler(Looper.getMainLooper()).post {
        try { context.startActivity(popup) } catch (_: RuntimeException) { /* The notification remains tappable. */ }
      }
    }
  }

  override fun dismissNotifications(identifiers: Collection<String>) {
    super.dismissNotifications(identifiers)
    identifiers.forEach {
      HalovatReminderVibration.stop(context, it)
      context.sendBroadcast(Intent(CLOSE_ACTION).setPackage(context.packageName).addFlags(Intent.FLAG_RECEIVER_FOREGROUND).putExtra("identifier", it))
    }
  }

  override fun dismissAllNotifications() {
    super.dismissAllNotifications()
    HalovatReminderVibration.stop(context)
    context.sendBroadcast(Intent(CLOSE_ACTION).setPackage(context.packageName).addFlags(Intent.FLAG_RECEIVER_FOREGROUND).putExtra("allReminders", true))
  }
}

/** Small native screen: it can display and close a reminder even when React is not running. */
class HalovatReminderActivity : Activity() {
  private val handler = Handler(Looper.getMainLooper())
  private var identifier = ""
  private var clock: TextView? = null
  private val releaseScreen = Runnable { window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) }
  private val timer = object : Runnable {
    override fun run() {
      intent.getStringExtra("vibrationError")?.let { error ->
        clock?.text = error
        clock?.setTextColor(Color.parseColor("#BA1A1A"))
        return
      }
      val remaining = ceil((intent.getLongExtra("startedAt", 0L) + 10_000L - SystemClock.elapsedRealtime()) / 1000.0).toInt().coerceIn(0, 10)
      clock?.text = if (remaining > 0) intent.getStringExtra("vibrationLabel")?.replace("{seconds}", remaining.toString())
        else intent.getStringExtra("finishedLabel")
      if (remaining > 0) handler.postDelayed(this, 200L)
    }
  }
  private val closer = object : BroadcastReceiver() {
    override fun onReceive(context: Context, event: Intent) {
      if (event.getStringExtra("identifier") == identifier || event.getBooleanExtra("allReminders", false)) finish()
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true) }
    else window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
    if (Build.VERSION.SDK_INT >= 30) window.insetsController?.setSystemBarsAppearance(0,
      WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS)
    if (Build.VERSION.SDK_INT >= 33) registerReceiver(closer, IntentFilter(CLOSE_ACTION), Context.RECEIVER_NOT_EXPORTED)
    else registerReceiver(closer, IntentFilter(CLOSE_ACTION))
    render()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    if (Build.VERSION.SDK_INT >= 27) setTurnScreenOn(true)
    render()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus && getSystemService(PowerManager::class.java).isInteractive) HalovatReminderAttention.screenShown(this)
  }

  private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
  private fun rounded(color: String, radius: Int) = GradientDrawable().apply { setColor(Color.parseColor(color)); cornerRadius = dp(radius).toFloat() }
  private fun text(value: String, size: Float, color: String, bold: Boolean = false) = TextView(this).apply {
    text = value; textSize = size; setTextColor(Color.parseColor(color)); gravity = Gravity.CENTER
    if (bold) typeface = Typeface.create("sans-serif-medium", Typeface.NORMAL)
    setPadding(0, dp(8), 0, dp(8))
  }

  private fun render() {
    handler.removeCallbacks(timer)
    handler.removeCallbacks(releaseScreen)
    identifier = intent.getStringExtra("identifier") ?: ""
    if (identifier.isBlank()) { finish(); return }
    val remaining = (intent.getLongExtra("startedAt", 0L) + 10_000L - SystemClock.elapsedRealtime()).coerceIn(0L, 10_000L)
    if (remaining > 0) {
      window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
      handler.postDelayed(releaseScreen, remaining)
    } else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER
      background = GradientDrawable(GradientDrawable.Orientation.TL_BR, intArrayOf(Color.parseColor("#003527"), Color.parseColor("#0D674F")))
      setPadding(dp(24), dp(32), dp(24), dp(32))
      setOnApplyWindowInsetsListener { view, insets ->
        if (Build.VERSION.SDK_INT >= 30) {
          val bars = insets.getInsets(WindowInsets.Type.systemBars())
          view.setPadding(dp(24) + bars.left, dp(24) + bars.top, dp(24) + bars.right, dp(24) + bars.bottom)
        }
        insets
      }
    }
    val scroll = ScrollView(this).apply { isFillViewport = true }
    val stack = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; gravity = Gravity.CENTER }
    val logo = ImageView(this).apply { setImageDrawable(applicationInfo.loadIcon(packageManager)); contentDescription = "Halovat" }
    stack.addView(logo, LinearLayout.LayoutParams(dp(72), dp(72)).apply { gravity = Gravity.CENTER_HORIZONTAL; bottomMargin = dp(12) })
    stack.addView(text("Halovat", 20f, "#B0F0D6", true))
    val card = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL; setPadding(dp(24), dp(28), dp(24), dp(24)); background = rounded("#FAF9F5", 28)
    }
    card.addView(text(intent.getStringExtra("title") ?: "Halovat", 27f, "#003527", true))
    card.addView(text(intent.getStringExtra("body") ?: "", 16f, "#404944"))
    clock = text("", 13f, "#006C49")
    card.addView(clock)
    val actions = intent.getParcelableArrayExtra("actions")?.mapNotNull { it as? android.app.Notification.Action } ?: emptyList()
    for ((index, action) in actions.withIndex()) card.addView(Button(this).apply {
      text = action.title; isAllCaps = false; textSize = 16f; minHeight = dp(52)
      setTextColor(if (index == 1) Color.parseColor("#BA1A1A") else Color.WHITE)
      background = rounded(if (index == 1) "#FFDAD6" else "#006C49", 16)
      setOnClickListener {
        closeReminder(this@HalovatReminderActivity, identifier)
        try { action.actionIntent?.send() } catch (_: PendingIntent.CanceledException) { }
        finish()
      }
    }, LinearLayout.LayoutParams(-1, dp(52)).apply { topMargin = dp(12) })
    card.addView(Button(this).apply {
      text = intent.getStringExtra("closeLabel") ?: "Yopish"; isAllCaps = false; textSize = 16f
      setTextColor(Color.parseColor("#003527")); background = rounded("#D5F8E7", 16)
      setOnClickListener { dismiss() }
    }, LinearLayout.LayoutParams(-1, dp(52)).apply { topMargin = dp(16) })
    stack.addView(card, LinearLayout.LayoutParams(-1, -2).apply { topMargin = dp(20) })
    scroll.addView(stack)
    root.addView(scroll, LinearLayout.LayoutParams(-1, -1))
    setContentView(root)
    root.requestApplyInsets()
    handler.post(timer)
  }

  private fun dismiss() { closeReminder(this, identifier); finish() }
  @Deprecated("Back closes the reminder")
  override fun onBackPressed() { dismiss() }

  override fun onDestroy() {
    handler.removeCallbacks(timer)
    handler.removeCallbacks(releaseScreen)
    unregisterReceiver(closer)
    super.onDestroy()
  }
}
