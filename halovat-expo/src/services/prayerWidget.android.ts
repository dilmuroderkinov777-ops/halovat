import type { PrayerWidgetSnapshot } from '../domain/prayerWidget';
import { focusControl } from './focusControl';

let lastSnapshot: string | undefined;
export async function syncPrayerWidget(snapshot: PrayerWidgetSnapshot) {
  const signature = JSON.stringify({ ...snapshot, generatedAt: 0 });
  if (signature === lastSnapshot || !focusControl?.updatePrayerWidget) return;
  if (focusControl.updatePrayerWidget(JSON.stringify(snapshot))) lastSnapshot = signature;
}
