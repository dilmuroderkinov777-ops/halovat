import { Platform } from 'react-native';
import { useThemeColors } from './useAppTheme';

export function useNativeHeaderOptions() {
  const colors = useThemeColors();
  const isIOS = Platform.OS === 'ios';
  const usesNativeEdgeBlur = isIOS && Number.parseInt(String(Platform.Version), 10) >= 26;

  return {
    headerStyle: { backgroundColor: isIOS ? 'transparent' : colors.paper },
    headerTransparent: isIOS,
    headerShadowVisible: isIOS ? true : undefined,
    // UIKit's hard edge keeps the dividing line and manages the blur behind the header.
    headerBlurEffect: isIOS && !usesNativeEdgeBlur ? 'systemUltraThinMaterial' as const : undefined,
    scrollEdgeEffects: usesNativeEdgeBlur ? { top: 'hard' as const } : undefined,
    headerTintColor: colors.ink,
    headerTitleAlign: 'center' as const,
    headerLargeTitleEnabled: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.canvas },
  };
}
