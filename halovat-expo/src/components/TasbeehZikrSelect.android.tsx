import { DropdownMenu, DropdownMenuItem, Host, RNHostView, Text as ComposeText } from '@expo/ui/jetpack-compose';
import { Check, ChevronsUpDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { ZIKR } from '../data/zikr';
import { Text } from '../ui/AppText';

/** A text menu like the iOS picker, without Android's filled input field. */
export function TasbeehZikrSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();
  const selected = ZIKR.find(item => item.id === value) ?? ZIKR[0];
  return <Host matchContents colorScheme="dark" style={styles.host}>
    <DropdownMenu expanded={expanded} onDismissRequest={() => setExpanded(false)} color="#123E32" cornerRadius={16}>
      <DropdownMenu.Trigger>
        <RNHostView matchContents>
          <Pressable accessibilityRole="button" accessibilityLabel={t(selected.name)} accessibilityHint={t('Zikrni tanlang')}
            accessibilityState={{ expanded }} onPress={() => setExpanded(true)}
            style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
            <Text style={styles.label} numberOfLines={2}>{selected.name}</Text>
            <ChevronsUpDown size={18} color="#78E3AF" />
          </Pressable>
        </RNHostView>
      </DropdownMenu.Trigger>
      <DropdownMenu.Items>
        {ZIKR.map(item => <DropdownMenuItem key={item.id} onClick={() => { setExpanded(false); onChange(item.id); }}>
          <DropdownMenuItem.Text><ComposeText color={item.id === value ? '#78E3AF' : '#EFFBF4'}>{t(item.name)}</ComposeText></DropdownMenuItem.Text>
          {item.id === value && <DropdownMenuItem.TrailingIcon><RNHostView matchContents><View><Check size={18} color="#78E3AF" /></View></RNHostView></DropdownMenuItem.TrailingIcon>}
        </DropdownMenuItem>)}
      </DropdownMenu.Items>
    </DropdownMenu>
  </Host>;
}

const styles = StyleSheet.create({
  host: { alignSelf: 'center', maxWidth: '100%' },
  trigger: { minHeight: 44, paddingVertical: 8, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  label: { color: '#78E3AF', fontSize: 17, fontWeight: '500', flexShrink: 1 },
  pressed: { opacity: 0.65 },
});
