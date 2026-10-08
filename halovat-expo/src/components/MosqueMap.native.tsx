import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MosqueMapProps } from './mosqueMap.types';

function makeMapHtml(center: MosqueMapProps['center'], places: MosqueMapProps['places']) {
  const payload = JSON.stringify({ center, places }).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;width:100%;margin:0;background:#e9f0eb}.leaflet-tile-pane{filter:grayscale(.65) saturate(.55) brightness(1.12)}.leaflet-control-attribution{font-size:10px!important;background:rgba(255,255,255,.94)!important}.pin{width:27px;height:27px;border-radius:50% 50% 50% 4px;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;background:#06724e;border:2px solid white;box-shadow:0 2px 5px #003a2c55;color:white;font:bold 13px sans-serif}.pin span{transform:rotate(45deg)}.you{border:3px solid white;border-radius:50%;background:#2789ed;box-shadow:0 0 0 10px #2789ed38;width:14px;height:14px}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>
const data=${payload};
if(!window.L){document.body.innerHTML='<div style="font:14px sans-serif;color:#556;padding:24px">Xarita uchun internet kerak.</div>';}else{
const map=L.map('map',{zoomControl:true,attributionControl:true}).setView([data.center.latitude,data.center.longitude],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
L.marker([data.center.latitude,data.center.longitude],{icon:L.divIcon({className:'',html:'<div class="you"></div>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map).bindPopup('Sizning joylashuvingiz');
data.places.forEach(place=>{const marker=L.circleMarker([place.latitude,place.longitude],{radius:9,color:'#ffffff',weight:3,fillColor:'#08724e',fillOpacity:1}).addTo(map);const popup=document.createElement('div');const title=document.createElement('strong');title.textContent=place.name;popup.appendChild(title);marker.bindPopup(popup);marker.on('click',()=>{if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(JSON.stringify({id:place.id}));}});});
setTimeout(()=>{map.invalidateSize();if(data.places.length){const bounds=L.latLngBounds([[data.center.latitude,data.center.longitude],...data.places.map(place=>[place.latitude,place.longitude])]);map.fitBounds(bounds,{padding:[32,32],maxZoom:14});}},200);
}
</script></body></html>`;
}

export function MosqueMap({ center, places, onSelect }: MosqueMapProps) {
  const [mapFailed, setMapFailed] = useState(false);
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as { id?: string };
      if (data.id) onSelect(data.id);
    } catch { /* Ignore non-app map messages. */ }
  };

  if (mapFailed) {
    return <View style={styles.offline}><Text style={styles.offlineTitle}>Xarita ochilmadi</Text><Text style={styles.offlineCopy}>OpenStreetMap xaritasi uchun internet aloqasini tekshiring.</Text></View>;
  }

  return <WebView
    key={`${center.latitude.toFixed(4)}-${center.longitude.toFixed(4)}-${places.map(place => place.id).join('|')}`}
    originWhitelist={['*']}
    source={{ html: makeMapHtml(center, places) }}
    style={styles.map}
    javaScriptEnabled
    domStorageEnabled
    cacheEnabled
    scrollEnabled={false}
    userAgent="Halovat/1.0 (OpenStreetMap map view)"
    onMessage={handleMessage}
    onError={() => setMapFailed(true)}
  />;
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: '#E9F0EB' },
  offline: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#E9F0EB' },
  offlineTitle: { color: '#19372D', fontSize: 15, fontWeight: '700' },
  offlineCopy: { color: '#697970', fontSize: 12, textAlign: 'center', marginTop: 5 },
});
