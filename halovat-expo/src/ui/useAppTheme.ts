import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useHalovatDarkMode } from '../context/AppContext';
import { Colors } from './theme';

const surfaces: Record<string, string> = {
  '#FAF9F5': '#0E1914', '#FFFFFF': '#192820', '#FFF': '#192820',
  '#F4F4F0': '#24362C', '#EFEEEA': '#24362C', '#E9E8E4': '#2D4035',
  '#E3E2DF': '#35493E', '#DDF8EB': '#224C39', '#DDF8E8': '#224C39',
  '#D5F8E7': '#224C39', '#D8F5E7': '#224C39', '#E8F7EF': '#224C39',
  '#E8F4ED': '#224C39', '#DFF0E8': '#224C39', '#ECFDF5': '#1D392A',
  '#FFF0ED': '#442B28', '#FFEBE8': '#442B28', '#FFEAE7': '#442B28',
  '#FFF0D7': '#453719', '#FFDDB8': '#453719', '#B0F0D6': '#224C39',
  '#EFF2ED': '#2C4234', '#FFDAD6': '#442B28', '#EEF6F0': '#24362C',
  '#DBF4E7': '#224C39', '#E9F2EC': '#224C39',
};
const foregrounds: Record<string, string> = {
  '#1B1C1A': '#EDF5EF', '#404944': '#BFCFC4', '#545F58': '#BFCFC4',
  '#707974': '#A4B9AA', '#768079': '#A4B9AA', '#006C49': '#78E3AF',
  '#064E3B': '#A3E8C7', '#003527': '#A3E8C7', '#BA1A1A': '#FFB4AA',
  '#653E00': '#FFCF8A',
};

export function useAppTheme() {
  const dark = useHalovatDarkMode();
  return { dark, background: dark ? '#0E1914' : Colors.canvas, surface: dark ? '#192820' : Colors.paper };
}

/** Adapt shared surface and text tokens; keep devotional green cards and white labels. */
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(base: T): T {
  const { dark } = useAppTheme();
  return useMemo(() => {
    if (!dark) return base;
    return Object.fromEntries(Object.entries(base).map(([name, value]) => {
      const style = value as Record<string, unknown>;
      return [name, Object.fromEntries(Object.entries(style).map(([property, color]) => {
        if (typeof color !== 'string') return [property, color];
        const key = color.toUpperCase();
        if (property === 'backgroundColor') return [property, surfaces[key] ?? color];
        if (property === 'color') return [property, foregrounds[key] ?? color];
        if (/^(border.*Color)$/.test(property) && /^#(E|F|BF)/i.test(color)) return [property, '#354B3D'];
        return [property, color];
      }))];
    })) as unknown as T;
  }, [base, dark]);
}

export function useThemeColors() {
  const { dark } = useAppTheme();
  return dark ? { ...Colors, canvas: '#0E1914', paper: '#192820', ink: '#EDF5EF', body: '#BFCFC4', muted: '#A4B9AA', green: '#78E3AF', red: '#FFB4AA', line: '#354B3D' } : Colors;
}
