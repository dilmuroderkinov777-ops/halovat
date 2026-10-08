package uz.halovat.app

import android.app.Application
import uz.halovat.app.data.AppRepository
import uz.halovat.app.data.PrayerCalendarStore
import uz.halovat.app.platform.notifications.HalovatNotifications

class HalovatApplication : Application() {
    lateinit var repository: AppRepository
        private set
    lateinit var prayerCalendarStore: PrayerCalendarStore
        private set

    override fun onCreate() {
        super.onCreate()
        repository = AppRepository(this)
        prayerCalendarStore = PrayerCalendarStore(this)
        HalovatNotifications.createChannels(this)
    }
}
