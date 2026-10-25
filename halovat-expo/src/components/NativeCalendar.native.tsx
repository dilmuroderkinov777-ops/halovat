import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import React from 'react';
import type { NativeCalendarProps } from './NativeCalendar';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';

export function NativeCalendar({ value, maximumDate, onChange }: NativeCalendarProps) {
  const { language } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  return <DateTimePicker value={value} onValueChange={(_, date) => onChange(date)}
    mode="date" display="inline" presentation="inline" maximumDate={maximumDate} locale={language}
    accentColor={colors.green} themeVariant={dark ? 'dark' : 'light'} style={{ width: '100%' }} />;
}
