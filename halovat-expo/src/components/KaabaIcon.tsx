import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

/** Front, roof and right face follow the user's Kaaba illustration reference. */
export function KaabaIcon({ size = 32 }: { size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 100 100">
    <Path d="M8 22 L28 8 H92 L74 22 Z" fill="#1A1A32" />
    <Path d="M8 22 H74 V94 H8 Z" fill="#0A091E" />
    <Path d="M74 22 L92 8 V78 L74 94 Z" fill="#050516" />
    <Rect x="8" y="34" width="66" height="7" fill="#F5CA00" />
    <Path d="M74 34 L92 20 V27 L74 41 Z" fill="#EABC00" />
    <Rect x="8" y="44" width="8" height="3" fill="#F5CA00" />
    <Rect x="40" y="44" width="34" height="3" fill="#F5CA00" />
    <Path d="M74 44 L92 30 V33 L74 47 Z" fill="#EABC00" />
    <Rect x="18" y="44" width="20" height="50" fill="#FFC400" />
    <Path d="M18 94 L28 61 L38 94 Z" fill="#DEA315" />
    <Rect x="18" y="91" width="20" height="3" fill="#E8B938" />
  </Svg>;
}
