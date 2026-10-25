import { SegmentedControl } from '@expo/ui/community/segmented-control';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';

export function NativeSegments<T extends string | number>({ value, options, onChange }: {
  value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  return <SegmentedControl values={options.map(option => t(option.label))}
    selectedIndex={options.findIndex(option => option.value === value)}
    onChange={event => {
      const option = options[event.nativeEvent.selectedSegmentIndex];
      if (option) onChange(option.value);
    }} appearance={dark ? 'dark' : 'light'} tintColor={colors.green} style={{ width: '100%' }} />;
}
