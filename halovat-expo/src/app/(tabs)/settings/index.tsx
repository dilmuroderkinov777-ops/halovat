import * as Clipboard from 'expo-clipboard';
import * as Notifications from 'expo-notifications';
import { IosAlertStyle, AndroidImportance } from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { Battery, BellRing, CalendarDays, CheckCheck, Globe, Landmark, HandHeart, ListChecks, MapPin, Moon, PhoneIncoming, RefreshCw, ShieldCheck, Sunrise, VolumeX } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Keyboard, Platform, StyleSheet, Switch, View } from 'react-native';
import { NativeAction } from '../../../components/NativeAction';
import { NativeSegments } from '../../../components/NativeSegments';
import { NativeSelect } from '../../../components/NativeSelect';
import { NativeSheet } from '../../../components/NativeSheet';
import { CitySelectionSheet } from '../../../components/CitySelectionSheet';
import { IPhoneSetupGuide } from '../../../components/IPhoneSetupGuide';
import { SettingsCard, SettingsDisclosure, SettingsNotice, SettingsStatus } from '../../../components/SettingsPanelUI';
import { ProfileNameSheet } from '../../../components/ProfileNameSheet';
import { Screen } from '../../../components/Screen';
import { useHalovat } from '../../../context/AppContext';
import { useLanguage } from '../../../context/LanguageContext';
import { LANGUAGES } from '../../../data/languages';
import { SUPPORT_CARDS, SUPPORT_DESCRIPTION } from '../../../data/support';
import { formatUzDate } from '../../../domain/prayers';
import { focusControl, type FocusCallEvent, type QuietModeStatus } from '../../../services/focusControl';
import { CHECKIN_CHANNEL, REMINDER_CHANNEL, ensureReminderFlashAccess, iosReminderWarnings, notificationsAllowed } from '../../../services/reminders';
import { needsManufacturerBatterySetup, reminderBatteryInstructions, showReminderBatteryGuide } from '../../../services/reminderBattery';
import { ensureAutomaticQuietAccess } from '../../../services/automaticQuiet';
import { scheduleDiagnostics } from '../../../services/prayerScheduler';
import { Text } from '../../../ui/AppText';
import { useThemedStyles, useThemeColors } from '../../../ui/useAppTheme';
import { Typography } from '../../../ui/theme';

const DELAYS = [15, 20, 30];
const expoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
type Panel = 'city' | 'reminders' | 'language' | 'delivery' | 'ios-setup' | null;
const PANEL_TITLES = { city: 'Shaharni tanlang', reminders: 'Eslatmalar va Bildirishnomalar', language: 'Ilova tili', delivery: 'Eslatmalar holati', 'ios-setup': 'iPhone sozlamalari' };

export default function ProfileScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { language, setLanguage, t } = useLanguage();
  const selectedLanguage = LANGUAGES.find(item => item.id === language) ?? LANGUAGES[0];
  const { city, data, setCity, detectCity, setReminderEnabled, setPrayerTimeReminderEnabled, setDuaReminderEnabled, setReminderMinutes, setDisplayName, setArabicFontSize, setDarkMode, setPrayerAutoQuiet, setMosqueAutoQuiet, now, reminderPlan, refreshReminders, sendReminderPreview } = useHalovat();
  const [delivery, setDelivery] = useState<{ allowed: boolean; popup: boolean; sound: boolean; lockScreen: boolean; warnings: string[]; native: QuietModeStatus | null } | null>(null);
  const [deliveryError, setDeliveryError] = useState(false);
  const [deliveryRevision, setDeliveryRevision] = useState(0);
  const [panel, setPanel] = useState<Panel>(null);
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);
  const [callEvents, setCallEvents] = useState<FocusCallEvent[]>([]);
  const [batteryStatus, setBatteryStatus] = useState<QuietModeStatus | null>(null);
  const completed = Object.values(data.prayerStatus).filter(status => status === 'done').length;
  const missed = Object.values(data.prayerStatus).filter(status => status === 'missed').length;
  const memberDays = Math.max(1, Math.floor((now.getTime() - data.firstOpenedAt) / 86400000) + 1);
  const initials = data.displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(name => name[0]).join('').toUpperCase();

  useFocusEffect(useCallback(() => {
    let active = true;
    const update = () => {
      if (!active) return;
      setCallEvents(focusControl?.getCallEvents() ?? []);
      setBatteryStatus(focusControl?.getStatus() ?? null);
    };
    void Promise.resolve().then(update);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { active = false; subscription.remove(); };
  }, []));

  useEffect(() => {
    if (panel !== 'delivery' || Platform.OS === 'web') return;
    let active = true;
    const update = async () => {
      setDelivery(null); setDeliveryError(false);
      try {
        const permission = await Notifications.getPermissionsAsync();
        const channels = Platform.OS === 'android' ? await Promise.all([REMINDER_CHANNEL, CHECKIN_CHANNEL].map(id => Notifications.getNotificationChannelAsync(id))) : [];
        if (active) setDelivery({ allowed: notificationsAllowed(permission),
          popup: Platform.OS === 'ios' ? permission.ios?.allowsAlert === true && permission.ios.alertStyle !== IosAlertStyle.NONE : channels.every(channel => !!channel && channel.importance >= AndroidImportance.HIGH),
          sound: Platform.OS === 'ios' ? permission.ios?.allowsSound === true : true,
          lockScreen: Platform.OS === 'ios' ? permission.ios?.allowsDisplayOnLockScreen === true : true,
          warnings: iosReminderWarnings(permission),
          native: focusControl?.getStatus() ?? null });
      } catch { if (active) { setDelivery(null); setDeliveryError(true); } }
    };
    void update();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void update(); });
    return () => { active = false; listener.remove(); };
  }, [panel, reminderPlan, deliveryRevision]);

  const previewVibration = () => {
    if (Platform.OS === 'ios') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).then(() => {
        Alert.alert(t('Vibratsiya sinovi'), t('Bu tugma ilova ochiq paytdagi tebranishni tekshiradi. Qulf ekranidagi eslatmani alohida “Sinov bildirishnomasi” orqali tekshiring.'));
      }).catch(() => Alert.alert(t('Vibratsiya boshlanmadi'), t('Telefon sozlamalarini tekshiring.')));
      return;
    }
    if (!focusControl || (focusControl.getStatus().reminderEngineVersion ?? 0) < 4) {
      Alert.alert(t('Yangi APK kerak'), t('Vibratsiya tuzatilgan yangi APKni o‘rnating.'));
      return;
    }
    const result = focusControl.startVibrationPreview();
    setDeliveryRevision(value => value + 1);
    if (!result.ok) { Alert.alert(t('Vibratsiya boshlanmadi'), result.reason ?? t('Telefon sozlamalarini tekshiring.')); return; }
    const stop = () => { focusControl?.stopVibrationPreview(); setDeliveryRevision(value => value + 1); };
    Alert.alert(t('Vibratsiya sinovi'), t('Telefon 10 soniya tebranishi kerak. To‘xtatish tugmasi uni darhol to‘xtatadi.'), [{ text: t('To‘xtatish'), onPress: stop }], { cancelable: true, onDismiss: stop });
  };

  const closePanel = () => { Keyboard.dismiss(); setPanel(null); };
  const previewQuiet = async () => {
    const native = focusControl;
    if (!native || !await ensureAutomaticQuietAccess(true)) return;
    if (native.getStatus().sessionActive) {
      Alert.alert(t('Ovozsiz rejim'), t('Ovozsiz rejim hozir faol. Sinovni rejim tugagandan keyin boshlang.'));
      return;
    }
    const result = native.setQuietSession(15, false, true);
    setDeliveryRevision(value => value + 1);
    if (!result.ok) {
      Alert.alert(t('Ovozsiz rejim yoqilmadi'), native.getStatus().quietError ?? t('Telefon ruxsatlarini tekshiring.'));
      return;
    }
    Alert.alert(t('Ovozsiz rejim sinovi'), t('Telefon 15 soniyaga ovozsiz rejimga o‘tdi. So‘ng avvalgi ovoz holati tiklanadi.'), [
      { text: t('To‘xtatish'), onPress: () => { native.endQuietSession(); setDeliveryRevision(value => value + 1); } },
    ]);
  };
  const previewScheduledQuiet = async () => {
    if (!focusControl || !await ensureAutomaticQuietAccess(true)) return;
    if (focusControl.getStatus().sessionActive) { Alert.alert(t('Ovozsiz rejim'), t('Ovozsiz rejim hozir faol. Sinovni rejim tugagandan keyin boshlang.')); return; }
    try {
      focusControl.scheduleQuietPreview();
      Alert.alert('Fon rejimi sinovi', 'Ekranni qulflang. 15 soniyadan keyin ovozsiz rejim boshlanadi va 30 soniya davom etadi. So‘ng avvalgi ovoz qaytishi kerak.', [
        { text: 'Boshlash' }, { text: 'Bekor qilish', style: 'cancel', onPress: () => focusControl?.cancelQuietPreview() },
      ]);
    } catch { Alert.alert('Sinov boshlanmadi', 'DND va aniq alarm ruxsatlarini tekshiring.'); }
  };
  const copyDiagnostics = async () => {
    try {
      const report = { version: Constants.expoConfig?.version, time: new Date().toISOString(),
        native: focusControl?.getStatus(), compass: { engine: 'expo-location', layout: 'fixed-kaaba' },
        schedule: await scheduleDiagnostics(), reminders: reminderPlan };
      await Clipboard.setStringAsync(JSON.stringify(report, null, 2));
      Alert.alert('Nusxalandi', 'Sinov natijasiga ushbu diagnostikani qo‘shishingiz mumkin.');
    } catch { Alert.alert('Nusxa olinmadi', 'Qayta urinib ko‘ring.'); }
  };
  useEffect(() => {
    if (!copiedCard) return;
    const timer = setTimeout(() => setCopiedCard(null), 2500);
    return () => clearTimeout(timer);
  }, [copiedCard]);

  const copyCard = async (card: typeof SUPPORT_CARDS[number]) => {
    try {
      const copied = await Clipboard.setStringAsync(card.number);
      if (!copied) throw new Error('Clipboard unavailable');
      setCopiedCard(card.id);
    } catch {
      Alert.alert('Nusxa olinmadi', 'Karta raqamini nusxalash uchun qayta urinib ko‘ring.');
    }
  };
  const switchControl = (value: boolean, onChange: (value: boolean) => void) => <Switch value={value} onValueChange={onChange} trackColor={{ false: '#BFC9C3', true: '#006C49' }} thumbColor="#FFFFFF" style={styles.switchHost} />;

  return <><Screen style={styles.screen} contentStyle={styles.content}>
    <View style={[styles.card, styles.identityCard]}>
      <View pointerEvents="none" style={styles.identityGlow} />
      <View style={styles.identityRow}>
        <View style={styles.avatarWrap}><View style={styles.avatar}><Text style={styles.initials}>{initials || 'H'}</Text></View><View style={styles.verified}><ShieldCheck size={14} color="#006C49" /></View></View>
        <View style={styles.identityCopy}><Text translate={false} numberOfLines={1} style={styles.identityTitle}>{data.displayName}</Text><View style={styles.memberRow}><CalendarDays size={14} color={colors.green} /><Text style={styles.identitySubtitle}>Halovat bilan {memberDays} kundan beri birga</Text></View></View>
        <NativeAction label="Tahrirlash" onPress={() => setNameEditorOpen(true)} compact variant="outlined" />
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><View style={styles.metricIcon}><CheckCheck size={20} color={colors.green} /></View><View style={styles.metricCopy}><Text style={styles.metricValue}>{completed}</Text><Text style={styles.metricLabel}>Ado etilgan namoz</Text></View></View>
        <View style={styles.metric}><View style={[styles.metricIcon, styles.metricIconMissed]}><RefreshCw size={18} color={colors.red} /></View><View style={styles.metricCopy}><Text style={[styles.metricValue, styles.metricValueMissed]}>{missed}</Text><Text style={styles.metricLabel}>Qazo namozlari</Text></View></View>
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Joylashuv va hisob-kitob</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconBox}><MapPin size={21} color={colors.green} /></View>
          <View style={styles.rowCopy}><Text style={styles.rowTitle}>{city.name}, O‘zbekiston</Text><Text style={styles.rowSubtitle}>{city.region ?? 'O‘zbekiston'} (GMT+5)</Text></View>
          <NativeAction appearance="minimal" label="O‘zgartirish" onPress={() => setPanel('city')} compact variant="outlined" />
        </View>
        <NativeAction appearance="minimal" label="GPS orqali avtomatik aniqlash" onPress={() => void detectCity()} variant="outlined" />
      </View>
    </View>

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Eslatmalar va Bildirishnomalar</Text>
      <View style={styles.card}>
        <View style={styles.row}><View style={styles.iconBox}><BellRing size={20} color={colors.green} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Namoz vaqti eslatmasi</Text><Text style={styles.rowSubtitle}>5 vaqt uchun bildirishnoma</Text></View>{switchControl(data.prayerTimeReminderEnabled, value => void setPrayerTimeReminderEnabled(value))}</View>
        <View style={styles.row}><View style={styles.iconBox}><ListChecks size={20} color={colors.green} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Namozdan keyin so‘rash</Text><Text style={styles.rowSubtitle}>O‘qidim yoki qazo deb hisobga olish</Text></View>{switchControl(data.reminderEnabled, value => void setReminderEnabled(value))}</View>
        <View style={styles.row}><View style={styles.iconBox}><Sunrise size={20} color={colors.green} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Tonggi va kechki zikrlar</Text><Text style={styles.rowSubtitle}>07:00 va 19:30 da sokin eslatma</Text></View>{switchControl(data.duaReminderEnabled, value => void setDuaReminderEnabled(value))}</View>
        {Platform.OS !== 'ios' ? <>
          <View style={styles.row}><View style={styles.iconBox}><VolumeX size={20} color={colors.green} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Namoz vaqtida ovozsiz rejim</Text><Text style={styles.rowSubtitle}>Har namoz vaqtida 25 daqiqaga</Text></View>{switchControl(data.prayerAutoQuiet, value => void setPrayerAutoQuiet(value))}</View>
          <View style={styles.row}><View style={styles.iconBox}><Landmark size={20} color={colors.green} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Masjid hududida ovozsiz rejim</Text><Text numberOfLines={1} style={styles.rowSubtitle}>{data.mosqueName ? `${data.mosqueName} · 150 m hudud` : 'Tanlangan masjidga kirganda'}</Text></View>{switchControl(data.mosqueAutoQuiet, value => void setMosqueAutoQuiet(value))}</View>
        </> : <NativeAction appearance="minimal" label="Vibratsiya, chiroq va Focus" variant="outlined" onPress={() => setPanel('ios-setup')} />}
        <NativeAction appearance="minimal" label="Namozdan keyin so‘rash vaqtini sozlash" variant="outlined" onPress={() => setPanel('reminders')} />
      </View>
    </View>

    {Platform.OS === 'android' && batteryStatus ? <View style={[styles.card, styles.batteryCard]}>
      <View style={styles.row}><View style={styles.iconBox}><Battery size={21} color={colors.green} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Eslatmalar fonda ishlashi</Text><Text style={styles.rowSubtitle}>{needsManufacturerBatterySetup(batteryStatus) ? 'Redmi / MIUI uchun qo‘llanma' : batteryStatus.batteryUnrestricted ? 'Android batareya cheklovi olib tashlangan' : 'Batareya cheklovini tekshiring'}</Text></View></View>
      <Text style={styles.rowSubtitle}>{reminderBatteryInstructions(batteryStatus)}</Text>
      <NativeAction appearance="minimal" label="Batareya sozlamalarini ochish" onPress={() => { void showReminderBatteryGuide(t); }} variant="outlined" />
      {needsManufacturerBatterySetup(batteryStatus) ? <Text style={styles.rowSubtitle}>MIUI sozlamasini ilova avtomatik tekshira olmaydi. Sozlagach, sinov eslatmasini ekran o‘chiq holatda tekshiring.</Text> : null}
    </View> : null}

    <NativeAction appearance="minimal" label="Eslatmalarni tekshirish" onPress={() => { refreshReminders(); setPanel('delivery'); }} variant="outlined" />

    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Ilova ko‘rinishi va qulayliklar</Text>
      <View style={styles.card}>
        <View style={styles.row}><View style={[styles.iconBox, styles.neutralIcon]}><Moon size={20} color={colors.body} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Tungi rejim (Dark mode)</Text><Text style={styles.rowSubtitle}>Ko‘zni asrash uchun qorong‘u fon</Text></View>{switchControl(data.darkMode, setDarkMode)}</View>
        <View style={styles.row}><View style={[styles.iconBox, styles.neutralIcon]}><Globe size={20} color={colors.body} /></View><View style={styles.rowCopy}><Text style={styles.rowTitle}>Ilova tili</Text><Text translate={false} style={styles.rowSubtitle}>{selectedLanguage.greeting}</Text></View><NativeAction appearance="minimal" label={selectedLanguage.name} compact translate={false} variant="outlined" onPress={() => setPanel('language')} /></View>
      </View>
    </View>

    <View style={styles.donationCard}>
      <View pointerEvents="none" style={styles.donationGlow} />
      <View style={styles.donationHeading}><View style={styles.donationIcon}><HandHeart size={21} color="#6FFBBE" /></View><Text style={styles.donationTitle}>Halovatga hissa qo‘shing!</Text><Text style={styles.donationBadge}>XOLISONA</Text></View>
      <Text style={styles.donationBody}>«Halovat» ilovamiz rivojlanishi va ko‘proq insonlarga manfaatli bo‘lishi uchun, bizning kichik jamoamizni qo‘llab-quvvatlashingiz mumkin.</Text>
      {SUPPORT_CARDS.map(card => <View key={card.id} style={styles.bankCard}>
        <View style={styles.bankHeader}><Text translate={false} style={styles.bankBadge}>{card.network}</Text><Text translate={false} numberOfLines={1} style={styles.cardHolder}>{card.holder}</Text></View>
        <View style={styles.bankNumberRow}><View style={styles.rowCopy}><Text style={styles.bankCaption}>Karta raqami</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} selectable style={styles.bankNumber}>{card.number.match(/.{1,4}/g)?.join(' ')}</Text></View>
          <NativeAction appearance="minimal" label={copiedCard === card.id ? 'Nusxa olindi!' : 'Nusxa olish'} onPress={() => void copyCard(card)} compact variant="outlined" colorScheme="dark" />
        </View>
      </View>)}
      <View style={styles.supportDetails}><Text style={styles.supportDescription}>{SUPPORT_DESCRIPTION}</Text></View>
    </View>

    {focusControl && callEvents.length > 0 ? <View style={styles.section}><Text style={styles.sectionTitle}>Namoz paytidagi qo‘ng‘iroqlar</Text><View style={styles.card}><View style={styles.row}><PhoneIncoming size={20} color={colors.green} /><Text style={styles.rowTitle}>{callEvents.length} ta qo‘ng‘iroq</Text><View style={styles.rowCopy} /><NativeAction appearance="minimal" label="Tarixni tozalash" compact variant="text" onPress={() => { focusControl?.clearCallEvents(); setCallEvents([]); }} /></View>{callEvents.slice(0, 6).map((event, index) => <View key={event.timestamp + ':' + index} style={styles.callEntry}><Text style={styles.rowTitle}>{event.phoneNumber ?? 'Yashirin raqam'}</Text><Text style={styles.rowSubtitle}>{formatUzDate(new Date(event.timestamp))} · {new Date(event.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</Text></View>)}</View></View> : null}
    <View style={styles.footer}><Text style={styles.footerTitle}>Halovat — Sokin va xolis hamroh</Text><Text style={styles.footerVersion}>Versiya: v1.0.0 (Yengil va reklamasiz)</Text></View>

  </Screen>
    <CitySelectionSheet visible={panel === 'city'} cityId={city.id} onSelect={setCity} onClose={closePanel} />
    <NativeSheet visible={panel !== null && panel !== 'city'} contentKey={panel ?? 'closed'} onClose={closePanel} title={panel ? PANEL_TITLES[panel] : ''}>
        {panel === 'reminders' ? <><Text style={styles.rowTitle}>Namoz vaqtidan keyin</Text>
          <NativeSegments value={data.reminderMinutes} options={DELAYS.map(minutes => ({ value: minutes, label: `${minutes} daq.` }))} onChange={setReminderMinutes} />
          <Text style={styles.rowSubtitle}>{Platform.OS === 'android' ? 'Eslatmalar 30 kun uchun saqlanadi. Ilovani ochganingizda jadval yangilanadi. Ovozsiz rejim yoqilgan bo‘lsa, savol rejim tugagandan keyin keladi.' : 'Namoz vaqti eslatmalari 7 kun, namozdan keyingi savollar 3 kun uchun saqlanadi. Ilovani ochganingizda jadval yangilanadi.'}</Text></> : null}
        {panel === 'ios-setup' ? <IPhoneSetupGuide expoGo={expoGo} onVibrationTest={previewVibration} /> : null}
        {panel === 'delivery' ? <>
          <SettingsCard title="Bildirishnoma ruxsatlari">
            <SettingsStatus label="Bildirishnomalar" value={delivery?.allowed ?? null} unavailable={deliveryError} />
            <SettingsStatus label="Pop-up bildirishnomalar" value={delivery?.popup ?? null} unavailable={deliveryError} />
            {Platform.OS === 'ios' ? <>
              <SettingsStatus label="Bildirishnoma ovozi" value={delivery?.sound ?? null} unavailable={deliveryError} />
              <SettingsStatus label="Qulf ekranida ko‘rsatish" value={delivery?.lockScreen ?? null} unavailable={deliveryError} />
            </> : null}
            <NativeAction appearance="minimal" label="Telefon sozlamalarini ochish" onPress={() => void Linking.openSettings()} />
          </SettingsCard>
          {deliveryError ? <SettingsCard><SettingsNotice warning>Ruxsatlarni tekshirib bo‘lmadi. Qayta urinib ko‘ring.</SettingsNotice><NativeAction appearance="minimal" label="Yangilash" onPress={() => setDeliveryRevision(value => value + 1)} /></SettingsCard> : null}
          <SettingsNotice>Ruxsat berishdan tashqari, kerakli funksiyaning tugmasi ham yoqilgan bo‘lishi kerak.</SettingsNotice>
          {Platform.OS === 'ios' ? <>
            {delivery?.warnings.map(warning => <SettingsNotice key={warning} warning>{warning}</SettingsNotice>)}
            <SettingsCard title="Vibratsiya, chiroq va Focus">
              <NativeAction appearance="minimal" label="Vibratsiya va chiroqni sozlash" onPress={() => setPanel('ios-setup')} />
              <NativeAction appearance="minimal" label="Vibratsiyani tekshirish" onPress={previewVibration} />
            </SettingsCard>
          </> : null}
          {Platform.OS === 'android' ? <SettingsDisclosure title="Qo‘shimcha tekshiruvlar">
          {Platform.OS === 'android' ? <><View style={styles.row}><Text style={styles.rowTitle}>Aniq vaqt ruxsati</Text><View style={styles.rowCopy} /><Text style={styles.rowSubtitle}>{delivery?.native?.exactAlarmAccess ? 'Ruxsat berilgan' : 'Ruxsat kerak'}</Text></View><View style={styles.row}><Text style={styles.rowTitle}>Bezovta qilmang ruxsati</Text><View style={styles.rowCopy} /><Text style={styles.rowSubtitle}>{delivery?.native?.dndAccess ? 'Ruxsat berilgan' : 'Ruxsat kerak'}</Text></View></> : null}
          {Platform.OS === 'android' ? <><View style={styles.row}><Text style={styles.rowTitle}>Eslatma oynasi ruxsati</Text><View style={styles.rowCopy} /><Text style={styles.rowSubtitle}>{delivery?.native?.reminderPopupAccess ? 'Ruxsat berilgan' : 'Ruxsat kerak'}</Text></View><NativeAction appearance="minimal" label="Eslatma oynasini sozlash" onPress={() => focusControl?.openReminderPopupSettings()} variant="outlined" /></> : null}
          {Platform.OS === 'android' ? <>
            <View style={styles.row}><Text style={styles.rowTitle}>Eslatma chirog‘i</Text><View style={styles.rowCopy} /><Text style={styles.rowSubtitle}>{!delivery?.native?.flashlightPresent ? 'Mavjud emas' : delivery.native.flashlightPermission ? 'Ruxsat berilgan' : 'Ruxsat kerak'}</Text></View>
            {!delivery?.native?.flashlightPermission && delivery?.native?.flashlightPresent ? <NativeAction appearance="minimal" label="Chiroq uchun ruxsat berish" onPress={() => { void ensureReminderFlashAccess(t).then(() => setDeliveryRevision(value => value + 1)); }} variant="outlined" /> : null}
            <Text style={styles.rowSubtitle}>Eslatma kelganda telefon 10 soniya tebranadi va chiroq miltillaydi. Yopish tugmasi ikkalasini ham to‘xtatadi.</Text>
            {delivery?.native?.flashlightError ? <Text style={[styles.rowSubtitle, { color: colors.red }]}>{delivery.native.flashlightError}</Text> : null}
            {delivery?.native?.screenWakeError ? <Text style={[styles.rowSubtitle, { color: colors.red }]}>{delivery.native.screenWakeError}</Text> : null}
            <View style={styles.row}><Text style={styles.rowTitle}>Vibratsiya motori</Text><View style={styles.rowCopy} /><Text style={styles.rowSubtitle}>{delivery?.native?.vibratorPresent ? 'Mavjud' : 'Aniqlanmagan'}</Text></View>
            <View style={styles.row}><Text style={styles.rowTitle}>Telefonning jim holati</Text><View style={styles.rowCopy} /><Text style={styles.rowSubtitle}>{delivery?.native?.interruptionFilter === 3 ? 'Mutlaqo jim' : delivery?.native?.interruptionFilter === 4 ? 'Alarmga ruxsat bor' : delivery?.native?.interruptionFilter === 2 ? 'Tanlangan eslatmalar' : 'O‘chirilgan'}</Text></View>
            <Text style={styles.rowSubtitle}>Eslatma versiyasi: {delivery?.native?.reminderEngineVersion ?? 3}</Text>
            {delivery?.native?.lastVibrationRequestAt ? <Text style={styles.rowSubtitle}>Oxirgi vibratsiya buyrug‘i: {new Date(delivery.native.lastVibrationRequestAt).toLocaleTimeString()}</Text> : null}
            {delivery?.native?.vibrationError ? <Text style={[styles.rowSubtitle, { color: colors.red }]}>{delivery.native.vibrationError}</Text> : null}
            {delivery?.native?.interruptionFilter === 3 ? <Text style={[styles.rowSubtitle, { color: colors.red }]}>“Mutlaqo jim” rejimi vibratsiyani ham bloklaydi.</Text> : null}
            <NativeAction appearance="minimal" label="Vibratsiyani tekshirish" onPress={previewVibration} variant="outlined" />
          </> : null}
          </SettingsDisclosure> : null}
          <SettingsCard title="Eslatmalar jadvali">
          <Text style={styles.rowTitle}>{reminderPlan.busy ? 'Jadval yangilanmoqda…' : `${reminderPlan.count} ta eslatma rejalashtirilgan`}</Text>
          {reminderPlan.nextAt ? <Text style={styles.rowSubtitle}>Keyingi eslatma: {new Date(reminderPlan.nextAt).toLocaleString()}</Text> : null}
          </SettingsCard>
          {Platform.OS === 'android' ? <SettingsDisclosure title="Batafsil holat">
          {Platform.OS === 'android' ? <Text style={styles.rowSubtitle}>{data.prayerAutoQuiet ? `Ovozsiz rejim: yoqilgan · ${delivery?.native?.prayerWindowCount ?? 0} ta namoz vaqti` : 'Namoz vaqtida ovozsiz rejim: o‘chirilgan'}</Text> : null}
          {Platform.OS === 'android' ? <>
            <Text style={styles.rowSubtitle}>{delivery?.native?.ringerMode === 0 ? 'Telefon ovozi: ovozsiz' : delivery?.native?.ringerMode === 1 ? 'Telefon ovozi: tebranish' : 'Telefon ovozi: yoqilgan'}</Text>
            <Text style={styles.rowSubtitle}>{data.mosqueAutoQuiet ? delivery?.native?.mosqueInside ? 'Masjid hududi: ichkarida' : 'Masjid hududi: kirish kutilmoqda' : 'Masjid hududida ovozsiz rejim: o‘chirilgan'}</Text>
            {delivery?.native?.mosqueQuietError ? <Text style={[styles.rowSubtitle, { color: colors.red }]}>{delivery.native.mosqueQuietError}</Text> : null}
            <NativeAction appearance="minimal" label="Ovozsiz rejimni tekshirish · 15 soniya" onPress={() => void previewQuiet()} variant="outlined" />
            <NativeAction appearance="minimal" label="Ekran qulflanganda ovozsiz rejim sinovi" onPress={() => void previewScheduledQuiet()} variant="outlined" />
            <NativeAction appearance="minimal" label="Fon sinovini to‘xtatish" onPress={() => { focusControl?.cancelQuietPreview(); setDeliveryRevision(value => value + 1); }} variant="outlined" />
            <NativeAction appearance="minimal" label="Diagnostikani nusxalash" onPress={() => void copyDiagnostics()} variant="outlined" />
          </> : null}
          </SettingsDisclosure> : null}
          {reminderPlan.error || delivery?.native?.quietError ? <SettingsNotice warning>{reminderPlan.error ?? delivery?.native?.quietError}</SettingsNotice> : null}
          <SettingsCard title="Sinab ko‘rish">
          <NativeAction appearance="minimal" label="Sinov bildirishnomasi" onPress={() => void sendReminderPreview()} />
          <Text style={styles.rowSubtitle}>{Platform.OS === 'ios' ? 'Sinov eslatmasi 10 soniyadan keyin keladi. iPhone’ni qulflab tekshiring. Focus rejimi bildirishnomani cheklashi mumkin.' : 'Sinov eslatmasi 10 soniyadan keyin keladi. Bezovta qilmang rejimi pop-up va ovozni cheklaydi.'}</Text>
          </SettingsCard>
          {focusControl ? <SettingsDisclosure title="Ruxsatlar va batareya"><NativeAction appearance="minimal" label="Aniq vaqt ruxsatini sozlash" onPress={() => focusControl?.openExactAlarmSettings()} variant="outlined" /><NativeAction appearance="minimal" label="Ovozsiz rejim ruxsatini sozlash" onPress={() => focusControl?.openDndSettings()} variant="outlined" /><NativeAction appearance="minimal" label="Batareya cheklovlarini sozlash" onPress={() => { void showReminderBatteryGuide(t); }} variant="outlined" /><Text style={styles.rowSubtitle}>{reminderBatteryInstructions(delivery?.native ?? null)}</Text>{needsManufacturerBatterySetup(delivery?.native ?? null) ? <Text style={styles.rowSubtitle}>Qulf ekranida ko‘rsatish va fonda qalqib chiquvchi oynalar ruxsatini ham yoqing.</Text> : null}</SettingsDisclosure> : null}
        </> : null}
        {panel === 'language' ? <>
          <NativeSelect value={language} options={LANGUAGES.map(item => ({ value: item.id, label: item.name }))}
            onChange={value => { void setLanguage(value); }} translate={false} />
          <Text style={styles.rowTitle}>Arabcha matn o‘lchami</Text>
          <NativeSegments value={data.arabicFontSize} options={[{ label: 'Kichik', value: 20 }, { label: 'O‘rta', value: 23 }, { label: 'Katta', value: 28 }]} onChange={setArabicFontSize} />
          <Text style={{ color: colors.green, fontSize: data.arabicFontSize, lineHeight: data.arabicFontSize * 1.8, textAlign: 'center' }}>رَبِّ زِدْنِي عِلْمًا</Text>
        </> : null}
    </NativeSheet>
    <ProfileNameSheet visible={nameEditorOpen} name={data.displayName} onSave={setDisplayName} onClose={() => setNameEditorOpen(false)} />
  </>;
}

const baseStyles = StyleSheet.create({
  screen: { backgroundColor: '#FAF9F5' },
  content: { gap: 24 },
  card: { borderRadius: 24, padding: 16, backgroundColor: '#FFFFFF', gap: 16, shadowColor: '#064E3B', shadowOpacity: 0.04, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } },
  batteryCard: { gap: 10 },
  identityCard: { borderRadius: 28, padding: 20, overflow: 'hidden', gap: 24 },
  identityGlow: { position: 'absolute', top: -70, right: -65, width: 170, height: 170, borderRadius: 85, backgroundColor: '#6CF8BB14' },
  identityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarWrap: { width: 64, height: 64 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#006C49', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#B0F0D650' },
  initials: { color: '#FFFFFF', fontSize: 23, fontWeight: '600' },
  verified: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  identityCopy: { flex: 1, minWidth: 0, paddingTop: 3, gap: 6 },
  identityTitle: { color: '#1B1C1A', fontSize: 18, lineHeight: 24, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  identitySubtitle: { flex: 1, color: '#404944', fontSize: 12, lineHeight: 17 },
  metrics: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, minWidth: 0, minHeight: 64, borderRadius: 16, padding: 10, backgroundColor: '#F4F4F0', flexDirection: 'row', alignItems: 'center', gap: 9 },
  metricIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#B0F0D6', alignItems: 'center', justifyContent: 'center' },
  metricIconMissed: { backgroundColor: '#FFDAD6' },
  metricCopy: { flex: 1 },
  metricValue: { color: '#064E3B', fontSize: 18, fontWeight: '600', lineHeight: 21 },
  metricValueMissed: { color: '#BA1A1A' },
  metricLabel: { color: '#404944', fontSize: 9, lineHeight: 12, marginTop: 3 },
  section: { gap: 10 },
  sectionTitle: { ...Typography.sectionTitle, color: '#1B1C1A' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  iconBox: { width: 40, height: 40, borderRadius: 15, backgroundColor: '#D5F8E7', alignItems: 'center', justifyContent: 'center' },
  neutralIcon: { backgroundColor: '#EFEEEA' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#1B1C1A', fontSize: 14, fontWeight: '600', lineHeight: 19 },
  rowSubtitle: { color: '#404944', fontSize: 12, lineHeight: 17, marginTop: 1 },
  switchHost: { width: 48, height: 30, transform: [{ scale: 0.82 }], alignItems: 'center', justifyContent: 'center' },
  donationCard: { borderRadius: 28, padding: 24, backgroundColor: '#003527', overflow: 'hidden', gap: 18, shadowColor: '#064E3B', shadowOpacity: 0.16, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  donationGlow: { position: 'absolute', right: -70, top: -70, width: 190, height: 190, borderRadius: 100, backgroundColor: '#6FFBBE14' },
  donationHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  donationIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#4EDEA330', alignItems: 'center', justifyContent: 'center' },
  donationTitle: { flex: 1, color: '#FFFFFF', fontSize: 18, lineHeight: 24, fontWeight: '600' },
  donationBadge: { color: '#6FFBBE', fontSize: 9, fontWeight: '600', backgroundColor: '#FFFFFF20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  donationBody: { color: '#95D3BA', fontSize: 14, lineHeight: 23 },
  bankCard: { borderRadius: 16, backgroundColor: '#FFFFFF18', padding: 14, gap: 13 },
  bankHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between' },
  bankBadge: { color: '#FFFFFF', fontSize: 10, fontWeight: '700', backgroundColor: '#FFFFFF25', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden' },
  cardHolder: { flex: 1, color: '#95D3BA', fontSize: 9, textAlign: 'right' },
  bankNumberRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bankCaption: { color: '#95D3BA', fontSize: 9 },
  bankNumber: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', letterSpacing: 0.6, marginTop: 3 },
  supportDetails: { borderTopWidth: 1, borderTopColor: '#FFFFFF20', paddingTop: 14, gap: 8 },
  supportDescription: { color: '#95D3BA', fontSize: 12, lineHeight: 20 },
  footer: { alignItems: 'center', gap: 5, paddingVertical: 16 },
  footerTitle: { color: '#404944', fontSize: 12, fontWeight: '600' },
  footerVersion: { color: '#707974', fontSize: 10 },
  callEntry: { gap: 3, paddingVertical: 6 },
});
