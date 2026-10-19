import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { requestSettings } from './automaticQuiet';
import { focusControl, type QuietModeStatus } from './focusControl';

const GUIDE_KEY = 'halovat.reminder.battery.guide.v1';
let pendingGuide: Promise<void> | null = null;

export function needsManufacturerBatterySetup(status: QuietModeStatus | null) {
  return /xiaomi|redmi|poco/i.test(status?.manufacturer ?? '');
}

export function reminderBatteryInstructions(status: QuietModeStatus | null) {
  return needsManufacturerBatterySetup(status)
    ? 'Halovat sozlamalarida “Batareya tejamkori” → “Cheklovlarsiz”ni tanlang. “Avtomatik ishga tushirish”ni ham yoqing. Bu ekran o‘chiq paytda eslatmalar ishlashiga yordam beradi.'
    : 'Batareya sozlamalarida Halovat uchun “Cheklovlarsiz”ni tanlang yoki batareya optimizatsiyasini o‘chiring. Bu ekran o‘chiq paytda eslatmalar ishlashiga yordam beradi.';
}

export async function showReminderBatteryGuide(t: (text: string) => string = text => text) {
  if (Platform.OS !== 'android' || !focusControl) return;
  const native = focusControl;
  await requestSettings(t('Eslatmalar fonda ishlashi'), t(reminderBatteryInstructions(native.getStatus())), () => native.openBatterySettings());
}

/** Teach once on first enable. Viewing the guide never implies a permission was granted. */
export function ensureReminderBatteryGuide(t: (text: string) => string = text => text): Promise<void> {
  if (Platform.OS !== 'android' || !focusControl) return Promise.resolve();
  if (pendingGuide) return pendingGuide;
  const native = focusControl;
  pendingGuide = (async () => {
    const status = native.getStatus();
    if (status.batteryUnrestricted && !needsManufacturerBatterySetup(status)) return;
    const seen = await AsyncStorage.getItem(GUIDE_KEY).catch(() => null);
    if (seen === 'shown') return;
    await showReminderBatteryGuide(t);
    await AsyncStorage.setItem(GUIDE_KEY, 'shown').catch(() => undefined);
  })().finally(() => { pendingGuide = null; });
  return pendingGuide;
}
