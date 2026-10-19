import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../ui/AppText';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MosqueMapProps } from './mosqueMap.types';
import { mosqueMapDocument } from './mosqueMapDocument';

const source = { html: mosqueMapDocument };
export function MosqueMap({ center, places, onSelect, isUserLocation, selectedId }: MosqueMapProps) {
  const webview = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [generation, setGeneration] = useState(0);
  const payload = JSON.stringify({ center, places, isUserLocation, selectedId }).replace(/</g, '\\u003c');
  useEffect(() => {
    if (ready) webview.current?.injectJavaScript(`window.updateHalovatMap&&window.updateHalovatMap(${payload});true;`);
  }, [ready, payload]);
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (data.type === 'ready') setReady(true);
      if (data.type === 'error') setFailed(true);
      if (data.type === 'select' && data.id && places.some(place => place.id === data.id)) onSelect(data.id);
    } catch { /* Ignore messages outside the map protocol. */ }
  };
  if (failed) return <View style={styles.offline}><Text>Xarita ochilmadi. Internetni tekshiring.</Text><Pressable onPress={() => { setReady(false); setFailed(false); setGeneration(value => value + 1); }}><Text>Qayta urinish</Text></Pressable></View>;
  return <WebView ref={webview} key={generation} originWhitelist={['*']} source={source}
    style={styles.map} javaScriptEnabled domStorageEnabled cacheEnabled scrollEnabled={false}
    onMessage={handleMessage} onError={() => { setReady(false); setFailed(true); }} />;
}
const styles = StyleSheet.create({ map: { flex: 1, backgroundColor: '#E9F0EB' }, offline: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 } });
