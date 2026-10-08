import { Button, Host } from '@expo/ui/swift-ui';
import { buttonStyle, disabled as disabledModifier, frame, tint } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Colors } from '../ui/theme';

export function NativeAction({ label, onPress, disabled = false, variant = 'filled' }: {
  label: string; onPress: () => void; disabled?: boolean; variant?: 'filled' | 'outlined' | 'text';
}) {
  const { t } = useLanguage();
  return (
    <Host style={{ width: '100%', height: 48 }}>
      <Button
        label={t(label)}
        onPress={onPress}
        modifiers={[
          buttonStyle(variant === 'filled' ? 'borderedProminent' : 'bordered'),
          tint(Colors.green),
          frame({ maxWidth: Number.POSITIVE_INFINITY, height: 48 }),
          ...(disabled ? [disabledModifier(true)] : []),
        ]}
      />
    </Host>
  );
}
