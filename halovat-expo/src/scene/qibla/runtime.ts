import { createQiblaScene, type QiblaSceneState } from './scene';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
    updateHalovatQibla?: (data: QiblaSceneState, sequence?: number) => void;
    __halovatQibla?: ReturnType<typeof createQiblaScene>;
  }
}

function send(message: { type: string; message?: string; sequence?: number }) {
  const json = JSON.stringify(message);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(json);
  else window.parent.postMessage(json, '*');
}

try {
  const native = Boolean(window.ReactNativeWebView);
  let pendingFrame: number | undefined;
  const rendered = () => {
    if (pendingFrame === undefined) return;
    send({ type: 'rendered', sequence: pendingFrame });
    pendingFrame = undefined;
  };
  const view = createQiblaScene(document.querySelector('canvas')!, message => send({ type: 'error', message }),
    rendered, document.body.dataset.lightweight === 'true');
  let latest: QiblaSceneState | undefined;
  window.__halovatQibla = view;
  window.updateHalovatQibla = (data, sequence) => {
    if (!data || typeof data.bearing !== 'number' || (data.heading !== null && typeof data.heading !== 'number')) return;
    latest = data;
    pendingFrame = sequence;
    // React Native owns screen focus/AppState. Android WebView visibility may
    // remain hidden after a native tab/modal, even while the host is active.
    const active = data.active && (native || !document.hidden);
    view.update({ ...data, active });
    if (!active) rendered();
  };
  window.addEventListener('message', event => {
    if (event.source !== window.parent) return;
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (message.type === 'halovat-qibla-update') window.updateHalovatQibla?.(message.payload);
    } catch { /* Ignore messages outside this private frame protocol. */ }
  });
  if (!native) {
    document.addEventListener('visibilitychange', () => { if (latest) window.updateHalovatQibla?.(latest); });
    window.addEventListener('pagehide', (event: PageTransitionEvent) => { if (!event.persisted) view.dispose(); });
  }
  void view.ready.then(() => send({ type: 'ready' })).catch(error => send({ type: 'error', message: String(error) }));
} catch (error) { send({ type: 'error', message: String(error) }); }
