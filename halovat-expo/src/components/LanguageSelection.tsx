import React, { useEffect, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import { useLanguage } from '../context/LanguageContext';
import { AppLanguage, LANGUAGES } from '../data/languages';
import { NativeAction } from './NativeAction';
import { NativeSelect } from './NativeSelect';
import { Text } from '../ui/AppText';

type Props = { compact: boolean; reducedMotion: boolean; busy: boolean; onContinue: (language: AppLanguage) => Promise<void> };

export function LanguageSelection({ compact, reducedMotion, busy, onContinue }: Props) {
  const { language } = useLanguage();
  const initial = Math.max(0, LANGUAGES.findIndex(item => item.id === language));
  const [selected, setSelected] = useState(initial);
  const [copyIndex, setCopyIndex] = useState(initial);
  const [opacity] = useState(() => new Animated.Value(1));
  const [rotation] = useState(() => new Animated.Value(initial * 45));
  const copy = LANGUAGES[copyIndex];

  useEffect(() => () => { opacity.stopAnimation(); rotation.stopAnimation(); }, [opacity, rotation]);

  const pick = (index: number) => {
    if (busy || index === selected) return;
    setSelected(index);
    rotation.stopAnimation();
    opacity.stopAnimation();
    if (reducedMotion) { setCopyIndex(index); opacity.setValue(1); rotation.setValue(index * 45); return; }
    Animated.timing(rotation, { toValue: index * 45, duration: 600, easing: Easing.bezier(0.3, 0.7, 0.2, 1), useNativeDriver: true }).start();
    Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      setCopyIndex(index);
      Animated.timing(opacity, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  };

  return <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.scroll} contentContainerStyle={styles.content}>
    <View style={styles.heroArea}>
      <Animated.View accessible={false} style={[styles.star, { transform: [{ rotate: rotation.interpolate({ inputRange: [0, 135], outputRange: ['0deg', '135deg'] }) }] }]}>
        <Svg width={40} height={40} viewBox="0 0 40 40"><Rect x={9} y={9} width={22} height={22} fill="none" stroke="#064E3B" strokeWidth={2} /><Rect x={9} y={9} width={22} height={22} fill="none" stroke="#064E3B" strokeWidth={2} transform="rotate(45 20 20)" /><Circle cx={20} cy={20} r={3.5} fill="#F59E0B" /></Svg>
      </Animated.View>
      <Animated.View style={{ opacity }}><Text translate={false} style={[styles.hero, compact && styles.compactHero]}>{copy.greeting}</Text></Animated.View>
    </View>
    <Animated.View style={{ opacity }} accessibilityLiveRegion="polite">
      <Text translate={false} accessibilityRole="header" style={styles.title}>{copy.title}</Text>
      <Text translate={false} style={styles.description}>{copy.description}</Text>
    </Animated.View>
    <View style={styles.list}>
      <NativeSelect value={selected} options={LANGUAGES.map((item, index) => ({ value: index, label: item.name }))}
        onChange={pick} disabled={busy} translate={false} colorScheme="light" />
      <NativeAction label={copy.continue} translate={false} disabled={busy}
        onPress={() => void onContinue(LANGUAGES[selected].id)} colorScheme="light" />
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 26 },
  heroArea: { flexGrow: 1, flexShrink: 0, justifyContent: 'flex-end', gap: 14, paddingBottom: 22, paddingTop: 24 },
  star: { width: 40, height: 40 },
  hero: { color: '#064E3B', fontSize: 40, lineHeight: 43.2, fontWeight: '800', letterSpacing: -1.2 },
  compactHero: { fontSize: 32, lineHeight: 34.56, letterSpacing: -0.96 },
  title: { color: '#064E3B', fontSize: 22, lineHeight: 26.4, fontWeight: '700', letterSpacing: -0.44, marginBottom: 6 },
  description: { color: '#3E4540', fontSize: 14.5, lineHeight: 21.75, marginBottom: 18 },
  list: { gap: 18, marginTop: 8 },
});
