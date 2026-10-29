import { router, Stack } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useNativeHeaderOptions } from '../ui/useNativeHeaderOptions';

export function NativeTabStack({ title }: { title: string }) {
  const { t } = useLanguage();
  const screenOptions = useNativeHeaderOptions();

  return <Stack screenOptions={screenOptions}>
    <Stack.Screen name="index" options={{ title: t(title), headerBackVisible: false }}>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={Platform.OS === 'ios' ? 'person.crop.circle' : require('../../assets/header-profile.xml')}
          accessibilityLabel={t('Profil')}
          onPress={() => router.navigate('/(tabs)/settings')}
        />
      </Stack.Toolbar>
    </Stack.Screen>
  </Stack>;
}
