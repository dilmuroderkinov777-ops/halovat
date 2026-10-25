import { Platform } from 'react-native';
import { useThemeColors } from './useAppTheme';

export function useNativeHeaderOptions() {
  const colors = useThemeColors();
  const isIOS = Platform.OS === 'ios';

  return {
    headerStyle: { backgroundColor: isIOS ? 'transparent' : colors.paper },
    headerTransparent: isIOS,
    headerShadowVisible: isIOS ? true : undefined,
    headerBlurEffect: isIOS ? 'systemChromeMaterial' as const : undefined,
    // The navigation bar owns the blur; a second scroll-edge effect would overlap it.
    scrollEdgeEffects: isIOS ? { top: 'hidden' as const } : undefined,
    headerTintColor: colors.ink,
    headerTitleAlign: 'center' as const,
    headerLargeTitleEnabled: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.canvas },
  };
}
