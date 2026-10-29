import type { ImageSourcePropType } from 'react-native';
import type { PrayerId } from '../domain/prayers';

type PrayerHero = {
  colors: readonly [string, string, string];
  accent: string;
  image: ImageSourcePropType;
};

export const PRAYER_HERO: Record<PrayerId, PrayerHero> = {
  fajr: { colors: ['#535174', '#3D4266', '#292F50'], accent: '#F5CEAA', image: require('../../assets/prayer-hero/fajr.png') },
  dhuhr: { colors: ['#26718B', '#185970', '#103F56'], accent: '#FFE29A', image: require('../../assets/prayer-hero/dhuhr.png') },
  asr: { colors: ['#906737', '#76502C', '#533A25'], accent: '#FFD397', image: require('../../assets/prayer-hero/asr.png') },
  maghrib: { colors: ['#995D62', '#784753', '#4E3048'], accent: '#FFC3A1', image: require('../../assets/prayer-hero/maghrib.png') },
  isha: { colors: ['#353D72', '#252C55', '#181E3D'], accent: '#CECCFF', image: require('../../assets/prayer-hero/isha.png') },
};
