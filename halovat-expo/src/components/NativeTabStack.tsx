import { router, Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useHalovat } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useNativeHeaderOptions } from '../ui/useNativeHeaderOptions';

export function NativeTabStack({ title }: { title: string }) {
  const { city } = useHalovat();
  const { t } = useLanguage();
  const screenOptions = useNativeHeaderOptions();

  return <Stack screenOptions={screenOptions}>
    <Stack.Screen name="index" options={{ title: t(title), headerBackVisible: false }}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={Platform.OS === 'ios' ? 'location' : require('../../assets/header-location.xml')}
          accessibilityLabel={`${t('Shaharni o‘zgartirish')}: ${t(city.name)}`}
          onPress={() => router.navigate('/(tabs)/settings')}
        />
      </Stack.Toolbar>
    </Stack.Screen>
  </Stack>;
}
