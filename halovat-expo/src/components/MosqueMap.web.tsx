import React, { useEffect, useRef, useState } from 'react';
import { MosqueMapProps } from './mosqueMap.types';
import { mosqueMapDocument } from './mosqueMapDocument';

export function MosqueMap({ center, places, onSelect, isUserLocation, selectedId }: MosqueMapProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const payload = JSON.stringify({ center, places, isUserLocation, selectedId });
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      try {
        const data = JSON.parse(event.data) as { type?: string; id?: string };
        if (data.type === 'ready') setReady(true);
        if (data.type === 'select' && data.id && places.some(place => place.id === data.id)) onSelect(data.id);
      } catch { /* Ignore unrelated iframe events. */ }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onSelect, places]);
  useEffect(() => {
    if (ready) frame.current?.contentWindow?.postMessage(JSON.stringify({ type: 'halovat-map-update', payload: JSON.parse(payload) }), '*');
  }, [ready, payload]);
  return <iframe ref={frame} title="Masjidlar xaritasi" srcDoc={mosqueMapDocument} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" style={{ width: '100%', height: '100%', border: 'none' }} />;
}
