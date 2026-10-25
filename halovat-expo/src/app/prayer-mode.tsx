import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams } from 'expo-router';
import { BellOff, VolumeX } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, PermissionsAndroid, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeAction } from '../components/NativeAction';
import { PRAYERS } from '../domain/prayers';
import { focusControl } from '../services/focusControl';

const SIZE = 252;
const RADIUS = 111;
const CIRC = 2 * Math.PI * RADIUS;

export default function PrayerModeScreen() {
  const params = useLocalSearchParams<{ prayer?: string }>();
  const prayer = PRAYERS.find(item => item.id === params.prayer) ?? PRAYERS[2];
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(true);
  const [quiet, setQuiet] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [permissionPending, setPermissionPending] = useState<'calls' | 'notifications' | null>(null);
  const finished = seconds === 0;
  const secondsRef = useRef(seconds);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);

  useEffect(() => {
    if (!running || finished) return;
    const deadline = Date.now() + secondsRef.current * 1000;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      secondsRef.current = remaining;
      setSeconds(remaining);
    };
    const timer = setInterval(update, 1000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); listener.remove(); };
  }, [running, finished]);

  useEffect(() => {
    const nativeFocus = focusControl;
    if (!nativeFocus) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active' || !permissionPending) return;
      const status = nativeFocus.getStatus();
      if (permissionPending === 'calls' && status.callScreeningRole) setQuiet(true);
      if (permissionPending === 'notifications' && status.dndAccess) setNotifications(true);
      setPermissionPending(null);
    });
    return () => subscription.remove();
  }, [permissionPending]);

  useEffect(() => {
    if (!focusControl) return;
    if (!running || finished || (!quiet && !notifications)) {
      focusControl.endQuietSession();
      return;
    }
    const result = focusControl.setQuietSession(secondsRef.current, quiet, notifications);
    if (!result.ok) {
      if (result.reason === 'call-screening-role') setQuiet(false);
      if (result.reason === 'contacts-access') setQuiet(false);
      if (result.reason === 'dnd-access') setNotifications(false);
      const message = result.reason === 'contacts-access'
        ? 'Barcha kiruvchi qo‘ng‘iroqlarni boshqarish uchun Halovat’ga kontaktlar ruxsatini bering.'
        : 'Tegishli Android ruxsatini bering va namoz rejimidagi kalitni qayta yoqing.';
      Alert.alert('Ruxsat kerak', message);
    }
  }, [quiet, notifications, running, finished]);

  useEffect(() => () => { focusControl?.endQuietSession(); }, []);

  const enableCallQuiet = async (enabled: boolean) => {
    if (!enabled) { setQuiet(false); return; }
    const nativeFocus = focusControl;
    if (!nativeFocus) {
      Alert.alert('Bu qurilmada qo‘llanmaydi', 'Qo‘ng‘iroqni avtomatik jim qilish Android’da qo‘llanadi. iPhone’da Focus rejimini Boshqaruv markazidan yoqing.');
      return;
    }
    const status = nativeFocus.getStatus();
    if (!status.callScreeningSupported) {
      Alert.alert('Android versiyasi qo‘llamaydi', 'Qo‘ng‘iroqni jim qilish uchun Android 10 yoki yangiroq kerak.');
      return;
    }
    const contactsGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_CONTACTS);
    if (!contactsGranted) {
      const permission = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_CONTACTS, {
        title: 'Qo‘ng‘iroqlarni tanish uchun kontaktlar ruxsati',
        message: 'Saqlangan kontaktlardan kelgan qo‘ng‘iroqlarni ham namoz paytida jim qilish uchun Android ushbu ruxsatni talab qiladi. Halovat kontaktlaringiz ro‘yxatini o‘qimaydi yoki saqlamaydi.',
        buttonPositive: 'Ruxsat berish',
        buttonNegative: 'Hozir emas',
      });
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        Alert.alert('Kontaktlar ruxsati berilmadi', 'Bu ruxsatsiz Android faqat kontaktlarda saqlanmagan raqamlarni uzatadi. Barcha kiruvchi qo‘ng‘iroqlarni jim qilish uchun ruxsatni Android sozlamalaridan yoqing.');
        return;
      }
    }
    if (status.callScreeningRole) { setQuiet(true); return; }
    Alert.alert(
      'Qo‘ng‘iroq ruxsati',
      'Android Halovat’ni qo‘ng‘iroqni aniqlash ilovasi sifatida tanlashni so‘raydi. Halovat namoz rejimida kiruvchi qo‘ng‘iroqni jim qiladi, rad etmaydi. Qo‘ng‘iroq vaqti hamda raqami qurilmada saqlanadi.',
      [
        { text: 'Hozir emas', style: 'cancel' },
        { text: 'Davom etish', onPress: () => {
          setPermissionPending('calls');
          if (!nativeFocus.requestCallScreeningRole()) {
            setPermissionPending(null);
            Alert.alert('Ruxsat oynasi ochilmadi', 'Android qurilmasida qo‘ng‘iroq filtrlash ruxsatini tekshiring.');
          }
        } },
      ],
    );
  };

  const enableNotificationQuiet = (enabled: boolean) => {
    if (!enabled) { setNotifications(false); return; }
    const nativeFocus = focusControl;
    if (!nativeFocus) {
      Alert.alert('Bu qurilmada qo‘llanmaydi', 'Ilovalararo bildirishnomalarni avtomatik jim qilish iPhone’da mavjud emas. iOS Focus rejimini qo‘lda yoqing.');
      return;
    }
    if (nativeFocus.getStatus().dndAccess) { setNotifications(true); return; }
    Alert.alert(
      'Bildirishnoma ruxsati',
      'Android sozlamasida Halovat’ga “Bezovta qilmang” ruxsatini bering. Yoqilganda telefon bo‘ylab bildirishnomalar jim bo‘ladi; namoz sessiyasi tugaganda avvalgi rejim tiklanadi.',
      [
        { text: 'Hozir emas', style: 'cancel' },
        { text: 'Sozlamalarni ochish', onPress: () => {
          setPermissionPending('notifications');
          if (!nativeFocus.openDndSettings()) setPermissionPending(null);
        } },
      ],
    );
  };

  const toggleRunning = () => setRunning(value => !value);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const progress = seconds / (25 * 60);

  return <LinearGradient colors={['#00784B', '#00553B', '#003C2F']} style={styles.safe}>
    <StatusBar style="light" />
    <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.center}>
      <Text style={styles.prayer}>{prayer.name} namozi</Text>
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#FFFFFF1D" strokeWidth="8" fill="none" />
          <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke="#85F4AC" strokeWidth="8" strokeLinecap="round" fill="none" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)} transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`} />
        </Svg>
        <View style={styles.timeCenter}><Text style={styles.time}>{mm}:{ss}</Text><Text style={styles.timeLabel}>daqiqa · soniya</Text></View>
      </View>
      <View style={styles.toggles}>
        <View style={styles.toggleTile}><View style={styles.toggleIcon}><VolumeX size={17} color="#E3F3EA" /></View><View style={{ flex: 1 }}><Text style={styles.toggleText}>Qo‘ng‘iroqlar jim</Text><Text style={styles.toggleSub}>kontaktlar bilan</Text></View><Switch value={quiet} onValueChange={value => void enableCallQuiet(value)} trackColor={{ true: '#6DE2A1', false: '#87958D' }} thumbColor="#FFFFFF" /></View>
        <View style={styles.toggleTile}><View style={styles.toggleIcon}><BellOff size={17} color="#E3F3EA" /></View><View style={{ flex: 1 }}><Text style={styles.toggleText}>Bildirishnomalar jim</Text><Text style={styles.toggleSub}>butun telefon</Text></View><Switch value={notifications} onValueChange={enableNotificationQuiet} trackColor={{ true: '#6DE2A1', false: '#87958D' }} thumbColor="#FFFFFF" /></View>
      </View>
      <Text style={styles.permissionHint}>{Platform.OS === 'android' ? 'Kontaktlar ruxsati barcha kiruvchi qo‘ng‘iroqlar uchun kerak. Tarix shu qurilmada saqlanadi.' : 'iPhone’da jim rejimni iOS Focus orqali qo‘lda boshqaring.'}</Text>
      <View style={styles.action}><NativeAction label={running ? 'Pauza' : 'Davom ettirish'} onPress={toggleRunning} variant="outlined" colorScheme="dark" /></View>
      <Text style={styles.footer}>Har bir namoz — qalbga yaqinlik</Text>
    </ScrollView>
    </SafeAreaView>
  </LinearGradient>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 12, paddingBottom: 18 },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 20 },
  prayer: { color: '#D4E9DD', fontSize: 16, marginTop: 4 },
  ringWrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', marginTop: 28, marginBottom: 22, shadowColor: '#72F4A0', shadowOpacity: 0.2, shadowRadius: 24 },
  timeCenter: { position: 'absolute', alignItems: 'center' },
  time: { color: '#FFFFFF', fontSize: 49, lineHeight: 56, fontWeight: '500', fontVariant: ['tabular-nums'], letterSpacing: -1 },
  timeLabel: { color: '#D4E9DD', fontSize: 11, marginTop: 3 },
  toggles: { width: '100%', flexDirection: 'row', gap: 9 },
  toggleTile: { flex: 1, minHeight: 65, borderRadius: 17, paddingHorizontal: 10, backgroundColor: '#FFFFFF1A', flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFFFFF16', alignItems: 'center', justifyContent: 'center' },
  toggleText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  toggleSub: { color: '#C5DDD1', fontSize: 8, marginTop: 2 },
  permissionHint: { color: '#C5DDD1', fontSize: 9, lineHeight: 13, textAlign: 'center', paddingHorizontal: 12, marginTop: 8 },
  footer: { color: '#C5DDD1', fontSize: 11, marginTop: 15 },
  action: { width: '100%', marginTop: 14 },
});
