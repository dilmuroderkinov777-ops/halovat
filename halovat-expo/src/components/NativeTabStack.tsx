import { Stack } from 'expo-router';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNativeHeaderOptions } from '../ui/useNativeHeaderOptions';

export function NativeTabStack({ title }: { title: string }) {
  const { t } = useLanguage();
  const screenOptions = useNativeHeaderOptions();

  return <Stack screenOptions={screenOptions}>
    <Stack.Screen name="index" options={{ title: t(title), headerBackVisible: false }} />
  </Stack>;
}
