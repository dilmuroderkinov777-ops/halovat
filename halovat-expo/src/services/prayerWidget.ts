import type { PrayerWidgetSnapshot } from '../domain/prayerWidget';

// Web has no launcher widget. Native implementations are resolved by Metro.
export async function syncPrayerWidget(_snapshot: PrayerWidgetSnapshot): Promise<void> {}
