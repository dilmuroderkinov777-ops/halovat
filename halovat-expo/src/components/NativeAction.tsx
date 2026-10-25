import { Button, Host } from '@expo/ui';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';

export function NativeAction({ label, onPress, disabled = false, variant = 'filled', compact = false, translate = true, colorScheme }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
  compact?: boolean; translate?: boolean; colorScheme?: 'light' | 'dark';
}) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  return (
    <Host matchContents={compact ? true : { vertical: true }} ignoreSafeArea="all"
      colorScheme={colorScheme ?? (dark ? 'dark' : 'light')} seedColor={colors.green}
      style={compact ? { flexShrink: 1 } : { width: '100%' }}>
      <Button label={translate ? t(label) : label} onPress={onPress} disabled={disabled} variant={variant}
        style={{ ...(compact ? {} : { width: '100%' }), height: 44 }} />
    </Host>
  );
}
