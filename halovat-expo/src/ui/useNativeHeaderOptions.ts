import { Platform } from 'react-native';
import { useThemeColors } from './useAppTheme';

export function useNativeHeaderOptions() {
  const colors = useThemeColors();
  const isIOS = Platform.OS === 'ios';
  const usesNativeEdgeBlur = isIOS && Number.parseInt(String(Platform.Version), 10) >= 26;

  return {
    headerStyle: { backgroundColor: isIOS ? 'transparent' : colors.paper },
    headerTransparent: isIOS,
    headerShadowVisible: isIOS ? false : undefined,
    // UIKit's soft edge varies the blur toward the content; a uniform bar blur would cover that fade.
    headerBlurEffect: isIOS && !usesNativeEdgeBlur ? 'systemUltraThinMaterial' as const : undefined,
    scrollEdgeEffects: usesNativeEdgeBlur ? { top: 'soft' as const } : undefined,
    headerTintColor: colors.ink,
    headerTitleAlign: 'center' as const,
    headerLargeTitleEnabled: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.canvas },
  };
}
