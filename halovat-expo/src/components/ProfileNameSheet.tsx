import { BottomSheet, Button, Column, Host, Row, ScrollView, Spacer, Text, TextInput, useNativeState } from '@expo/ui';
import React, { useEffect, useRef } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { Colors } from '../ui/theme';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';
import { nativeAccessibilityLabel } from './nativeAccessibility';
import { NativeCloseButton } from './NativeCloseButton';
import { actionModifiers, largeActionLabelModifiers, sheetAppearance } from './nativeControlModifiers';

export function ProfileNameSheet({ visible, name, onSave, onClose }: {
  visible: boolean; name: string; onSave: (name: string) => void; onClose: () => void;
}) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  const draft = useNativeState(name);
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);

  useEffect(() => {
    if (visible) draft.set(name);
  }, [visible, name, draft]);

  const close = () => {
    input.current?.blur();
    Keyboard.dismiss();
    onClose();
  };
  const save = (value: string) => {
    onSave(value);
    close();
  };

  // Keep the form in one native layout tree. A fixed-height RNHostView cannot
  // shrink with the sheet's keyboard safe area, which pushes the input upwards.
  return <Host style={StyleSheet.absoluteFill} pointerEvents="none"
    colorScheme={dark ? 'dark' : 'light'} seedColor={colors.green}>
    <BottomSheet isPresented={visible} onDismiss={close} snapPoints={['half', 'full']}
      containerColor={colors.paper} contentColor={colors.ink} contentPadding={0}
      modifiers={sheetAppearance(dark ? 'dark' : 'light', colors.paper)}>
      <ScrollView style={{ width: '100%', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 }}>
        <Column spacing={16} style={{ width: '100%' }}>
          <Row alignment="center" spacing={12} style={{ width: '100%' }}>
            <Text textStyle={{ fontSize: 20, fontWeight: '600', color: colors.ink }}>{t('Profilni tahrirlash')}</Text>
            <Spacer flexible />
            <NativeCloseButton onPress={close} />
          </Row>
          <Text textStyle={{ fontSize: 14, color: colors.body }}>{t('Ismingiz')}</Text>
          <TextInput ref={input} value={draft} maxLength={40} selectTextOnFocus
            placeholder={t('Ismingiz')} placeholderTextColor={colors.muted}
            autoComplete="name" autoCapitalize="words" autoCorrect={false} returnKeyType="done"
            onSubmitEditing={save} modifiers={nativeAccessibilityLabel(t('Ismingiz'))}
            style={{ width: '100%', height: 48, padding: 12, borderRadius: 12, backgroundColor: dark ? '#24362C' : '#F4F4F0' }}
            textStyle={{ fontSize: 16, color: colors.ink }} />
          <Button onPress={() => save(draft.value)} variant="filled" style={{ width: '100%' }}
            modifiers={actionModifiers('filled', Colors.green, true)}>
            <Text modifiers={largeActionLabelModifiers()}>{t('Saqlash')}</Text>
          </Button>
        </Column>
      </ScrollView>
    </BottomSheet>
  </Host>;
}
