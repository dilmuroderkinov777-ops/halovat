import { Button, Host, Text } from '@expo/ui';
import React, { useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';
import { actionModifiers, largeActionLabelModifiers, minimalActionLabelModifiers, squareActionLabelModifiers } from './nativeControlModifiers';
import { nativeAccessibilityLabel } from './nativeAccessibility';
import { Colors } from '../ui/theme';

export function NativeAction({ label, onPress, disabled = false, variant = 'filled', compact = false, large = false, square = false, translate = true, colorScheme, accessibilityLabel, suffix = '', appearance = 'default' }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
  compact?: boolean; large?: boolean; square?: boolean; translate?: boolean; colorScheme?: 'light' | 'dark'; accessibilityLabel?: string; suffix?: string; appearance?: 'default' | 'minimal';
}) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  const { fontScale } = useWindowDimensions();
  const scheme = colorScheme ?? (dark ? 'dark' : 'light');
  const largeAction = large && !compact;
  const minimal = appearance === 'minimal';
  const nativeVariant = minimal ? 'text' : variant;
  const text = (translate ? t(label) : label) + suffix;
  const tintColor = nativeVariant === 'filled' ? Colors.green : scheme === 'dark' ? '#78E3AF' : colors.green;
  const accessibility = accessibilityLabel ? nativeAccessibilityLabel(t(accessibilityLabel)) : [];
  // Native sizing modifiers take points, so measure the React Native host for full-width actions.
  const [width, setWidth] = useState<number>();
  return (
    <Host matchContents={square ? false : compact ? true : { vertical: true }} ignoreSafeArea="all"
      colorScheme={scheme} seedColor={scheme === 'dark' ? '#78E3AF' : colors.green}
      style={{ ...(square ? { width: 44, height: 44 } : compact ? { flexShrink: 1 } : { width: '100%' }),
        ...(minimal ? { borderWidth: 1, borderColor: scheme === 'dark' ? '#527360' : colors.line, borderRadius: 10, backgroundColor: 'transparent' } : {}) }}
      onLayout={compact || square ? undefined : event => setWidth(event.nativeEvent.layout.width)}>
      <Button label={largeAction || square || minimal ? undefined : text} onPress={onPress} disabled={disabled} variant={nativeVariant}
        modifiers={[...actionModifiers(nativeVariant, tintColor, largeAction), ...accessibility]}
        style={(largeAction || square || minimal) && Platform.OS === 'ios' ? undefined
          : { ...(square ? { width: 44 } : !compact && width ? { width } : {}), height: largeAction ? Math.max(52, 28 * fontScale + 24) : 44,
            ...(largeAction ? { borderRadius: 999 } : {}) }}>
        {largeAction || square || minimal ? <Text modifiers={minimal ? minimalActionLabelModifiers(compact) : square ? squareActionLabelModifiers() : largeActionLabelModifiers()}
          textStyle={minimal ? { fontSize: 14, fontWeight: '500', textAlign: 'center', color: tintColor }
            : Platform.OS === 'ios' ? undefined : { fontSize: square ? 19 : 15, fontWeight: '600', textAlign: 'center',
            ...(Platform.OS === 'web' ? { color: variant === 'filled' ? '#FFFFFF' : tintColor } : {}) }}>{text}</Text> : undefined}
      </Button>
    </Host>
  );
}
