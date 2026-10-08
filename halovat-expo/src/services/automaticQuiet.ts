import { Alert, AppState } from 'react-native';
import { focusControl } from './focusControl';

/** Resolve once the user returns from Android settings; denied access leaves the switch off. */
export function requestSettings(title: string, message: string, open: () => boolean): Promise<void> {
  return new Promise(resolve => Alert.alert(title, message, [
    { text: 'Hozir emas', style: 'cancel', onPress: () => resolve() },
    { text: 'Sozlamalarni ochish', onPress: () => {
      let leftApp = false;
      const subscription = AppState.addEventListener('change', state => {
        if (state !== 'active') leftApp = true;
        else if (leftApp) { subscription.remove(); resolve(); }
      });
      try { if (!open()) { subscription.remove(); resolve(); } }
      catch { subscription.remove(); resolve(); }
    } },
  ], { cancelable: true, onDismiss: () => resolve() }));
}

export async function ensureAutomaticQuietAccess(exactAlarm: boolean): Promise<boolean> {
  const native = focusControl;
  if (!native) {
    Alert.alert('Android’da ishlaydi', 'Avtomatik ovozsiz rejim Android ilovasida ishlaydi. iPhone’da Focus rejimini qo‘lda yoqing.');
    return false;
  }
  if (!native.getStatus().dndAccess) {
    await requestSettings('Ovozsiz rejim uchun ruxsat', 'Halovat uchun “Bezovta qilmang” ruxsatini yoqing. Rejim tugaganda avvalgi ovoz sozlamasi tiklanadi.', () => native.openDndSettings());
    if (!native.getStatus().dndAccess) return false;
  }
  if (exactAlarm && !native.getStatus().exactAlarmAccess) {
    await requestSettings('Namoz vaqtida aniq ishga tushirish', 'Halovat uchun “Budilniklar va eslatmalar” ruxsatini yoqing. Bu ovozsiz rejimni namoz vaqti kelganda ishga tushiradi.', () => native.openExactAlarmSettings());
    if (!native.getStatus().exactAlarmAccess) return false;
  }
  return true;
}
