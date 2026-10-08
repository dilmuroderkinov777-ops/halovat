import { Button, Host, OutlinedButton, Shape, Text } from '@expo/ui/jetpack-compose';
import { fillMaxWidth, height } from '@expo/ui/jetpack-compose/modifiers';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Colors } from '../ui/theme';

export function NativeAction({ label, onPress, disabled = false, variant = 'filled' }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
}) {
  const { t } = useLanguage();
  const ButtonComponent = variant === 'outlined' ? OutlinedButton : Button;
  const contentColor = variant === 'filled' ? '#FFFFFF' : Colors.green;
  return (
    <Host style={{ width: '100%', height: 48 }}>
      <ButtonComponent
        onClick={onPress}
        enabled={!disabled}
        colors={{ containerColor: variant === 'filled' ? Colors.green : '#FFFFFF', contentColor }}
        shape={Shape.RoundedCorner({ cornerRadii: { topStart: 15, topEnd: 15, bottomStart: 15, bottomEnd: 15 } })}
        modifiers={[fillMaxWidth(), height(48)]}
      >
        <Text color={contentColor} style={{ fontSize: 14, fontWeight: '600' }}>{t(label)}</Text>
      </ButtonComponent>
    </Host>
  );
}
