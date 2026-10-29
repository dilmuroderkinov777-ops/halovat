import { Button, Host, Icon, Row, Spacer, Text } from '@expo/ui';
import React, { useState } from 'react';
import { Platform } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAppTheme, useThemeColors } from '../ui/useAppTheme';
import { nativeAccessibilityLabel } from './nativeAccessibility';
import { actionModifiers, minimalActionLabelModifiers } from './nativeControlModifiers';

export function QiblaCalibrationAction({ onPress }: { onPress: () => void }) {
  const { t } = useLanguage();
  const { dark } = useAppTheme();
  const colors = useThemeColors();
  const [width, setWidth] = useState<number>();
  return <Host matchContents={{ vertical: true }} ignoreSafeArea="all" colorScheme={dark ? 'dark' : 'light'}
    seedColor={colors.green} onLayout={event => setWidth(event.nativeEvent.layout.width)}
    style={{ width: '100%', borderWidth: 1, borderColor: dark ? '#527360' : '#74887F', borderRadius: 16, overflow: 'hidden' }}>
    <Button onPress={onPress} variant="text" style={{ ...(width ? { width: width - 2 } : {}), height: 44, borderRadius: 15 }}
      modifiers={[...actionModifiers('text', colors.green), ...nativeAccessibilityLabel(t('Qayta sozlash'))]}>
      <Row alignment="center" spacing={10} style={{ height: 44 }} modifiers={minimalActionLabelModifiers(false)}>
        <Spacer flexible />
        {Platform.OS === 'web' ? <Text textStyle={{ fontSize: 25, color: colors.green }}>↻</Text>
          : <Icon name={Icon.select({ ios: 'arrow.counterclockwise', android: require('../../assets/qibla/recalibrate.xml') })} size={20} color={colors.green} />}
        <Text textStyle={{ fontSize: 15, fontWeight: '500', color: colors.green }}>{t('Qayta sozlash')}</Text>
        <Spacer flexible />
      </Row>
    </Button>
  </Host>;
}
