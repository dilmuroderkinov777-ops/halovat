import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useState } from 'react';
import { Platform, View } from 'react-native';
import { LanguageProvider } from '../context/LanguageContext';
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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, Onest_400Regular, Onest_500Medium, Onest_600SemiBold, Onest_700Bold, Onest_800ExtraBold });
  const [appReady, setAppReady] = useState(false);
  const { visible: loading, revision, onFinished } = useLaunchAnimation();
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
      {loading && <LoadingScreen key={revision} fontsReady={fontsReady} appReady={appReady} onFinished={onFinished} onReady={revealLoading} />}
    </View></LaunchAnimationContext.Provider>
  );
}

function RootNavigator({ onReady, loading }: { onReady: () => void; loading: boolean }) {
  const { hydrated, data } = useHalovat();

  if (!hydrated) return null;

  return <View style={{ flex: 1 }} onLayout={onReady}>
    <StatusBar style={loading || data.darkMode ? 'light' : 'dark'} />
    <Stack screenOptions={{ headerShown: false, animation: 'fade', contentStyle: { backgroundColor: data.darkMode ? '#0E1914' : '#FAF9F5' } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
      <Stack.Screen name="prayer-mode" options={{ animation: 'fade' }} />
    </Stack>
  </View>;
}
