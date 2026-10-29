import React, { memo, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '../ui/AppText';
import { NativeAction } from './NativeAction';
import { qiblaSceneDocument } from './qiblaSceneDocument';
import type { QiblaSceneProps } from './qiblaScene.types';

export const QiblaScene = memo(function QiblaScene({ motion, bearing, aligned, active, dark, reduceMotion }: QiblaSceneProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'ready') setReady(true);
        if (message.type === 'error') setFailed(true);
      } catch { /* Ignore other frame messages. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);
  useEffect(() => {
    if (!ready || failed) return;
    const update = (heading: number | null) => frame.current?.contentWindow?.postMessage({ type: 'halovat-qibla-update', payload: { heading, bearing, aligned, active, dark, reduceMotion } }, '*');
    if (!active) { update(null); return; }
    return motion.subscribe(sample => update(sample?.heading ?? null));
  }, [ready, failed, motion, bearing, aligned, active, dark, reduceMotion]);
  if (failed) return <View style={{ flex: 1, padding: 24, gap: 16, justifyContent: 'center' }}><Text>3D sahna ochilmadi. Yo‘nalishni pastdagi ko‘rsatkichdan kuzating.</Text><NativeAction label="Qayta urinish" onPress={() => { setFailed(false); setReady(false); setRevision(value => value + 1); }} appearance="minimal" /></View>;
  return <iframe ref={frame} key={revision} title="Qibla 3D" srcDoc={qiblaSceneDocument} sandbox="allow-scripts" style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }} />;
});
