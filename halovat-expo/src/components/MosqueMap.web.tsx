import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MosqueMapProps } from './mosqueMap.types';

export function MosqueMap({ center, places, onSelect }: MosqueMapProps) {
  const span = 0.045;
  const bounds = `${center.longitude - span},${center.latitude - span},${center.longitude + span},${center.latitude + span}`;
  const source = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${center.latitude}%2C${center.longitude}`;
  return <View style={styles.map}>
    <iframe title="OpenStreetMap" src={source} style={{ width: '100%', height: '100%', border: 'none', filter: 'grayscale(.65) saturate(.55) brightness(1.12)' } as React.CSSProperties} loading="lazy" />
    <View pointerEvents="box-none" style={styles.markerLayer}>
      {places.slice(0, 35).map(place => {
        const left = Math.max(3, Math.min(97, (place.longitude - (center.longitude - span)) / (span * 2) * 100));
        const top = Math.max(4, Math.min(96, (center.latitude + span - place.latitude) / (span * 2) * 100));
        return <Pressable key={place.id} accessibilityRole="button" accessibilityLabel={place.name} onPress={() => onSelect(place.id)} style={[styles.marker, { left: `${left}%`, top: `${top}%` }]}>
          <Text style={styles.markerGlyph}>✦</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  map: { flex: 1, overflow: 'hidden', backgroundColor: '#E9F0EB' },
  markerLayer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  marker: { position: 'absolute', width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: 14, borderBottomLeftRadius: 3, transform: [{ rotate: '-45deg' }], backgroundColor: '#06724E', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#003A2C', shadowOpacity: 0.26, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  markerGlyph: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', transform: [{ rotate: '45deg' }] },
});
