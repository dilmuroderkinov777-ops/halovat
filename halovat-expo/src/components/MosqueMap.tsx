import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MosqueMapProps } from './mosqueMap.types';

// TypeScript fallback; Metro selects the native or web implementation per platform.
export function MosqueMap({ center }: MosqueMapProps) {
  return <View style={styles.fallback}><Text style={styles.text}>Xarita markazi: {center.latitude.toFixed(3)}, {center.longitude.toFixed(3)}</Text></View>;
}

const styles = StyleSheet.create({ fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E9F0EB' }, text: { color: '#697970', fontSize: 11 } });
