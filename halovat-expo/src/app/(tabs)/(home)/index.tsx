import { useThemedStyles, useThemeColors } from '../../../ui/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useIsFocused } from 'expo-router';
import { CalendarDays, Check, ChevronRight, Clock3, Moon, Sparkles, Sun, Sunrise, Sunset, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from '../../../ui/AppText';
import { NativeAction } from '../../../components/NativeAction';
import { NativeSheet } from '../../../components/NativeSheet';
import { NativeCountdown } from '../../../components/NativeCountdown';
import { Screen } from '../../../components/Screen';
import { useAppLoading } from '../../../context/LaunchAnimationContext';
import { useHalovat } from '../../../context/AppContext';
import { dateKey, formatTime, formatUzDate, PrayerClock, prayerKey, PrayerStatus } from '../../../domain/prayers';
import { useForegroundClock } from '../../../hooks/useForegroundClock';
import { Colors, Typography } from '../../../ui/theme';

const HIJRI_MONTHS = ['Muharram', 'Safar', 'Rabi’ul avval', 'Rabi’us soni', 'Jumodul avval', 'Jumodul oxir', 'Rajab', 'Sha’bon', 'Ramazon', 'Shavvol', 'Zulqa’da', 'Zulhijja'];
function hijriDate(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(date);
    const day = Number(parts.find(part => part.type === 'day')?.value);
    const month = Number(parts.find(part => part.type === 'month')?.value);
    const year = Number(parts.find(part => part.type === 'year')?.value);
    if (day && month && year) return `${day} ${HIJRI_MONTHS[month - 1]}, ${year}-yil`;
  } catch { /* Fall back when an older device lacks the Islamic calendar. */ }
  return formatUzDate(date, true);
}

const prayerIcons = [Sunrise, Sun, Sun, Sunset, Moon];

function Checkin({ prayer, choose, close }: { prayer: PrayerClock; choose: (status: PrayerStatus) => void; close: () => void }) {
  const styles = useThemedStyles(baseStyles);
  return <NativeSheet visible onClose={close} title={`${prayer.name} namozini o‘qidingizmi?`} compact>
    <Text style={styles.modalCopy}>Javobingiz namozlar jadvaliga qo‘shiladi.</Text>
    <NativeAction label="Ha, o‘qidim" onPress={() => choose('done')} />
    <NativeAction label="Yo‘q, qazo bo‘ldi" variant="outlined" onPress={() => choose('missed')} />
    <NativeAction label="Keyinroq belgilayman" variant="text" onPress={close} />
  </NativeSheet>;
}

export default function HomeScreen() {
  const { hydrated, onboardingComplete } = useHalovat();
  if (!hydrated) return null;
  if (!onboardingComplete) return <Redirect href="/welcome" />;
  return <HomeContent />;
}

function HomeContent() {
  const focused = useIsFocused();
  const appLoading = useAppLoading();
  const styles = useThemedStyles(baseStyles);
  const Colors = useThemeColors();
  const { data, timesFor, togglePrayerStatus, setPrayerStatus } = useHalovat();
  const { now: liveNow, refresh: refreshCountdown } = useForegroundClock(15_000);
  const [dismissedPrayers, setDismissedPrayers] = useState<string[]>([]);
  const dayKey = dateKey(liveNow);
  const today = useMemo(() => new Date(`${dayKey}T00:00:00`), [dayKey]);
  const prayers = useMemo(() => timesFor(today), [timesFor, today]);
  const tomorrow = useMemo(() => new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), [today]);
  const tomorrowPrayers = useMemo(() => timesFor(tomorrow), [timesFor, tomorrow]);
  const nextPrayer = prayers.find(prayer => prayer.at > liveNow) ?? tomorrowPrayers[0];
  const nextAt = nextPrayer.at;
  const previousPrayer = [...prayers].reverse().find(prayer => prayer.at <= liveNow);
  const previousAt = previousPrayer?.at ?? new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, ...(() => {
    const yesterdayIsha = timesFor(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)).find(prayer => prayer.id === 'isha');
    return [yesterdayIsha?.at.getHours() ?? 21, yesterdayIsha?.at.getMinutes() ?? 0] as [number, number];
  })());
  const progress = Math.max(0, Math.min(1, (liveNow.getTime() - previousAt.getTime()) / Math.max(1, nextAt.getTime() - previousAt.getTime())));
  const currentPrayer = previousPrayer ?? timesFor(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)).find(prayer => prayer.id === 'isha');

  const latestDue = [...prayers].reverse().find(prayer => liveNow.getTime() >= prayer.at.getTime() + Math.max(data.reminderMinutes, data.prayerAutoQuiet ? 26 : 0) * 60_000);
  const dueKey = latestDue ? prayerKey(today, latestDue.id) : undefined;
  const duePrayer = Platform.OS !== 'android' && data.reminderEnabled && latestDue && dueKey && !data.prayerStatus[dueKey] && !dismissedPrayers.includes(dueKey) ? latestDue : undefined;
  const answerCheckin = (status: PrayerStatus) => {
    if (!duePrayer) return;
    const key = prayerKey(today, duePrayer.id);
    setPrayerStatus(today, duePrayer.id, status);
    setDismissedPrayers(current => [...current, key]);
  };
  const missedCount = Object.values(data.prayerStatus).filter(status => status === 'missed').length;

  return <Screen contentStyle={styles.content}>
    <View style={styles.dateSection}>
      <View style={styles.infoPills}>
        <View style={styles.datePill}><CalendarDays size={14} color={Colors.green} /><Text style={styles.dateText}>{hijriDate(today)}</Text></View>
        <View style={styles.nowPill}><View style={styles.liveDot} /><Text style={styles.nowText}>Hozir: <Text style={styles.nowStrong}>{currentPrayer?.name ?? 'Bomdod'}</Text></Text></View>
      </View>
      <View style={styles.greeting}><Text style={styles.greetingTitle}>Assalomu alaykum</Text><Text style={styles.greetingSub}>Halovat bilan har kun ibodatda <Sparkles size={14} color="#A06408" /></Text></View>
    </View>

    <LinearGradient colors={['#064E3B', '#003D2D', '#002C22']} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View pointerEvents="none" style={styles.heroGlowTop} /><View pointerEvents="none" style={styles.heroGlowBottom} />
      <View style={styles.heroHead}>
        <View style={styles.heroPill}><Clock3 size={13} color="#B0F0D6" /><Text style={styles.heroPillText}>Keyingi namoz: <Text style={styles.heroPillStrong}>{nextPrayer.name}</Text></Text></View>
        <View style={styles.heroIcon}>{nextPrayer.id === 'isha' ? <Moon size={19} color="#B0F0D6" /> : <Sun size={19} color="#B0F0D6" />}</View>
      </View>
      <View style={styles.countdownBlock}>
        <NativeCountdown until={nextAt.getTime()} onComplete={refreshCountdown} />
        <View style={styles.countdownLabels}><Text style={styles.countdownLabel}>SOAT</Text><Text style={styles.countdownLabel}>DAQIQA</Text><Text style={styles.countdownLabel}>SONIYA</Text></View>
      </View>
      <View style={styles.progressArea}>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
        <View style={styles.progressMeta}><Text style={styles.progressLabel}>{currentPrayer?.name ?? 'Namoz'} vaqti</Text><Text style={styles.progressTime}>{formatTime(nextAt)} gacha</Text></View>
      </View>
    </LinearGradient>

    <View style={styles.prayerSection}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Bugungi namoz vaqtlari</Text><NativeAction label="To‘liq taqvim" onPress={() => router.push('/(tabs)/tracker' as never)} compact variant="outlined" /></View>
      <View style={styles.prayerRow}>
        {prayers.map((prayer, index) => {
          const Icon = prayerIcons[index];
          const status = data.prayerStatus[prayerKey(today, prayer.id)];
          const active = prayer.id === currentPrayer?.id;
          const cardState = status === 'done' ? styles.prayerCardDone : status === 'missed' ? styles.prayerCardMissed : active ? styles.prayerCardActive : null;
          return <Pressable accessibilityLabel={`${prayer.name} ${formatTime(prayer.at)}${status === 'done' ? ', o‘qilgan' : status === 'missed' ? ', qazo' : active ? ', hozirgi namoz' : ''}`} key={prayer.id} onPress={() => togglePrayerStatus(today, prayer.id)} style={[styles.prayerCard, cardState]}>
            <Text numberOfLines={1} style={[styles.prayerName, active && !status && styles.prayerNameActive]}>{prayer.name}</Text>
            <Text style={[styles.prayerTime, active && styles.prayerTimeActive]}>{formatTime(prayer.at)}</Text>
            <View style={[styles.prayerStatus, status === 'done' ? styles.statusDone : status === 'missed' ? styles.statusMissed : active ? styles.statusActive : styles.statusDefault]}>
              {status === 'done' ? <Check size={13} color={Colors.green} strokeWidth={3} /> : status === 'missed' ? <X size={13} color="#FFFFFF" strokeWidth={3} /> : <Icon size={15} color={active ? '#FFFFFF' : prayer.color} strokeWidth={2} />}
            </View>
          </Pressable>;
        })}
      </View>
    </View>

    <View style={styles.verseCard}>
      <View style={styles.verseHeader}><View style={styles.verseTitleWrap}><View style={styles.verseMark}><Sparkles size={17} color="#875407" /></View><Text style={styles.verseTitle}>Kun hikmati</Text></View><NativeAction label="Ulashish" compact variant="text" onPress={() => void Share.share({ message: '“Ogoh bo‘lingizkim, Allohning zikri ila qalblar orom olur.” — Ra’d surasi, 28-oyat' })} /></View>
      <Text style={styles.arabicVerse}>أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</Text>
      <View style={styles.translation}><Text style={styles.translationText}>“Ogoh bo‘lingizkim, Allohning zikri ila qalblar orom olur.”</Text><Text style={styles.verseSource}>Ra’d surasi, 28-oyat</Text></View>
    </View>

    <Pressable onPress={() => router.push('/(tabs)/tracker' as never)} style={({ pressed }) => [styles.qazoCard, pressed && styles.pressed]}>
      <View style={styles.qazoIcon}><CalendarDays size={19} color="#FFFFFF" /></View>
      <View style={styles.qazoCopy}><Text style={styles.qazoTitle}>Qazo namozlari hisobi</Text><Text style={styles.qazoSubtitle}>{missedCount ? `Sizda ${missedCount} ta qazo namozi qayd etilgan` : 'Qazo qaydlari hozircha yo‘q'}</Text></View>
      <ChevronRight size={19} color={Colors.green} />
    </Pressable>
    {duePrayer && focused && !appLoading ? <Checkin prayer={duePrayer} choose={answerCheckin} close={() => setDismissedPrayers(current => [...current, prayerKey(today, duePrayer.id)])} /> : null}
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { gap: 18 },
  dateSection: { gap: 12, paddingTop: 1 },
  infoPills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  datePill: { minHeight: 29, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#EFEEEA', flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { color: Colors.body, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  nowPill: { minHeight: 29, borderRadius: 16, backgroundColor: '#E9E8E4', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.green },
  nowText: { color: Colors.body, fontSize: 10 },
  nowStrong: { color: Colors.ink, fontWeight: '700' },
  greeting: { gap: 3 },
  greetingTitle: { ...Typography.intro, color: Colors.ink },
  greetingSub: { color: Colors.muted, fontSize: 14, flexDirection: 'row', alignItems: 'center' },
  hero: { minHeight: 236, borderRadius: 26, padding: 24, justifyContent: 'space-between', overflow: 'hidden', elevation: 4, shadowColor: '#003527', shadowOpacity: 0.16, shadowRadius: 13, shadowOffset: { width: 0, height: 6 } },
  heroGlowTop: { position: 'absolute', width: 190, height: 190, borderRadius: 100, top: -117, right: -32, backgroundColor: '#27B27B24' },
  heroGlowBottom: { position: 'absolute', width: 150, height: 150, borderRadius: 100, bottom: -112, left: 32, backgroundColor: '#B0F0D610' },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroPill: { minHeight: 30, borderRadius: 18, paddingHorizontal: 11, backgroundColor: '#FFFFFF17', flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroPillText: { color: '#B0F0D6', fontSize: 11, fontWeight: '500' },
  heroPillStrong: { color: '#FFFFFF', fontWeight: '700' },
  heroIcon: { width: 39, height: 39, borderRadius: 20, backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center' },
  countdownBlock: { paddingVertical: 3 },
  countdownLabels: { flexDirection: 'row', gap: 26, paddingLeft: 2 },
  countdownLabel: { color: '#B0F0D6', fontSize: 11, letterSpacing: 0.65, fontWeight: '500' },
  progressArea: { gap: 8 },
  progressTrack: { height: 6, borderRadius: 4, backgroundColor: '#001D1680', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#6FFBBE' },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressLabel: { color: '#B0F0D6', fontSize: 10, flexShrink: 1 },
  progressTime: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  prayerSection: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { ...Typography.sectionTitle, color: Colors.ink },
  prayerRow: { flexDirection: 'row', gap: 6 },
  prayerCard: { flex: 1, minWidth: 0, height: 94, borderRadius: 17, backgroundColor: '#F4F4F0', paddingVertical: 9, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'space-between', borderColor: 'transparent', borderWidth: 1 },
  prayerCardActive: { backgroundColor: '#DDF8EB', borderColor: '#DDF8EB' },
  prayerCardDone: { backgroundColor: '#F4F4F0', borderColor: '#F4F4F0' },
  prayerCardMissed: { backgroundColor: '#FFF0ED', borderColor: '#F5C5C0' },
  prayerName: { color: Colors.body, fontSize: 10, fontWeight: '500' },
  prayerNameActive: { color: Colors.green, fontWeight: '700' },
  prayerTime: { color: Colors.ink, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  prayerTimeActive: { color: Colors.green },
  prayerStatus: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusDone: { backgroundColor: '#EFF2ED' },
  statusMissed: { backgroundColor: Colors.red },
  statusActive: { backgroundColor: '#006C49' },
  statusDefault: { backgroundColor: '#E9E8E4' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  verseCard: { borderRadius: 23, padding: 16, backgroundColor: '#FFFFFF', gap: 12, borderWidth: 1, borderColor: '#F0F0EB' },
  verseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verseTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verseMark: { width: 31, height: 31, borderRadius: 16, backgroundColor: '#FFF0D7', alignItems: 'center', justifyContent: 'center' },
  verseTitle: { color: Colors.ink, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  arabicVerse: { color: Colors.ink, fontSize: 21, lineHeight: 37, textAlign: 'right' },
  translation: { borderRadius: 16, padding: 13, gap: 7, backgroundColor: '#F4F4F0' },
  translationText: { color: Colors.body, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  verseSource: { color: Colors.muted, fontSize: 10 },
  qazoCard: { minHeight: 70, borderRadius: 19, paddingHorizontal: 13, paddingVertical: 12, backgroundColor: '#E8F4ED', flexDirection: 'row', alignItems: 'center', gap: 11 },
  qazoIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center' },
  qazoCopy: { flex: 1, gap: 3 },
  qazoTitle: { color: Colors.ink, fontSize: 13, fontWeight: '700' },
  qazoSubtitle: { color: Colors.body, fontSize: 10 },
  modalCopy: { color: Colors.body, fontSize: 13, marginBottom: 5 },
});
