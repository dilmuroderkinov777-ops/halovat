package uz.halovat.app.platform.quiet

import android.app.AlarmManager
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.flow.first
import uz.halovat.app.data.AppRepository
import uz.halovat.app.domain.QuietLease
import uz.halovat.app.domain.QuietSessionPolicy
import uz.halovat.app.domain.QuietSource
import uz.halovat.app.platform.notifications.HalovatNotifications
import java.util.UUID

object QuietModeCoordinator {
    const val ACTION_END_LEASE = "uz.halovat.app.action.END_QUIET_LEASE"
    const val EXTRA_LEASE_ID = "lease_id"
    private val mutex = Mutex()

    suspend fun start(context: Context, repository: AppRepository, source: QuietSource, minutes: Int, stableId: String? = null): QuietLease? = mutex.withLock {
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        if (!notificationManager.isNotificationPolicyAccessGranted) return@withLock null

        val now = System.currentTimeMillis()
        val lease = QuietLease(
            id = stableId ?: "${source.name.lowercase()}-${UUID.randomUUID()}",
            source = source,
            startedAt = now,
            endsAt = now + minutes.coerceIn(1, 180) * 60_000L,
        )
        val active = QuietSessionPolicy.active(repository.leasesNow(), now)
        if (active.any { it.id == lease.id }) {
            repository.updateLeases { existing -> QuietSessionPolicy.upsert(existing, lease, now) }
            scheduleExpiry(context, lease)
            return@withLock lease
        }
        repository.updateLeases { QuietSessionPolicy.upsert(it, lease, now) }
        if (active.isEmpty()) {
            repository.setQuietGroupStartedAt(now)
            val current = notificationManager.currentInterruptionFilter
            val ownsChange = QuietSessionPolicy.shouldTakeDndOwnership(current, NotificationManager.INTERRUPTION_FILTER_ALL)
            repository.setDndOwnership(ownsChange, if (ownsChange) current else null)
            if (ownsChange) runCatching { notificationManager.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_NONE) }
                .onFailure {
                    repository.updateLeases { leases -> leases.filterNot { it.id == lease.id } }
                    repository.setQuietGroupStartedAt(null)
                    repository.setDndOwnership(false)
                    return@withLock null
                }
        }
        scheduleExpiry(context, lease)
        lease
    }

    suspend fun end(context: Context, repository: AppRepository, leaseId: String): Boolean = mutex.withLock {
        if (repository.leasesNow().none { it.id == leaseId }) return@withLock false
        val groupStartedAt = repository.quietGroupStartedAt()
        repository.updateLeases { QuietSessionPolicy.end(it, leaseId, System.currentTimeMillis()) }
        cancelExpiry(context, leaseId)
        restoreIfLast(context, repository)
        if (repository.leasesNow().none { it.endsAt > System.currentTimeMillis() }) postSummary(context, repository, groupStartedAt)
        true
    }

    suspend fun endManual(context: Context, repository: AppRepository) = mutex.withLock {
        val groupStartedAt = repository.quietGroupStartedAt()
        val manualIds = repository.leasesNow().filter { it.source != QuietSource.MOSQUE }.map { it.id }
        repository.updateLeases { leases -> leases.filter { it.source == QuietSource.MOSQUE } }
        manualIds.forEach { cancelExpiry(context, it) }
        restoreIfLast(context, repository)
        if (repository.leasesNow().none { it.endsAt > System.currentTimeMillis() }) postSummary(context, repository, groupStartedAt)
    }

    suspend fun reconcile(context: Context, repository: AppRepository) = mutex.withLock {
        val now = System.currentTimeMillis()
        val groupStartedAt = repository.quietGroupStartedAt()
        val expired = repository.leasesNow().filter { it.endsAt <= now }
        if (expired.isNotEmpty()) repository.updateLeases { it.filter { lease -> lease.endsAt > now } }
        expired.forEach { cancelExpiry(context, it.id) }
        repository.leasesNow().filter { it.endsAt > now }.forEach { scheduleExpiry(context, it) }
        restoreIfLast(context, repository)
        if (expired.isNotEmpty() && repository.leasesNow().none { it.endsAt > now }) postSummary(context, repository, groupStartedAt)
    }

    private suspend fun postSummary(context: Context, repository: AppRepository, groupStartedAt: Long?) {
        if (groupStartedAt == null) return
        val count = repository.callEvents.first().count { it.receivedAt >= groupStartedAt }
        HalovatNotifications.postCallSummary(context, count)
    }

    private suspend fun restoreIfLast(context: Context, repository: AppRepository) {
        if (repository.leasesNow().any { it.endsAt > System.currentTimeMillis() }) return
        val (ownsChange, previousFilter) = repository.dndOwnership()
        val manager = context.getSystemService(NotificationManager::class.java)
        if (ownsChange && manager.isNotificationPolicyAccessGranted) {
            val current = manager.currentInterruptionFilter
            // Android 15+ maps this API to the app's own Zen rule. Before Android 15,
            // restore only while the global filter still matches the value Halovat set.
            if (Build.VERSION.SDK_INT >= 35 || current == NotificationManager.INTERRUPTION_FILTER_NONE) {
                runCatching {
                    manager.setInterruptionFilter(previousFilter ?: NotificationManager.INTERRUPTION_FILTER_ALL)
                }
            }
        }
        repository.setDndOwnership(false)
        repository.setQuietGroupStartedAt(null)
    }

    private fun scheduleExpiry(context: Context, lease: QuietLease) {
        val intent = Intent(context, QuietModeReceiver::class.java).apply {
            action = ACTION_END_LEASE
            putExtra(EXTRA_LEASE_ID, lease.id)
            data = android.net.Uri.parse("halovat://quiet/${android.net.Uri.encode(lease.id)}")
        }
        val pending = PendingIntent.getBroadcast(
            context,
            lease.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        context.getSystemService(AlarmManager::class.java).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, lease.endsAt, pending)
    }

    private fun cancelExpiry(context: Context, leaseId: String) {
        val intent = Intent(context, QuietModeReceiver::class.java).apply {
            action = ACTION_END_LEASE
            putExtra(EXTRA_LEASE_ID, leaseId)
            data = android.net.Uri.parse("halovat://quiet/${android.net.Uri.encode(leaseId)}")
        }
        PendingIntent.getBroadcast(
            context,
            leaseId.hashCode(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE,
        )?.let { context.getSystemService(AlarmManager::class.java).cancel(it); it.cancel() }
    }
}
