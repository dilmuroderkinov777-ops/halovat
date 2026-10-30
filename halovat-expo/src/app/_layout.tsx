import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { LanguageProvider, useLanguage } from '../context/LanguageContext';
import { useThemeColors } from '../ui/useAppTheme';
import { useNativeHeaderOptions } from '../ui/useNativeHeaderOptions';
import { Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold } from '@expo-google-fonts/onest';
import { AppProvider, useHalovat } from '../context/AppContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { useLaunchAnimation } from '../hooks/useLaunchAnimation';
import { LaunchAnimationContext } from '../context/LaunchAnimationContext';
import { useFonts, PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans';

if (Platform.OS !== 'web') {
  void SplashScreen.preventAutoHideAsync().catch(() => undefined);
  SplashScreen.setOptions({ duration: 0, fade: false });
}

export const unstable_settings = { anchor: '(tabs)' };

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold });
  const [appReady, setAppReady] = useState(false);
  const { visible: loading, onFinished } = useLaunchAnimation();
  const fontsReady = fontsLoaded || Boolean(fontError);
  const handleReady = useCallback(() => setAppReady(true), []);
  const revealLoading = useCallback(() => { if (Platform.OS !== 'web') SplashScreen.hide(); }, []);
  return (
    <LaunchAnimationContext.Provider value={loading}><View style={{ flex: 1, backgroundColor: '#064e3b' }}>
      <View style={{ flex: 1 }} accessibilityElementsHidden={loading} importantForAccessibility={loading ? 'no-hide-descendants' : 'auto'}>
        {fontsReady && <LanguageProvider><AppProvider>
          <RootNavigator onReady={handleReady} loading={loading} />
        </AppProvider></LanguageProvider>}
      </View>
      {loading && <LoadingScreen fontsReady={fontsReady} appReady={appReady} onFinished={onFinished} onReady={revealLoading} />}
    </View></LaunchAnimationContext.Provider>
  );
}

function RootNavigator({ onReady, loading }: { onReady: () => void; loading: boolean }) {
  const { hydrated, data } = useHalovat();
  const colors = useThemeColors();
  const { t } = useLanguage();
  const screenOptions = useNativeHeaderOptions();
  const baseTheme = data.darkMode ? DarkTheme : DefaultTheme;
  const theme = { ...baseTheme, colors: { ...baseTheme.colors, primary: colors.green, background: colors.canvas, card: colors.paper, text: colors.ink, border: colors.line } };

  if (!hydrated) return null;

  return <ThemeProvider value={theme}><View style={{ flex: 1 }} onLayout={onReady}>
    <StatusBar style={loading || data.darkMode ? 'light' : 'dark'} />
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="welcome" options={{ title: 'Halovat', headerShown: false, animation: 'fade', headerBackVisible: false, headerTransparent: false, headerBlurEffect: undefined, scrollEdgeEffects: { top: 'hidden' }, headerStyle: { backgroundColor: '#FAF9F5' }, headerTintColor: '#064E3B', headerShadowVisible: false }} />
      <Stack.Screen name="duas" options={{ title: t('Kundalik duolar') }} />
      <Stack.Screen name="prayer-mode" options={{ title: t('Halovat vaqti'), headerTransparent: false, headerBlurEffect: undefined, scrollEdgeEffects: { top: 'hidden' }, headerStyle: { backgroundColor: '#00784B' }, headerTintColor: '#FFFFFF' }} />
    </Stack>
  </View></ThemeProvider>;
}
