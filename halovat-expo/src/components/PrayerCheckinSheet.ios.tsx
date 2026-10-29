import { BottomSheet, Button, Group, Host, ScrollView, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  fixedSize,
  font,
  foregroundColor,
  frame,
  multilineTextAlignment,
  onGeometryChange,
  padding,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';
import React, { useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';
import type { PrayerCheckinSheetProps } from './PrayerCheckinSheet.types';
import { largeActionLabelModifiers, largeActionModifiers, sheetAppearance } from './nativeControlModifiers';

export function PrayerCheckinSheet({ prayerName, onChoose, onClose }: PrayerCheckinSheetProps) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [contentHeight, setContentHeight] = useState(0);
  const availableHeight = Math.max(1, height - insets.top - insets.bottom - 48);
  const contentDetent = contentHeight > 0 ? { height: Math.min(Math.ceil(contentHeight), availableHeight) } : undefined;
  const measureContent = useCallback(({ height: measuredHeight }: { height: number }) => {
    if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return;
    setContentHeight(current => current === 0 || Math.abs(current - measuredHeight) > 1 ? measuredHeight : current);
  }, []);

  // SwiftUI measures the intrinsic stack directly; no React Native sizing bridge is involved.
  const content = <VStack spacing={24} modifiers={[
    frame({ maxWidth: Infinity }),
    fixedSize({ horizontal: false, vertical: true }),
    padding({ horizontal: 20, top: 24, bottom: 16 }),
    onGeometryChange(measureContent),
  ]}>
    <VStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
      <Text modifiers={[
        font({ textStyle: 'title2', size: 22, weight: 'semibold' }),
        foregroundColor(colors.ink),
        multilineTextAlignment('center'),
        fixedSize({ horizontal: false, vertical: true }),
        frame({ maxWidth: Infinity }),
        accessibilityAddTraits(['isHeader']),
      ]}>{t(`${prayerName} namozini o‘qidingizmi?`)}</Text>
      <Text modifiers={[
        font({ textStyle: 'subheadline', size: 15 }),
        foregroundColor(colors.body),
        multilineTextAlignment('center'),
        fixedSize({ horizontal: false, vertical: true }),
        frame({ maxWidth: Infinity }),
      ]}>{t('Javobingiz namozlar jadvaliga qo‘shiladi.')}</Text>
    </VStack>
    <VStack spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
      <Button onPress={() => onChoose('done')} modifiers={largeActionModifiers('filled')}>
        <Text modifiers={largeActionLabelModifiers()}>{t('Ha, o‘qidim')}</Text>
      </Button>
      <Button onPress={() => onChoose('missed')} modifiers={largeActionModifiers('outlined', colors.green)}>
        <Text modifiers={largeActionLabelModifiers()}>{t('Yo‘q, qazo bo‘ldi')}</Text>
      </Button>
      <Button onPress={onClose} modifiers={largeActionModifiers('outlined', colors.green)}>
        <Text modifiers={largeActionLabelModifiers()}>{t('Keyinroq belgilayman')}</Text>
      </Button>
    </VStack>
  </VStack>;

  return <Host style={{ position: 'absolute' }} pointerEvents="none"
    colorScheme={dark ? 'dark' : 'light'} seedColor={colors.green}>
    <BottomSheet isPresented fitToContents={!contentDetent} onIsPresentedChange={presented => { if (!presented) onClose(); }}>
      <Group modifiers={[
        ...sheetAppearance(dark ? 'dark' : 'light', colors.paper),
        presentationDragIndicator('visible'),
        // Use the intrinsic stack's height, not BottomSheet's separate root measurement.
        ...(contentDetent ? [presentationDetents([contentDetent], { selection: contentDetent })] : []),
      ]}>
        {contentHeight > availableHeight
          ? <ScrollView modifiers={[frame({ height: availableHeight })]}>{content}</ScrollView>
          : content}
      </Group>
    </BottomSheet>
  </Host>;
}
