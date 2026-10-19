import { useThemedStyles, useThemeColors } from '../../ui/useAppTheme';
import { Tabs } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/build/react-navigation/bottom-tabs/types';
import { CalendarDays, CircleDot, Compass, House, UserRound } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../ui/AppText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../ui/theme';

const TAB_ITEMS = [
  { name: 'index', title: 'Bosh sahifa', icon: House },
  { name: 'tracker', title: 'Namozlar', icon: CalendarDays },
  { name: 'tasbeeh', title: 'Tasbeh', icon: CircleDot },
  { name: 'qibla', title: 'Qibla', icon: Compass },
  { name: 'settings', title: 'Profil', icon: UserRound },
] as const;

function BottomBar({ state, navigation }: BottomTabBarProps) {
  const styles = useThemedStyles(baseStyles);
  const Colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index]?.name;
  const highlighted = activeRoute === 'mosque' ? 'qibla' : activeRoute === 'duas' ? 'tasbeeh' : activeRoute;
  return (
    <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <View style={styles.bottomInner}>
        {TAB_ITEMS.map(item => {
          const focused = highlighted === item.name;
          const Icon = item.icon;
          return (
            <Pressable key={item.name} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={item.title}
              onPress={() => navigation.navigate(item.name)} style={styles.tabItem}>
              <Icon size={24} color={focused ? Colors.green : Colors.body} strokeWidth={focused ? 2.25 : 1.8} />
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.tabLabel, focused && styles.tabLabelActive]}>{item.title}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true }} tabBar={props => <BottomBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tracker" />
      <Tabs.Screen name="tasbeeh" />
      <Tabs.Screen name="qibla" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="mosque" options={{ href: null }} />
      <Tabs.Screen name="duas" options={{ href: null }} />
    </Tabs>
  );
}

const baseStyles = StyleSheet.create({
  bottom: { backgroundColor: Colors.paper, borderTopColor: '#E8ECE7', borderTopWidth: StyleSheet.hairlineWidth, shadowColor: Colors.greenDeep, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: -3 }, elevation: 5 },
  bottomInner: { height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', alignSelf: 'center', width: '100%', maxWidth: 440, paddingHorizontal: 4 },
  tabItem: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { color: Colors.body, fontSize: 11, lineHeight: 14, fontWeight: '500' },
  tabLabelActive: { color: Colors.green, fontWeight: '700' },
});
