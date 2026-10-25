import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useThemeColors } from '../../ui/useAppTheme';

export default function TabLayout() {
  const colors = useThemeColors();
  const { t } = useLanguage();

  return (
    <NativeTabs tintColor={colors.green} backgroundColor={colors.paper}>
      <NativeTabs.Trigger name="index">
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
