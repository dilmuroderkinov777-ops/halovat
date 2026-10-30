import type { ImageSourcePropType } from 'react-native';
import type { PrayerId } from '../domain/prayers';
import { PRAYER_HERO_THEMES } from './prayerHeroThemes';

type PrayerHero = {
  colors: readonly [string, string, string];
  accent: string;
  image: ImageSourcePropType;
};

export const PRAYER_HERO: Record<PrayerId, PrayerHero> = {
  fajr: { ...PRAYER_HERO_THEMES.fajr, image: require('../../assets/prayer-hero/fajr.png') },
  dhuhr: { ...PRAYER_HERO_THEMES.dhuhr, image: require('../../assets/prayer-hero/dhuhr.png') },
  asr: { ...PRAYER_HERO_THEMES.asr, image: require('../../assets/prayer-hero/asr.png') },
  maghrib: { ...PRAYER_HERO_THEMES.maghrib, image: require('../../assets/prayer-hero/maghrib.png') },
  isha: { ...PRAYER_HERO_THEMES.isha, image: require('../../assets/prayer-hero/isha.png') },
};
