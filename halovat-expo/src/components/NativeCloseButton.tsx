import { Button, Icon, Text } from '@expo/ui';
import React from 'react';
import { Platform } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useThemeColors } from '../ui/useAppTheme';
import { nativeAccessibilityLabel } from './nativeAccessibility';
import { actionModifiers, squareActionLabelModifiers } from './nativeControlModifiers';

/** Render inside a native layout tree, or wrap in a Host when used from React Native. */
export function NativeCloseButton({ onPress }: { onPress: () => void }) {
  const { t } = useLanguage();
  const colors = useThemeColors();
  return <Button onPress={onPress} variant="text" style={{ width: 48, height: 48 }}
    modifiers={[...actionModifiers('text', colors.muted), ...nativeAccessibilityLabel(t('Yopish'))]}>
    {Platform.OS === 'web' ? <Text textStyle={{ fontSize: 28, color: colors.muted }}>×</Text>
      : <Icon name={Icon.select({ ios: 'xmark.circle.fill', android: require('../../assets/sheet-close.xml') })}
          size={24} color={colors.muted} modifiers={squareActionLabelModifiers()} />}
  </Button>;
}
