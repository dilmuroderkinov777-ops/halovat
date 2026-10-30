package uz.halovat.focus

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.os.SystemClock
import android.net.Uri
import android.text.TextUtils
import android.util.TypedValue
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.TimeZone

/** A launcher-owned Chronometer keeps counting even when React and the app are stopped. */
class HalovatPrayerWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) = updateAll(context)
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) = updateAll(context)
  override fun onDisabled(context: Context) { cancelRefresh(context) }
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    when (intent.action) {
      REFRESH, Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED, Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> updateAll(context)
    }
  }

  companion object {
    private const val STORE = "halovat.prayer.widget.v1"
    private const val REFRESH = "uz.halovat.focus.PRAYER_WIDGET_REFRESH"

    fun save(context: Context, json: String): Boolean {
      val snapshot = JSONObject(json)
      require(snapshot.getInt("version") == 1)
      require(snapshot.getJSONArray("prayers").length() > 1)
      context.getSharedPreferences(STORE, Context.MODE_PRIVATE).edit().putString("snapshot", json).apply()
      updateAll(context)
      return true
    }

    private fun refreshIntent(context: Context) = PendingIntent.getBroadcast(context, 24081,
      Intent(context, HalovatPrayerWidget::class.java).setAction(REFRESH), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)

    private fun cancelRefresh(context: Context) { context.getSystemService(AlarmManager::class.java).cancel(refreshIntent(context)) }

    private fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, HalovatPrayerWidget::class.java))
      if (ids.isEmpty()) { cancelRefresh(context); return }
      val stored = context.getSharedPreferences(STORE, Context.MODE_PRIVATE).getString("snapshot", null)
      val snapshot = try { stored?.let(::JSONObject) } catch (_: Exception) { null }
      // A changed device zone invalidates the absolute calendar times until the
      // app reuses its authoritative calendar in the new zone.
      val sameZone = snapshot != null && android.icu.util.TimeZone.getCanonicalID(snapshot.optString("timeZone")) == android.icu.util.TimeZone.getCanonicalID(TimeZone.getDefault().id)
      val list = snapshot?.optJSONArray("prayers")
      val prayers = if (sameZone && list != null) (0 until list.length()).map { index ->
        val item = list.getJSONObject(index)
        WidgetPrayer(item.getString("id"), item.getString("name"), item.getString("currentLabel"), item.getLong("at"), item.getString("time"))
      }.sortedBy { it.at } else emptyList()
      val now = System.currentTimeMillis()
      val frame = PrayerWidgetSchedule.frame(prayers, now)
      ids.forEach { id ->
        try { manager.updateAppWidget(id, render(context, manager.getAppWidgetOptions(id), snapshot, frame, now)) }
        catch (error: RuntimeException) { android.util.Log.e("HalovatPrayerWidget", "Could not update widget $id", error) }
      }
      cancelRefresh(context)
      if (frame == null) return
      val alarm = context.getSystemService(AlarmManager::class.java)
      val at = PrayerWidgetSchedule.nextRefresh(frame, now)
      try {
        if (Build.VERSION.SDK_INT < 31 || alarm.canScheduleExactAlarms()) alarm.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, refreshIntent(context))
        else alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, refreshIntent(context))
      } catch (_: SecurityException) { alarm.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, refreshIntent(context)) }
    }

    private fun render(context: Context, options: Bundle, snapshot: JSONObject?, frame: WidgetPrayerFrame?, now: Long): RemoteViews {
      val density = context.resources.displayMetrics.density
      val widthDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 320).coerceIn(220, 800)
      val heightDp = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 180).coerceIn(128, 400)
      val width = (widthDp * density).toInt()
      val height = (heightDp * density).toInt()
      val scale = minOf(width / 360f, height / 210f)
      val pad = 20f * scale
      val timerSize = minOf(49f * scale, (width - 2 * pad) * 0.71f / 4.5f)
      val timerTop = height * 0.36f
      val views = RemoteViews(context.packageName, R.layout.halovat_prayer_widget)
      val theme = snapshot?.optJSONObject("themes")?.optJSONObject(frame?.current?.id ?: "isha")
      val colors = theme?.optJSONArray("colors")?.let { a -> IntArray(a.length()) { Color.parseColor(a.getString(it)) } }
        ?: intArrayOf(Color.rgb(53, 61, 114), Color.rgb(37, 44, 85), Color.rgb(24, 30, 61))
      val accent = theme?.optString("accent")?.let(Color::parseColor) ?: Color.rgb(206, 204, 255)
      val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
      val canvas = Canvas(bitmap)
      val paint = Paint(Paint.ANTI_ALIAS_FLAG)
      paint.shader = LinearGradient(width * 0.1f, 0f, width.toFloat(), height.toFloat(), colors, null, Shader.TileMode.CLAMP)
      canvas.drawRoundRect(RectF(0f, 0f, width.toFloat(), height.toFloat()), 26 * scale, 26 * scale, paint)
      paint.shader = null
      paint.color = (accent and 0x00ffffff) or 0x18000000
      canvas.drawCircle(width - 18 * scale, -34 * scale, 92 * scale, paint)
      paint.color = (accent and 0x00ffffff) or 0x12000000
      canvas.drawCircle(65 * scale, height + 35 * scale, 74 * scale, paint)

      fun text(value: String, x: Float, y: Float, size: Float, color: Int, maxWidth: Float, bold: Boolean = false, right: Boolean = false) {
        paint.color = color
        paint.textSize = size
        paint.typeface = Typeface.create("sans-serif", if (bold) Typeface.BOLD else Typeface.NORMAL)
        val fitted = TextUtils.ellipsize(value, android.text.TextPaint(paint), maxWidth, TextUtils.TruncateAt.END).toString()
        canvas.drawText(fitted, if (right) x - paint.measureText(fitted) else x, y, paint)
      }

      if (frame != null) {
        val title = "${snapshot?.optString("nextLabel")} ${frame.next.name}"
        val pillWidth = (width * 0.72f).coerceAtMost(255 * scale)
        paint.color = 0x17ffffff
        canvas.drawRoundRect(RectF(pad, 15 * scale, pad + pillWidth, 43 * scale), 15 * scale, 15 * scale, paint)
        // Small clock icon, matching the home card's pill.
        paint.color = accent; paint.style = Paint.Style.STROKE; paint.strokeWidth = 1.3f * scale
        canvas.drawCircle(pad + 14 * scale, 29 * scale, 5 * scale, paint)
        canvas.drawLine(pad + 14 * scale, 29 * scale, pad + 14 * scale, 25.5f * scale, paint)
        canvas.drawLine(pad + 14 * scale, 29 * scale, pad + 17 * scale, 30 * scale, paint)
        paint.style = Paint.Style.FILL
        text(title, pad + 26 * scale, 33 * scale, 11 * scale, Color.WHITE, pillWidth - 35 * scale, true)
        text(snapshot?.optString("city") ?: "", width - pad, 32 * scale, 9 * scale, accent, width - 2 * pad - pillWidth - 8 * scale, right = true)
        val artSize = minOf(width * 0.29f, height * 0.55f)
        try {
          val image = context.assets.open("prayer-hero/${frame.current.id}.png").use {
            BitmapFactory.decodeStream(it, null, BitmapFactory.Options().apply { inSampleSize = 2 })
          }
          if (image != null) { canvas.drawBitmap(image, null, RectF(width - pad - artSize, timerTop - 13 * scale, width - pad, timerTop - 13 * scale + artSize), paint); image.recycle() }
        } catch (error: java.io.IOException) { android.util.Log.w("HalovatPrayerWidget", "Prayer artwork is unavailable", error) }
        val units = snapshot?.optJSONArray("units")
        paint.textSize = timerSize; paint.typeface = Typeface.DEFAULT_BOLD
        val glyph = paint.measureText("00:00:00") / 8f
        for (i in 0..2) {
          val unit = units?.optString(i) ?: ""
          paint.textSize = 9 * scale; paint.typeface = Typeface.DEFAULT
          text(unit, pad + (i * 3 + 1) * glyph - paint.measureText(unit) / 2, timerTop + timerSize + 13 * scale, 9 * scale, accent, 68 * scale)
        }
        val progressY = height - 43 * scale
        val bar = RectF(pad, progressY, width - pad, progressY + 5 * scale)
        paint.color = 0x26000000; canvas.drawRoundRect(bar, 3 * scale, 3 * scale, paint)
        paint.color = accent
        canvas.drawRoundRect(RectF(bar.left, bar.top, bar.left + bar.width() * frame.progress, bar.bottom), 3 * scale, 3 * scale, paint)
        text(frame.current.currentLabel, pad, height - 18 * scale, 10 * scale, accent, width * 0.60f)
        val until = snapshot?.optString("untilLabel")?.replace("{time}", frame.next.time) ?: frame.next.time
        text(until, width - pad, height - 18 * scale, 10 * scale, Color.WHITE, width * 0.35f, true, right = true)
        views.setViewVisibility(R.id.halovat_widget_empty, View.GONE)
        views.setViewVisibility(R.id.halovat_widget_timer, View.VISIBLE)
        views.setViewPadding(R.id.halovat_widget_timer_container, pad.toInt(), timerTop.toInt(), (width * 0.29f).toInt(), 0)
        views.setTextViewTextSize(R.id.halovat_widget_timer, TypedValue.COMPLEX_UNIT_PX, timerSize)
        views.setChronometerCountDown(R.id.halovat_widget_timer, true)
        val remaining = frame.next.at - System.currentTimeMillis()
        views.setChronometer(R.id.halovat_widget_timer, SystemClock.elapsedRealtime() + remaining, PrayerWidgetSchedule.countdownFormat(remaining), true)
        views.setContentDescription(R.id.halovat_widget_root, "${snapshot?.optString("city")}. $title. $until")
      } else {
        views.setViewVisibility(R.id.halovat_widget_timer, View.GONE)
        views.setViewVisibility(R.id.halovat_widget_empty, View.VISIBLE)
        views.setTextViewText(R.id.halovat_widget_empty, snapshot?.optString("openLabel") ?: context.getString(R.string.halovat_widget_open))
      }
      views.setImageViewBitmap(R.id.halovat_widget_art, bitmap)
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        launch.action = Intent.ACTION_VIEW
        launch.data = Uri.parse("halovat-expo:///")
        views.setOnClickPendingIntent(R.id.halovat_widget_root,
          PendingIntent.getActivity(context, 24080, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      }
      return views
    }
  }
}
