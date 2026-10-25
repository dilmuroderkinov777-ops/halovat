import { Platform } from 'react-native';
import { useThemeColors } from './useAppTheme';

export function useNativeHeaderOptions() {
  const colors = useThemeColors();
  return {
    headerStyle: { backgroundColor: colors.paper },
    headerTintColor: colors.ink,
    headerTitleAlign: 'center' as const,
    headerTitleStyle: { fontSize: Platform.OS === 'ios' ? 17 : 20, fontWeight: '600' as const },
    headerLargeTitleEnabled: false,
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: colors.canvas },
  };
}
