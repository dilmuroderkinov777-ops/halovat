import { useThemedStyles } from '../../../ui/useAppTheme';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import React from 'react';
import { NativeAction } from '../../../components/NativeAction';
import { QiblaCompass } from '../../../components/QiblaCompass';
import { Screen } from '../../../components/Screen';
import { useHalovat } from '../../../context/AppContext';

export default function QiblaScreen() {
  const styles = useThemedStyles(baseStyles);
  const { city } = useHalovat();
  const openMosques = () => router.navigate('/(tabs)/qibla/mosque');

  return <Screen contentStyle={styles.content}>
    <QiblaCompass city={city} />
    <NativeAction label="Yaqin masjidlar" onPress={openMosques} large variant="filled" />
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { gap: 15 },
});
