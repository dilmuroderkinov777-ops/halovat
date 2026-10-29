import { BottomSheet, Button, Column, Host, Row, ScrollView, Spacer, Text, TextInput, useNativeState } from '@expo/ui';
import React, { useRef, useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { CITIES } from '../domain/prayers';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';
import { nativeAccessibilityLabel } from './nativeAccessibility';
import { actionModifiers, minimalActionLabelModifiers, sheetAppearance } from './nativeControlModifiers';

const normalize = (text: string) => text.toLocaleLowerCase().replace(/['’‘ʻ`]/g, '').trim();

export function CitySelectionSheet({ visible, cityId, onSelect, onClose }: {
  visible: boolean; cityId: string; onSelect: (id: string) => Promise<void>; onClose: () => void;
}) {
  const { t } = useLanguage();
  const colors = useThemeColors();
  const { dark } = useAppTheme();
  const search = useNativeState('');
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const close = () => { input.current?.blur(); Keyboard.dismiss(); search.set(''); setQuery(''); setError(false); onClose(); };
  const select = async (id: string) => {
    if (saving) return;
    setSaving(true); setError(false);
    try { await onSelect(id); close(); } catch { setError(true); } finally { setSaving(false); }
  };
  const cities = CITIES.filter(city => normalize(t(city.name) + ' ' + t(city.region ?? '') + ' ' + city.name).includes(normalize(query)));
  return <Host style={StyleSheet.absoluteFill} pointerEvents="none" colorScheme={dark ? 'dark' : 'light'} seedColor={colors.green}>
    <BottomSheet isPresented={visible} onDismiss={close} snapPoints={['full']} contentPadding={0}
      containerColor={colors.paper} contentColor={colors.ink} modifiers={sheetAppearance(dark ? 'dark' : 'light', colors.paper)}>
      <ScrollView style={{ width: '100%', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 }}>
        <Column spacing={14} style={{ width: '100%' }}>
          <Row alignment="center" spacing={12} style={{ width: '100%' }}>
            <Text textStyle={{ fontSize: 22, fontWeight: '600', color: colors.ink }}>{t('Shaharni tanlang')}</Text>
            <Spacer flexible />
            <Button label={t('Yopish')} variant="text" onPress={close} style={{ height: 44 }} modifiers={actionModifiers('text', colors.green)} />
          </Row>
          <Text textStyle={{ fontSize: 13, color: colors.body }}>{t('Namoz vaqtlari tanlangan shahar bo‘yicha hisoblanadi.')}</Text>
          <TextInput ref={input} value={search} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none"
            placeholder={t('Shahar qidirish')} placeholderTextColor={colors.muted} returnKeyType="search"
            onSubmitEditing={() => input.current?.blur()} modifiers={nativeAccessibilityLabel(t('Shahar qidirish'))}
            style={{ width: '100%', height: 48, padding: 12, borderRadius: 12, backgroundColor: dark ? '#24362C' : '#F4F4F0' }}
            textStyle={{ fontSize: 16, color: colors.ink }} />
          {error ? <Text textStyle={{ color: colors.red }}>{t('Shahar saqlanmadi. Qayta urinib ko‘ring.')}</Text> : null}
          {cities.length ? cities.map(city => <Button key={city.id} variant="text" disabled={saving}
            onPress={() => void select(city.id)} modifiers={actionModifiers('text', colors.green)}
            style={{ width: '100%', backgroundColor: city.id === cityId ? dark ? '#224C39' : '#DDF8EB' : 'transparent', borderRadius: 12 }}>
            <Text modifiers={[...minimalActionLabelModifiers(false), ...nativeAccessibilityLabel(t(city.name) + (city.id === cityId ? ', ' + t('Tanlangan') : ''))]}
              textStyle={{ fontSize: 16, color: city.id === cityId ? colors.green : colors.ink, fontWeight: city.id === cityId ? '600' : '400' }}>
              {(city.id === cityId ? '✓  ' : '') + t(city.name)}
            </Text>
          </Button>) : <Text textStyle={{ color: colors.muted, fontSize: 14 }}>{t('Shahar topilmadi')}</Text>}
        </Column>
      </ScrollView>
    </BottomSheet>
  </Host>;
}
