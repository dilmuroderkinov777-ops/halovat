import { Platform } from 'react-native';
import { useThemeColors } from './useAppTheme';

export function useNativeHeaderOptions() {
  const colors = useThemeColors();
  const isIOS = Platform.OS === 'ios';
  const usesScrollEdgeEffect = isIOS && Number.parseInt(String(Platform.Version), 10) >= 26;

  return {
    headerStyle: { backgroundColor: isIOS ? 'transparent' : colors.paper },
    headerTransparent: isIOS,
    headerShadowVisible: isIOS ? false : undefined,
    // iOS 26 supplies its own scroll blur; keep material blur for older iOS versions.
    headerBlurEffect: isIOS && !usesScrollEdgeEffect ? 'systemMaterial' as const : undefined,
    scrollEdgeEffects: usesScrollEdgeEffect ? { top: 'soft' as const } : undefined,
    headerTintColor: colors.ink,
    headerTitleAlign: 'center' as const,
    headerTitleStyle: { fontSize: Platform.OS === 'ios' ? 17 : 20, fontWeight: '600' as const },
    headerLargeTitleEnabled: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.canvas },
  };
}
