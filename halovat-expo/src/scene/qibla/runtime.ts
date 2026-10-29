import { createQiblaScene, type QiblaSceneState } from './scene';

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
    updateHalovatQibla?: (data: QiblaSceneState) => void;
    __halovatQibla?: ReturnType<typeof createQiblaScene>;
  }
}

function send(message: { type: string; message?: string }) {
  const json = JSON.stringify(message);
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(json);
  else window.parent.postMessage(json, '*');
}

try {
  const view = createQiblaScene(document.querySelector('canvas')!, message => send({ type: 'error', message }));
  let latest: QiblaSceneState | undefined;
  window.__halovatQibla = view;
  window.updateHalovatQibla = data => {
    if (!data || typeof data.bearing !== 'number' || (data.heading !== null && typeof data.heading !== 'number')) return;
    latest = data;
    view.update({ ...data, active: data.active && !document.hidden });
  };
  window.addEventListener('message', event => {
    if (event.source !== window.parent) return;
    try {
      const message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (message.type === 'halovat-qibla-update') window.updateHalovatQibla?.(message.payload);
    } catch { /* Ignore messages outside this private frame protocol. */ }
  });
  document.addEventListener('visibilitychange', () => { if (latest) window.updateHalovatQibla?.(latest); });
  window.addEventListener('pagehide', () => view.dispose(), { once: true });
  void view.ready.then(() => send({ type: 'ready' })).catch(error => send({ type: 'error', message: String(error) }));
} catch (error) { send({ type: 'error', message: String(error) }); }
