import { requireOptionalNativeModule } from 'expo';

export type QuietModeStatus = {
  supported: boolean;
  dndAccess?: boolean;
  callScreeningSupported?: boolean;
  callScreeningRole?: boolean;
  sessionActive?: boolean;
  exactAlarmAccess?: boolean;
  batteryUnrestricted?: boolean;
  manufacturer?: string;
  model?: string;
  androidVersion?: string;
  nextQuietBoundary?: number;
  prayerScheduleThrough?: number;
  quietAppliedAt?: number;
  quietError?: string | null;
  prayerWindowCount?: number;
  mosqueInside?: boolean;
  mosqueQuietError?: string | null;
  mosqueRegisteredAt?: number;
  reminderPopupAccess?: boolean;
  vibratorPresent?: boolean;
  vibrationError?: string | null;
  lastVibrationRequestAt?: number;
  reminderEngineVersion?: number;
  reminderReceiver?: string;
  interruptionFilter?: number;
  ringerMode?: number;
  alarmVolume?: number;
  flashlightPresent?: boolean;
  flashlightPermission?: boolean;
  flashlightError?: string | null;
  screenWakeError?: string | null;
  lastScreenWakeAt?: number;
};

export type FocusCallEvent = { phoneNumber: string | null; timestamp: number };

type HalovatFocusNative = {
  getStatus(): QuietModeStatus;
  openDndSettings(): boolean;
  requestCallScreeningRole(): boolean;
  setQuietSession(durationSeconds: number, muteCalls: boolean, muteNotifications: boolean): { ok: boolean; reason?: string; active?: boolean };
  endQuietSession(): boolean;
  getCallEvents(): FocusCallEvent[];
  clearCallEvents(): boolean;
  openExactAlarmSettings(): boolean;
  openBatterySettings(): boolean;
  openReminderPopupSettings(): boolean;
  startVibrationPreview(): { ok: boolean; reason?: string };
  stopVibrationPreview(): boolean;
  setPrayerQuietWindows(json: string): boolean;
  scheduleQuietPreview(): { start: number; end: number };
  cancelQuietPreview(): boolean;
  setMosqueRegion(latitude: number, longitude: number, enabled: boolean): Promise<boolean>;
};

export default requireOptionalNativeModule<HalovatFocusNative>('HalovatFocus');
