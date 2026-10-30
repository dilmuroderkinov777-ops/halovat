import React from 'react';
import { ZIKR } from '../data/zikr';
import { NativeSelect } from './NativeSelect';

export function TasbeehZikrSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return <NativeSelect colorScheme="dark" value={value}
    options={ZIKR.map(item => ({ value: item.id, label: item.name }))} onChange={onChange} />;
}
