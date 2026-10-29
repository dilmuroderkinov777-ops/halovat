import React from 'react';
import { Image } from 'react-native';

/** Transparent 3D miniature with a gold kiswah belt and raised doorway. */
export function KaabaIcon({ size = 32 }: { size?: number }) {
  return <Image accessible={false} source={require('../../assets/qibla/kaaba-3d.png')}
    resizeMode="contain" style={{ width: size, height: size }} />;
}
