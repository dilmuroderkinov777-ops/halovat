import type { PrayerStatus } from '../domain/prayers';

export type PrayerCheckinSheetProps = {
  prayerName: string;
  onChoose: (status: PrayerStatus) => void;
  onClose: () => void;
};
