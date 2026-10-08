import { useThemedStyles, useThemeColors } from '../ui/useAppTheme';
import { router } from 'expo-router';
import { Bell, ChevronDown, MapPin, UserRound } from 'lucide-react-native';
import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/AppText';
import { useHalovat } from '../context/AppContext';
import { Colors } from '../ui/theme';

export function AppTopBar({ subtitle }: { subtitle: string }) {
  const styles = useThemedStyles(baseStyles);
  const Colors = useThemeColors();
  const { city } = useHalovat();
  const openSettings = () => router.push('/(tabs)/settings' as never);

  return <View style={styles.shell}>
    <View style={styles.bar}>
      <View style={styles.left}>
        <Image accessible={false} source={require('../../assets/halovat-icon.png')} style={styles.logo} />
        <View style={styles.locationStack}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Shahar: ${city.name}. Sozlamalarda o‘zgartirish`} onPress={openSettings} style={styles.cityRow}>
            <MapPin size={16} color={Colors.green} strokeWidth={2.2} />
            <Text numberOfLines={1} style={styles.city}>{city.name}</Text>
            <ChevronDown size={15} color={Colors.body} />
          </Pressable>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Bildirishnoma sozlamalari" onPress={openSettings} style={styles.iconButton}><Bell size={22} color={Colors.ink} strokeWidth={1.9} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Profil" onPress={openSettings} style={styles.avatar}><UserRound size={18} color="#FFFFFF" strokeWidth={2} /></Pressable>
      </View>
    </View>
  </View>;
}

const baseStyles = StyleSheet.create({
  shell: { width: '100%', backgroundColor: Colors.canvas, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8E9E3' },
  bar: { height: 64, maxWidth: 440, width: '100%', alignSelf: 'center', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 9 },
  logo: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.greenDeep },
  locationStack: { flexShrink: 1, gap: 2 },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 3, minHeight: 24 },
  city: { color: Colors.ink, fontSize: 16, fontWeight: '700', maxWidth: 145 },
  subtitle: { color: Colors.body, fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 33, height: 33, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.greenDark },
});
