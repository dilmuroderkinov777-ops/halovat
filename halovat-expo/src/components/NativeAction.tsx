import { Button, Host, Text } from '@expo/ui';
import React, { useState } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';
import { largeActionLabelModifiers, largeActionModifiers } from './nativeControlModifiers';

export function NativeAction({ label, onPress, disabled = false, variant = 'filled', compact = false, large = false, translate = true, colorScheme }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
  compact?: boolean; large?: boolean; translate?: boolean; colorScheme?: 'light' | 'dark';
}) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  const { fontScale } = useWindowDimensions();
  const scheme = colorScheme ?? (dark ? 'dark' : 'light');
  const largeAction = large && !compact;
  const text = translate ? t(label) : label;
  // Native sizing modifiers take points, so measure the React Native host for full-width actions.
  const [width, setWidth] = useState<number>();
  return (
    <Host matchContents={compact ? true : { vertical: true }} ignoreSafeArea="all"
      colorScheme={scheme} seedColor={scheme === 'dark' ? '#78E3AF' : colors.green}
      style={compact ? { flexShrink: 1 } : { width: '100%' }}
      onLayout={compact ? undefined : event => setWidth(event.nativeEvent.layout.width)}>
      <Button label={largeAction ? undefined : text} onPress={onPress} disabled={disabled} variant={variant}
        modifiers={largeAction ? largeActionModifiers(variant) : undefined}
        style={largeAction && Platform.OS === 'ios' ? undefined
          : { ...(!compact && width ? { width } : {}), height: largeAction ? Math.max(52, 28 * fontScale + 24) : 44,
            ...(largeAction ? { borderRadius: 999 } : {}) }}>
        {largeAction ? <Text modifiers={largeActionLabelModifiers()}
          textStyle={Platform.OS === 'ios' ? undefined : { fontSize: 17, fontWeight: '600', textAlign: 'center',
            ...(Platform.OS === 'web' ? { color: variant === 'filled' ? '#FFFFFF' : colors.green } : {}) }}>{text}</Text> : undefined}
      </Button>
    </Host>
  );
}
