import { requireOptionalNativeModule } from 'expo';
import { prayerWidgetTimeline, type PrayerWidgetSnapshot } from '../domain/prayerWidget';

let lastSnapshot: string | undefined;
let queue = Promise.resolve();

export function syncPrayerWidget(snapshot: PrayerWidgetSnapshot): Promise<void> {
  // Keep Expo Go and older app binaries usable until a widget build is installed.
  if (!requireOptionalNativeModule('ExpoWidgets')) return Promise.resolve();
  const signature = JSON.stringify({ ...snapshot, generatedAt: 0 });
  const next = queue.catch(() => undefined).then(async () => {
    if (signature === lastSnapshot) return;
    const [{ default: widget }, { Asset }, { Directory, File }, { widgetsDirectory }, { PRAYER_HERO }] = await Promise.all([
      import('../widgets/PrayerCountdownWidget.ios'), import('expo-asset'), import('expo-file-system'), import('expo-widgets'), import('../data/prayerHero'),
    ]);
    if (!widgetsDirectory) throw new Error('Prayer widget app group is unavailable.');
    const directory = new Directory(widgetsDirectory, 'prayer-hero');
    directory.create({ intermediates: true, idempotent: true });
    const images: Record<string, string> = {};
    for (const [id, hero] of Object.entries(PRAYER_HERO)) {
      const asset = Asset.fromModule(hero.image as number);
      await asset.downloadAsync();
      if (!asset.localUri) throw new Error(`Prayer widget image is unavailable: ${id}`);
      const destination = new File(directory, `${id}-${asset.hash ?? 'v1'}.png`);
      if (!destination.exists) new File(asset.localUri).copy(destination);
      images[id] = destination.uri;
    }
    widget.updateTimeline(prayerWidgetTimeline(snapshot).map(({ at, frame }) => ({
      date: new Date(at), props: {
        city: snapshot.city, nextLabel: snapshot.nextLabel, openLabel: snapshot.openLabel, units: snapshot.units,
        currentLabel: frame?.current.currentLabel ?? '', nextName: frame?.next.name ?? '',
        until: frame ? snapshot.untilLabel.replace('{time}', frame.next.time) : '',
        startsAt: frame?.current.at ?? 0, endsAt: frame?.next.at ?? 0,
        colors: [...snapshot.themes[frame?.current.id ?? 'isha'].colors], accent: snapshot.themes[frame?.current.id ?? 'isha'].accent,
        imageUri: images[frame?.current.id ?? 'isha'],
      },
    })));
    lastSnapshot = signature;
  });
  queue = next;
  return next;
}
