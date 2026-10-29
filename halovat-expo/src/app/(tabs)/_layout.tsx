import type { NavigationState } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../../ui/useAppTheme';

export default function TabLayout() {
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  const { t } = useLanguage();

  return (
    <NativeTabs tintColor={colors.green} backgroundColor={colors.paper}
      // iOS Liquid Glass follows the native host's interface style, not JS colors.
      unstable_nativeProps={{ colorScheme: dark ? 'dark' : 'light' }}
      iconColor={{ default: colors.body, selected: colors.green }}
      labelStyle={{ default: { color: colors.body }, selected: { color: colors.green } }}>
      <NativeTabs.Trigger name="(home)" listeners={({ navigation, route }) => ({
        blur: () => {
          const tabs: NavigationState | undefined = navigation.getState();
          // Only reset when switching tabs, not when a modal covers Home.
          if (!tabs || tabs.routes[tabs.index]?.key === route.key) return;
          const homeStack = tabs.routes.find(tab => tab.key === route.key)?.state;
          if (homeStack?.type === 'stack' && homeStack.key && (homeStack.index ?? 0) > 0) {
            navigation.dispatch({ type: 'POP_TO_TOP', target: homeStack.key });
          }
        },
      })}>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>{t('Bosh sahifa')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tracker">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>{t('Namozlar')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tasbeeh">
        <NativeTabs.Trigger.Icon sf="circle.dotted" md="radio_button_checked" />
        <NativeTabs.Trigger.Label>{t('Tasbeh')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="qibla">
        <NativeTabs.Trigger.Icon sf={{ default: 'location.north.circle', selected: 'location.north.circle.fill' }} md="explore" />
        <NativeTabs.Trigger.Label>{t('Qibla')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="person" />
        <NativeTabs.Trigger.Label>{t('Profil')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
