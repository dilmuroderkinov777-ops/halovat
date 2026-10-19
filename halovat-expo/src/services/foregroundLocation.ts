import * as Location from 'expo-location';

let pending: Promise<Location.LocationObject> | null = null;
const acceptable = (value: Location.LocationObject | null, accuracy: number): value is Location.LocationObject =>
  !!value && Number.isFinite(value.coords.latitude) && Number.isFinite(value.coords.longitude)
  && Math.abs(value.coords.latitude) <= 90 && Math.abs(value.coords.longitude) <= 180
  && value.coords.accuracy !== null && value.coords.accuracy >= 0 && value.coords.accuracy <= accuracy
  && Date.now() - value.timestamp >= 0 && Date.now() - value.timestamp < 120_000;

/** Share one bounded GPS request and remove the native watcher even on timeout. */
export function foregroundLocation({ fresh = false } = {}): Promise<Location.LocationObject> {
  if (pending) return pending;
  pending = acquire(fresh).finally(() => { pending = null; });
  return pending;
}

async function acquire(fresh: boolean): Promise<Location.LocationObject> {
  if (!await Location.hasServicesEnabledAsync()) throw new Error('GPS o‘chiq. Telefon sozlamalaridan joylashuvni yoqing.');
  const cached = await Location.getLastKnownPositionAsync({ maxAge: 120_000, requiredAccuracy: 1000 }).catch(() => null);
  if (!fresh && acceptable(cached, 100) && Date.now() - cached.timestamp < 15_000) return cached;

  return new Promise((resolve, reject) => {
    let finished = false;
    let watcher: Location.LocationSubscription | undefined;
    let best = acceptable(cached, 1000) ? cached : null;
    const finish = (value: Location.LocationObject | null, error?: Error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      watcher?.remove();
      if (value) resolve(value);
      else reject(error ?? new Error('Joylashuv aniqlanmadi. GPS va aniq joylashuv ruxsatini tekshiring.'));
    };
    const timer = setTimeout(() => finish(best), 12_000);
    void Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 0, timeInterval: 1000 }, value => {
      if (!acceptable(value, 1000)) return;
      if (!best || value.coords.accuracy! < best.coords.accuracy!) best = value;
      if (acceptable(value, 100)) finish(value);
    }, reason => finish(best, new Error(reason))).then(subscription => {
      if (finished) subscription.remove(); else watcher = subscription;
    }).catch(error => finish(best, error instanceof Error ? error : undefined));
  });
}
