import * as Notifications from 'expo-notifications';
import { Alert, Linking, PermissionsAndroid, Platform } from 'react-native';
import { requestSettings } from './automaticQuiet';
import { focusControl } from './focusControl';

// Android channel importance is immutable. New IDs migrate the old DEFAULT channels.
export const REMINDER_CHANNEL = 'halovat-reminders-v4';
export const CHECKIN_CHANNEL = 'prayer-checkin-v4';

export async function prepareReminderChannels() {
  if (Platform.OS !== 'android') return;
  for (const [id, name] of [[REMINDER_CHANNEL, 'Halovat eslatmalari'], [CHECKIN_CHANNEL, 'Namozdan keyingi savollar']]) {
    await Notifications.setNotificationChannelAsync(id, {
      name, importance: Notifications.AndroidImportance.HIGH, sound: 'default',
      audioAttributes: { usage: Notifications.AndroidAudioUsage.ALARM, contentType: Notifications.AndroidAudioContentType.SONIFICATION },
      enableVibrate: true, vibrationPattern: [0, 10_000],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

export async function ensureReminderPopupAccess() {
  const native = focusControl;
  if (Platform.OS !== 'android' || !native || native.getStatus().reminderPopupAccess) return;
  await requestSettings('Eslatma oynasi uchun ruxsat', 'Ekran qulflanganda ham Halovat eslatma oynasini ko‘rsatishi uchun “To‘liq ekran bildirishnomalari”ga ruxsat bering. Ruxsatsiz eslatma oddiy bildirishnoma sifatida keladi.', () => native.openReminderPopupSettings());
}

export async function ensureReminderFlashAccess(t: (text: string) => string = text => text) {
  if (Platform.OS !== 'android' || !focusControl) return false;
  const status = focusControl.getStatus();
  if (!status.flashlightPresent) return false;
  if (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA)) return true;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: t('Eslatma chirog‘i'),
    message: t('Bildirishnoma kelganda kamera chirog‘i 10 soniya miltillashi uchun kamera ruxsati kerak. Surat yoki video olinmaydi.'),
    buttonPositive: t('Davom etish'), buttonNegative: t('Hozir emas'),
  });
  if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
  Alert.alert(t('Chiroq ruxsati berilmadi'), t('Vibratsiya va bildirishnomalar ishlaydi. Chiroq miltillashi uchun Halovatga kamera ruxsatini bering.'), [
    { text: t('Hozir emas'), style: 'cancel' },
    { text: t('Sozlamalarni ochish'), onPress: () => { void Linking.openSettings(); } },
  ]);
  return false;
}

export async function ensureReminderAlarmAccess() {
  if (Platform.OS !== 'android') return true;
  const native = focusControl;
  if (!native) throw new Error('Android eslatma moduli topilmadi. Yangi APKni o‘rnating.');
  if (!native.getStatus().exactAlarmAccess) {
    await requestSettings('Aniq vaqtdagi eslatmalar', 'Halovat uchun “Budilniklar va eslatmalar” ruxsatini yoqing. Oddiy bildirishnoma ruxsati namoz vaqtida aniq eslatish uchun yetarli emas.', () => native.openExactAlarmSettings());
  }
  return !!native.getStatus().exactAlarmAccess;
}

export function isPrayerReminder(item: Notifications.NotificationRequest) {
  return item.content.data?.halovatPrayerCheckin === true || item.content.data?.halovatTimeReminder === true || item.content.data?.halovatDuaReminder === true;
}

export type ReminderPlan = { count: number; nextAt: number | null; busy: boolean; error: string | null };
