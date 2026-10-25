import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { dateKey } from '../domain/prayers';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';

export type NativeCalendarProps = { value: Date; maximumDate: Date; onChange: (date: Date) => void };

// The community picker exposes SwiftUI on its default entry point; web uses the browser's date input.
export function NativeCalendar({ value, maximumDate, onChange }: NativeCalendarProps) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  return <input type="date" aria-label={t('Sana')} value={dateKey(value)} max={dateKey(maximumDate)}
    onChange={event => {
      if (!event.target.value) return;
      const [year, month, day] = event.target.value.split('-').map(Number);
      onChange(new Date(year, month - 1, day));
    }} style={{ colorScheme: dark ? 'dark' : 'light', color: colors.ink, backgroundColor: colors.paper, padding: 12, font: 'inherit' }} />;
}
