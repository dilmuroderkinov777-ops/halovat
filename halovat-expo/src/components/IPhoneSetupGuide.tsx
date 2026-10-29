import React from 'react';
import { Linking } from 'react-native';
import { NativeAction } from './NativeAction';
import { SettingsDisclosure, SettingsNotice, SettingsSteps } from './SettingsPanelUI';

export function IPhoneSetupGuide({ expoGo, onVibrationTest }: { expoGo: boolean; onVibrationTest: () => void }) {
  return <>
    <SettingsNotice>Kerakli bo‘limni oching va bosqichlarni bajaring.</SettingsNotice>
    <SettingsDisclosure number={1} title="Bildirishnoma ruxsatlari" subtitle="Ovoz va qulf ekranidagi eslatmalar" initiallyOpen>
      <SettingsSteps steps={['Sozlamalar → Bildirishnomalar', expoGo ? 'Expo Go ilovasini tanlang.' : 'Halovat ilovasini tanlang.', 'Bildirishnomalar, ovoz va qulf ekranida ko‘rsatishni yoqing.']} />
      <NativeAction appearance="minimal" label="Telefon sozlamalarini ochish" onPress={() => void Linking.openSettings()} />
    </SettingsDisclosure>
    <SettingsDisclosure number={2} title="Eslatma vibratsiyasi" subtitle="Tebranishni sozlash va tekshirish">
      <SettingsSteps steps={['Sozlamalar → Sounds & Haptics → Haptics', 'Always Play’ni tanlang.', 'Accessibility → Touch → Vibration yoqilganini tekshiring.']} />
      <NativeAction appearance="minimal" label="Vibratsiyani tekshirish" onPress={onVibrationTest} />
      <SettingsNotice>Bu sinov faqat ilova ochiq paytda ishlaydi. Qulf ekranidagi eslatma vibratsiyasini iOS boshqaradi.</SettingsNotice>
      <NativeAction appearance="minimal" label="Apple: vibratsiyani sozlash" onPress={() => void Linking.openURL('https://support.apple.com/en-mide/guide/iphone/iph07c867f28/26/ios/26')} />
    </SettingsDisclosure>
    <SettingsDisclosure number={3} title="Eslatma chirog‘i" subtitle="Bildirishnomada chiroq miltillashi">
      <SettingsSteps steps={['Sozlamalar → Accessibility → Audio & Visual', 'Flash for Alerts’ni yoqing. LED Flash yoki Both’ni tanlang.', 'Telefon jim rejimda bo‘lsa, Flash in Silent Mode’ni ham yoqing.']} />
      <SettingsNotice>Ekran ochiq paytda ham chiroq kerak bo‘lsa, Flash While Unlocked’ni yoqing. Chiroq va vibratsiya davomiyligini iOS boshqaradi.</SettingsNotice>
      <NativeAction appearance="minimal" label="Apple: chiroqni sozlash" onPress={() => void Linking.openURL('https://support.apple.com/guide/iphone/flash-indicator-light-screen-notifications-iph79ced06b1/ios')} />
    </SettingsDisclosure>
    <SettingsDisclosure number={4} title="Focus rejimi" subtitle="Focus paytida ham eslatma olish">
      <SettingsSteps steps={['Sozlamalar → Focus → tanlangan rejim → Ilovalar', expoGo ? 'Expo Go ilovasiga ruxsat bering.' : 'Halovat ilovasiga ruxsat bering.']} />
      <SettingsNotice>iPhone’da ovozsiz rejimni Boshqaruv markazi → Focus orqali yoqing. Halovat uni avtomatik yoqmaydi va qo‘ng‘iroqlar tarixini o‘qimaydi.</SettingsNotice>
    </SettingsDisclosure>
    {expoGo ? <SettingsNotice>Expo Go testida ruxsatlar Expo Go ilovasiga beriladi.</SettingsNotice> : null}
  </>;
}
