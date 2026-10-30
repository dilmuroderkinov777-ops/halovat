import { qiblaSceneJS } from '../data/qiblaSceneAssets';

export function createQiblaSceneDocument(lightweight = false) {
  return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;">
<style>html,body,canvas{width:100%;height:100%;margin:0;display:block;overflow:hidden;background:transparent}canvas{touch-action:pan-y}body::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(to bottom,var(--canvas,#faf9f5),transparent 6%,transparent 94%,var(--canvas,#faf9f5))}</style>
</head><body data-lightweight="${lightweight}"><canvas aria-hidden="true"></canvas><script>${qiblaSceneJS.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
}

export const qiblaSceneDocument = createQiblaSceneDocument();
