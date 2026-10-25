import { Host, Picker } from '@expo/ui';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';

export function NativeSelect<T extends string | number>({ value, options, onChange, translate = true, colorScheme }: {
  value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
  translate?: boolean; colorScheme?: 'light' | 'dark';
}) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  return (
    <Host matchContents={{ vertical: true }} ignoreSafeArea="all" style={{ width: '100%' }}
      colorScheme={colorScheme ?? (dark ? 'dark' : 'light')} seedColor={colors.green}>
      <Picker selectedValue={value} onValueChange={onChange}>
        {options.map(option => <Picker.Item key={option.value} value={option.value} label={translate ? t(option.label) : option.label} />)}
      </Picker>
    </Host>
  );
}
