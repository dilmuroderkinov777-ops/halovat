import { useThemedStyles, useThemeColors } from '../../../ui/useAppTheme';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router, useIsFocused } from 'expo-router';
import { ArrowUpRight, CalendarDays, Clock3 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Image, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { Text } from '../../../ui/AppText';
import { NativeAction } from '../../../components/NativeAction';
import { PrayerCheckinSheet } from '../../../components/PrayerCheckinSheet';
import { PrayerTimeCard } from '../../../components/PrayerTimeCard';
import { NativeCountdown } from '../../../components/NativeCountdown';
import { Screen } from '../../../components/Screen';
import { useAppLoading } from '../../../context/LaunchAnimationContext';
import { useHalovat } from '../../../context/AppContext';
import { useLanguage } from '../../../context/LanguageContext';
import { PRAYER_HERO } from '../../../data/prayerHero';
import { dateKey, formatTime, formatUzDate, prayerKey, PrayerStatus } from '../../../domain/prayers';
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
  const { t } = useLanguage();
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
  const hero = PRAYER_HERO[currentPrayer?.id ?? 'isha'];

  const latestDue = [...prayers].reverse().find(prayer => liveNow.getTime() >= prayer.at.getTime() + Math.max(data.reminderMinutes, data.prayerAutoQuiet ? 26 : 0) * 60_000);
  const dueKey = latestDue ? prayerKey(today, latestDue.id) : undefined;
  const duePrayer = Platform.OS !== 'android' && data.reminderEnabled && latestDue && dueKey && !data.prayerStatus[dueKey] && !dismissedPrayers.includes(dueKey) ? latestDue : undefined;
  const answerCheckin = (status: PrayerStatus) => {
    if (!duePrayer) return;
    const key = prayerKey(today, duePrayer.id);
    setPrayerStatus(today, duePrayer.id, status);
    setDismissedPrayers(current => [...current, key]);
  };
  return <Screen contentStyle={styles.content}>
    <View style={styles.dateSection}>
      <View style={styles.infoPills}>
        <View style={styles.datePill}><CalendarDays size={14} color={Colors.green} /><Text style={styles.dateText}>{hijriDate(today)}</Text></View>
        <View style={styles.nowPill}><View style={styles.liveDot} /><Text style={styles.nowText}>Hozir: <Text style={styles.nowStrong}>{currentPrayer?.name ?? 'Bomdod'}</Text></Text></View>
      </View>
      <View style={styles.greeting}><Text style={styles.greetingTitle}>Assalomu alaykum</Text><Text style={styles.greetingSub}>Halovat bilan har kun ibodatda</Text></View>
    </View>

    <LinearGradient colors={hero.colors} start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
      <View pointerEvents="none" style={[styles.heroGlowTop, { backgroundColor: hero.accent + '18' }]} /><View pointerEvents="none" style={[styles.heroGlowBottom, { backgroundColor: hero.accent + '12' }]} />
      <View style={styles.heroHead}>
        <View style={styles.heroPill}><Clock3 size={13} color={hero.accent} /><Text style={[styles.heroPillText, { color: hero.accent }]}>Keyingi namoz: <Text style={styles.heroPillStrong}>{nextPrayer.name}</Text></Text></View>
      </View>
      <View style={styles.heroBody}>
        <View style={styles.countdownBlock}>
          <NativeCountdown until={nextAt.getTime()} onComplete={refreshCountdown} labelColor={hero.accent} />
        </View>
        <Image key={currentPrayer?.id ?? 'isha'} accessible={false} source={hero.image} resizeMode="contain" style={styles.heroArt} />
      </View>
      <View style={styles.progressArea}>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { backgroundColor: hero.accent, width: `${Math.round(progress * 100)}%` }]} /></View>
        <View style={styles.progressMeta}><Text style={[styles.progressLabel, { color: hero.accent }]}>{currentPrayer?.name ?? 'Namoz'} vaqti</Text><Text style={styles.progressTime}>{formatTime(nextAt)} gacha</Text></View>
      </View>
    </LinearGradient>

    <View style={styles.prayerSection}>
      <Text style={styles.sectionTitle}>Bugungi namoz vaqtlari</Text>
      <View style={styles.prayerRow}>
        {prayers.map(prayer => <PrayerTimeCard key={prayer.id} prayer={prayer} day={today}
          status={data.prayerStatus[prayerKey(today, prayer.id)]} active={prayer.id === currentPrayer?.id}
          onToggle={togglePrayerStatus} />)}
      </View>
    </View>

    <View style={styles.sectionCards}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Duolar')}
        onPress={() => router.navigate('/duas')}
        style={({ pressed }) => [styles.sectionCard, pressed && styles.pressed]}>
        <LinearGradient pointerEvents="none" colors={['#BFF1DB', '#77D3AF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sectionCardFill}>
          <View style={styles.sectionCardHeading}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.sectionCardTitle}>Duolar</Text><ArrowUpRight size={18} color="#064E3B" /></View>
          <View style={styles.sectionCardHalo} />
          <Image accessible={false} source={require('../../../../assets/home-cards/duas-3d.png')} resizeMode="contain" style={styles.sectionCardArt} />
        </LinearGradient>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t('Masjidlar')}
        onPress={() => router.navigate('/mosque')}
        style={({ pressed }) => [styles.sectionCard, pressed && styles.pressed]}>
        <LinearGradient pointerEvents="none" colors={['#FFDBB7', '#F2AD7C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sectionCardFill}>
          <View style={styles.sectionCardHeading}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.sectionCardTitle}>Masjidlar</Text><ArrowUpRight size={18} color="#064E3B" /></View>
          <View style={styles.sectionCardHalo} />
          <Image accessible={false} source={require('../../../../assets/home-cards/mosque-3d.png')} resizeMode="contain" style={styles.sectionCardArt} />
        </LinearGradient>
      </Pressable>
    </View>

    <View style={styles.verseCard}>
      <View style={styles.verseHeader}><Text style={styles.verseTitle}>Kun hikmati</Text><NativeAction label="Ulashish" compact variant="text" onPress={() => void Share.share({ message: '“Ogoh bo‘lingizkim, Allohning zikri ila qalblar orom olur.” — Ra’d surasi, 28-oyat' })} /></View>
      <Text style={styles.arabicVerse}>أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ</Text>
      <View style={styles.translation}><Text style={styles.translationText}>“Ogoh bo‘lingizkim, Allohning zikri ila qalblar orom olur.”</Text><Text style={styles.verseSource}>Ra’d surasi, 28-oyat</Text></View>
    </View>

    {duePrayer && focused && !appLoading ? <PrayerCheckinSheet prayerName={duePrayer.name} onChoose={answerCheckin} onClose={() => setDismissedPrayers(current => [...current, prayerKey(today, duePrayer.id)])} /> : null}
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
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroArt: { width: '32%', aspectRatio: 1 },
  countdownBlock: { flex: 1, minWidth: 0, paddingVertical: 3 },
  progressArea: { gap: 8 },
  progressTrack: { height: 6, borderRadius: 4, backgroundColor: '#00000026', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#6FFBBE' },
  progressMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  progressLabel: { color: '#B0F0D6', fontSize: 10, flexShrink: 1 },
  progressTime: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
  prayerSection: { gap: 10 },
  sectionTitle: { ...Typography.sectionTitle, color: Colors.ink },
  prayerRow: { flexDirection: 'row', gap: 6 },
  sectionCards: { flexDirection: 'row', gap: 12 },
  sectionCard: { flex: 1, aspectRatio: 1, borderRadius: 24, overflow: 'hidden' },
  sectionCardFill: { flex: 1, padding: 16 },
  sectionCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 1 },
  sectionCardTitle: { flex: 1, color: '#073E30', fontSize: 17, fontWeight: '700' },
  sectionCardHalo: { position: 'absolute', width: '90%', aspectRatio: 1, borderRadius: 200, bottom: '-30%', right: '-22%', backgroundColor: '#FFFFFF24' },
  sectionCardArt: { position: 'absolute', width: '112%', height: '96%', right: '-9%', bottom: '-12%' },
  pressed: { opacity: 0.86, transform: [{ scale: 0.99 }] },
  verseCard: { borderRadius: 23, padding: 16, backgroundColor: '#FFFFFF', gap: 12, borderWidth: 1, borderColor: '#F0F0EB' },
  verseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  verseTitle: { color: Colors.ink, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  arabicVerse: { color: Colors.ink, fontSize: 21, lineHeight: 37, textAlign: 'right' },
  translation: { borderRadius: 16, padding: 13, gap: 7, backgroundColor: '#F4F4F0' },
  translationText: { color: Colors.body, fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  verseSource: { color: Colors.muted, fontSize: 10 },
});
