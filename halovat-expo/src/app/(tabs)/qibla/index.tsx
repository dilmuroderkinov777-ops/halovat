import { useThemedStyles } from '../../../ui/useAppTheme';
import { StyleSheet } from 'react-native';
import React from 'react';
import { QiblaCompass } from '../../../components/QiblaCompass';
import { Screen } from '../../../components/Screen';
import { useHalovat } from '../../../context/AppContext';

export default function QiblaScreen() {
  const styles = useThemedStyles(baseStyles);
  const { city } = useHalovat();

  return <Screen contentStyle={styles.content}>
    <QiblaCompass city={city} />
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
});
