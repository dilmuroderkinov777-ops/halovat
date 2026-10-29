import type { CompassMotion } from '../domain/compassMotion';

export type QiblaSceneProps = {
  motion: CompassMotion;
  bearing: number;
  aligned: boolean;
  active: boolean;
  dark: boolean;
  reduceMotion: boolean;
};
