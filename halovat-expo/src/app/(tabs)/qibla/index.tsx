import { useThemedStyles, useThemeColors } from '../../../ui/useAppTheme';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import React from 'react';
import { Text } from '../../../ui/AppText';
import { useLanguage } from '../../../context/LanguageContext';
import { QiblaCompass } from '../../../components/QiblaCompass';
import { Screen } from '../../../components/Screen';
import { useHalovat } from '../../../context/AppContext';

export default function QiblaScreen() {
  const styles = useThemedStyles(baseStyles);
  const colors = useThemeColors();
  const { t } = useLanguage();
  const { city } = useHalovat();
  const openMosques = () => router.navigate('/(tabs)/qibla/mosque');

  return <Screen contentStyle={styles.content}>
    <QiblaCompass city={city} />
    <Pressable accessibilityRole="button" accessibilityLabel={t('Yaqin masjidlar')} onPress={openMosques}
      style={({ pressed }) => [styles.mosques, pressed && { opacity: 0.7 }]}>
      <Image source={require('../../../../assets/home-cards/mosque-3d.png')} style={styles.mosqueArt} resizeMode="contain" accessibilityIgnoresInvertColors />
      <Text style={styles.mosqueLabel}>Yaqin masjidlar</Text>
      <ChevronRight size={20} color={colors.green} />
    </Pressable>
  </Screen>;
}

const baseStyles = StyleSheet.create({
  content: { gap: 14, paddingTop: 8 },
  mosques: { minHeight: 82, borderRadius: 22, borderWidth: 1, borderColor: '#DCE6DF', backgroundColor: '#E9F2EC', flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 6, paddingRight: 15, marginTop: 2 },
  mosqueArt: { width: 85, height: 86, marginTop: -7 },
  mosqueLabel: { flex: 1, color: '#003527', fontSize: 17, fontWeight: '600' },
});
