import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { useThemeColors } from '../ui/useAppTheme';
import { Text } from '../ui/AppText';
import { NativeAction } from './NativeAction';
import { createQiblaSceneDocument } from './qiblaSceneDocument';
import { createSceneDelivery } from '../domain/qiblaSceneDelivery';
import type { QiblaSceneState } from '../scene/qibla/scene';
import type { QiblaSceneProps } from './qiblaScene.types';

const source = { html: createQiblaSceneDocument(Platform.OS === 'android'), baseUrl: 'about:blank' };

export const QiblaScene = memo(function QiblaScene({ motion, bearing, aligned, active, dark, reduceMotion }: QiblaSceneProps) {
  const view = useRef<WebView<WebViewProps>>(null);
  const delivery = useRef<ReturnType<typeof createSceneDelivery<QiblaSceneState>> | null>(null);
  const sequence = useRef(0);
  const recoveries = useRef(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const colors = useThemeColors();
  const config = useMemo(() => ({ bearing, aligned, active, dark, reduceMotion }), [bearing, aligned, active, dark, reduceMotion]);
  const latest = useRef(config);
  latest.current = config;
  const recover = useCallback(() => {
    delivery.current?.dispose();
    delivery.current = null;
    setReady(false);
    if (recoveries.current >= 2) { setFailed(true); return; }
    recoveries.current++;
    setRevision(value => value + 1);
  }, []);
  useEffect(() => {
    if (!ready || failed) return;
    if (!active) {
      view.current?.injectJavaScript(`window.updateHalovatQibla&&window.updateHalovatQibla(${JSON.stringify({ ...latest.current, active: false, heading: null })});true;`);
      return;
    }
    const channel = createSceneDelivery<QiblaSceneState>((state, id) => {
      view.current?.injectJavaScript(`window.updateHalovatQibla&&window.updateHalovatQibla(${JSON.stringify(state)},${id});true;`);
    }, recover, () => ++sequence.current);
    delivery.current = channel;
    const unsubscribe = motion.subscribe(sample => channel.submit({ ...latest.current, heading: sample?.heading ?? null }));
    return () => { unsubscribe(); channel.dispose(); if (delivery.current === channel) delivery.current = null; };
  }, [ready, failed, active, motion, recover, revision]);
  useEffect(() => {
    delivery.current?.submit({ ...config, heading: active ? motion.current()?.heading ?? null : null });
  }, [active, config, motion]);
  useEffect(() => {
    if (ready || failed || !active) return;
    const timer = setTimeout(recover, 12000);
    return () => clearTimeout(timer);
  }, [ready, failed, revision, active, recover]);
  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'ready') setReady(true);
      if (message.type === 'rendered' && Number.isFinite(message.sequence)) delivery.current?.rendered(message.sequence);
      if (message.type === 'error') recover();
    } catch { /* Only the private scene protocol is accepted. */ }
  }, [recover]);
  const retry = () => { recoveries.current = 0; setReady(false); setFailed(false); setRevision(value => value + 1); };
  return <View style={[styles.container, { backgroundColor: colors.canvas }]}>
    {!failed && <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.fill}>
      <WebView<WebViewProps> ref={view} key={revision} source={source} originWhitelist={['*']}
        style={{ flex: 1, backgroundColor: colors.canvas }} scrollEnabled={false}
        javaScriptEnabled domStorageEnabled={false} setSupportMultipleWindows={false} allowsLinkPreview={false}
        bounces={false} onMessage={onMessage} onError={recover}
        onContentProcessDidTerminate={recover} onRenderProcessGone={recover}
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
