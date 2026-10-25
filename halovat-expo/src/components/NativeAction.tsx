import { Button, Host } from '@expo/ui';
import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';

export function NativeAction({ label, onPress, disabled = false, variant = 'filled', compact = false, translate = true, colorScheme }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
  compact?: boolean; translate?: boolean; colorScheme?: 'light' | 'dark';
}) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  const scheme = colorScheme ?? (dark ? 'dark' : 'light');
  // Native sizing modifiers take points, so measure the React Native host for full-width actions.
  const [width, setWidth] = useState<number>();
  return (
    <Host matchContents={compact ? true : { vertical: true }} ignoreSafeArea="all"
      colorScheme={scheme} seedColor={scheme === 'dark' ? '#78E3AF' : colors.green}
      style={compact ? { flexShrink: 1 } : { width: '100%' }}
      onLayout={compact ? undefined : event => setWidth(event.nativeEvent.layout.width)}>
      <Button label={translate ? t(label) : label} onPress={onPress} disabled={disabled} variant={variant}
        style={{ ...(!compact && width ? { width } : {}), height: 44 }} />
    </Host>
  );
}
