package uz.halovat.app.platform

import android.content.Context
import uz.halovat.app.R

object PrayerLabels {
    fun localized(context: Context, name: String): String = context.getString(
        when (name) {
            "Bomdod" -> R.string.prayer_fajr
            "Quyosh" -> R.string.prayer_sunrise
            "Peshin" -> R.string.prayer_dhuhr
            "Asr" -> R.string.prayer_asr
            "Shom" -> R.string.prayer_maghrib
            "Xufton" -> R.string.prayer_isha
            else -> R.string.app_name
        },
    )
}
