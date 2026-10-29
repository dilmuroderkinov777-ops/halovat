import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { useThemeColors } from '../ui/useAppTheme';
import { Text } from '../ui/AppText';
import { NativeAction } from './NativeAction';
import { qiblaSceneDocument } from './qiblaSceneDocument';
import type { QiblaSceneProps } from './qiblaScene.types';

const source = { html: qiblaSceneDocument, baseUrl: 'about:blank' };

export const QiblaScene = memo(function QiblaScene({ motion, bearing, aligned, active, dark, reduceMotion }: QiblaSceneProps) {
  const view = useRef<WebView<WebViewProps>>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const colors = useThemeColors();
  const config = useMemo(() => ({ bearing, aligned, active, dark, reduceMotion }), [bearing, aligned, active, dark, reduceMotion]);
  useEffect(() => {
    if (!ready || failed) return;
    const update = (heading: number | null) => view.current?.injectJavaScript(`window.updateHalovatQibla&&window.updateHalovatQibla(${JSON.stringify({ ...config, heading })});true;`);
    if (!active) { update(null); return; }
    return motion.subscribe(sample => update(sample?.heading ?? null));
  }, [active, config, failed, motion, ready]);
  useEffect(() => {
    if (ready || failed || !active) return;
    const timer = setTimeout(() => setFailed(true), 12000);
    return () => clearTimeout(timer);
  }, [ready, failed, revision, active]);
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'ready') setReady(true);
      if (message.type === 'error') setFailed(true);
    } catch { /* Only the private scene protocol is accepted. */ }
  }, []);
  const retry = () => { setReady(false); setFailed(false); setRevision(value => value + 1); };
  return <View style={[styles.container, { backgroundColor: colors.canvas }]}>
    {!failed && <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.fill}>
      <WebView<WebViewProps> ref={view} key={revision} source={source} originWhitelist={['*']}
        style={{ flex: 1, backgroundColor: colors.canvas }} scrollEnabled={false}
        javaScriptEnabled domStorageEnabled={false} setSupportMultipleWindows={false} allowsLinkPreview={false}
        bounces={false} onMessage={onMessage} onError={() => setFailed(true)}
        onContentProcessDidTerminate={() => setFailed(true)} onRenderProcessGone={() => setFailed(true)}
        onShouldStartLoadWithRequest={request => request.url === 'about:blank' || request.url.startsWith('about:blank#')} />
    </View>}
    {!ready && !failed && <View pointerEvents="none" style={[styles.cover, { backgroundColor: colors.canvas }]}><ActivityIndicator color={colors.green} /><Text style={{ color: colors.muted }}>Qibla sahnasi ochilmoqda</Text></View>}
    {failed && <View style={styles.cover}><Text style={{ color: colors.muted, textAlign: 'center' }}>3D sahna ochilmadi. Yo‘nalishni pastdagi ko‘rsatkichdan kuzating.</Text><NativeAction label="Qayta urinish" onPress={retry} appearance="minimal" /></View>}
  </View>;
});

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
});
