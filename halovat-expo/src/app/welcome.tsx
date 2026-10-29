import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, BackHandler, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeAction } from '../components/NativeAction';
import { OnboardingArt } from '../components/OnboardingArt';
import { LanguageSelection } from '../components/LanguageSelection';
import { useLanguage } from '../context/LanguageContext';
import type { AppLanguage } from '../data/languages';
import { useHalovat } from '../context/AppContext';
import { WELCOME_PAGES } from '../data/welcome';
import { Text } from '../ui/AppText';

export default function WelcomeScreen() {
  const { setOnboardingComplete } = useHalovat();
  const { setLanguage, t } = useLanguage();
  const { width, height, fontScale } = useWindowDimensions();
  const desktop = width > 430;
  const frameWidth = desktop ? 390 : width;
  const [page, setPage] = useState(0);
  const [languageStep, setLanguageStep] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [contentHeight, setContentHeight] = useState(height);
  const [pageHeight, setPageHeight] = useState(Math.max(240, height - 180));
  const scroll = useRef<ScrollViewInstance>(null);
  const pageRef = useRef(page);
  const finishing = useRef(false);

  useEffect(() => { pageRef.current = page; }, [page]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (mounted) setReducedMotion(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => { mounted = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    scroll.current?.scrollTo({ x: pageRef.current * frameWidth, animated: false });
  }, [frameWidth]);

  const changePage = (index: number) => {
    const next = Math.max(0, Math.min(WELCOME_PAGES.length - 1, index));
    setPage(next);
    scroll.current?.scrollTo({ x: next * frameWidth, animated: !reducedMotion });
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (busy) return true;
      if (languageStep) return false;
      if (page === 0) { setLanguageStep(true); return true; }
      setPage(page - 1);
      scroll.current?.scrollTo({ x: (page - 1) * frameWidth, animated: !reducedMotion });
      return true;
    });
    return () => subscription.remove();
  }, [busy, frameWidth, page, reducedMotion, languageStep]);

  const continueWithLanguage = async (language: AppLanguage) => {
    if (busy) return;
    setBusy(true);
    await setLanguage(language);
    setPage(0);
    setLanguageStep(false);
    setBusy(false);
  };

  const finish = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setBusy(true);
    await setOnboardingComplete(true);
    router.replace('/(tabs)');
  };

  return <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.safe, desktop && styles.desktop]}>
    <StatusBar style="dark" />
    <View onLayout={event => setContentHeight(event.nativeEvent.layout.height)} style={[styles.frame, { width: frameWidth }, desktop && { maxHeight: Math.min(844, height - 32), borderRadius: 38, marginVertical: 16 }]}>
      {languageStep ? <LanguageSelection compact={contentHeight < 700} reducedMotion={reducedMotion} busy={busy} onContinue={continueWithLanguage} /> : <>
      <ScrollView ref={scroll} horizontal pagingEnabled bounces={false} scrollEnabled={!busy} showsHorizontalScrollIndicator={false} style={styles.pages}
        onLayout={event => setPageHeight(event.nativeEvent.layout.height)}
        onMomentumScrollEnd={event => setPage(Math.max(0, Math.min(WELCOME_PAGES.length - 1, Math.round(event.nativeEvent.contentOffset.x / frameWidth))))}>
        {WELCOME_PAGES.map((item, index) => <WelcomePage key={item.title} index={index} width={frameWidth} height={pageHeight} compact={contentHeight < 700} largeText={fontScale > 1.25} active={index === page} reducedMotion={reducedMotion} />)}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.beads} accessibilityLabel={`${page + 1} / ${WELCOME_PAGES.length}`}>
          <View style={styles.thread} />
          {WELCOME_PAGES.map((item, index) => <Pressable key={item.title} accessibilityRole="button" accessibilityLabel={`${index + 1}. ${t(item.title)}`} accessibilityState={{ selected: page === index, disabled: busy }}
            hitSlop={{ top: 12, bottom: 12, left: 3, right: 3 }} disabled={busy} onPress={() => changePage(index)}
            style={[styles.bead, index < page && styles.beadDone, index === page && styles.beadActive]} />)}
        </View>
        <NativeAction label={page === WELCOME_PAGES.length - 1 ? 'Boshlash' : 'Keyingisi'} onPress={() => page === WELCOME_PAGES.length - 1 ? void finish() : changePage(page + 1)} compact variant="filled" colorScheme="light" disabled={busy} />
      </View>
      </>}
    </View>
  </SafeAreaView>;
}

function WelcomePage({ index, width, height, active, compact, largeText, reducedMotion }: { index: number; width: number; height: number; active: boolean; compact: boolean; largeText: boolean; reducedMotion: boolean }) {
  // Use the same artwork height on every page so copy length cannot move the title.
  const artHeight = Math.max(120, Math.min(largeText ? 230 : 300, height * 0.45));
  const item = WELCOME_PAGES[index];
  const description = Platform.OS === 'ios' && index === 0
    ? 'Halovat namoz vaqtini eslatadi. iPhone’da ovozsiz rejimni Focus orqali yoqing va halovat bilan ibodat qiling.'
    : Platform.OS === 'ios' && index === 5
      ? 'Masjidda chalg‘imasdan ibodat qilish uchun iPhone’da Focus rejimini yoqing. Bu rejim iPhone sozlamalaridan boshqariladi.'
      : item.description;
  return <View style={[styles.slide, { width }]} accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={styles.slideContent}
      onMomentumScrollEnd={event => event.stopPropagation()}>
      <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.art, { height: artHeight }]}>
        <OnboardingArt page={index} width={width - 56} height={artHeight} active={active} reducedMotion={reducedMotion} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle]}>{item.title}</Text>
      <Text style={styles.description}>{description}</Text>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FAF9F5', alignItems: 'center' },
  desktop: { backgroundColor: '#DDDBD6' },
  frame: { flex: 1, backgroundColor: '#FAF9F5', overflow: 'hidden' },
  pages: { flex: 1 },
  slide: { height: '100%' },
  slideContent: { flexGrow: 1, paddingHorizontal: 28 },
  art: { justifyContent: 'center', alignItems: 'center' },
  title: { color: '#064E3B', fontSize: 30, lineHeight: 34.5, fontWeight: '700', letterSpacing: -0.9, marginBottom: 12 },
  compactTitle: { fontSize: 27, lineHeight: 31.05, letterSpacing: -0.81 },
  description: { color: '#3E4540', fontSize: 15, lineHeight: 23.25, maxWidth: 322, marginBottom: 22 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingBottom: 26 },
  beads: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  thread: { position: 'absolute', height: 1, backgroundColor: '#C7EFDF', left: 4, right: 4 },
  bead: { width: 11, height: 11, borderRadius: 11, borderWidth: 1.5, borderColor: '#6ED3AC', backgroundColor: '#FAF9F5' },
  beadDone: { backgroundColor: '#6ED3AC' },
  beadActive: { width: 22, height: 22, backgroundColor: '#064E3B', borderColor: '#064E3B' },
});
