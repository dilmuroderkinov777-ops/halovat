// Geographic markers stay inside Leaflet on native and web, including while panning.
import { leafletCSS, leafletJS } from '../data/leafletAssets';
export const mosqueMapDocument = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${leafletCSS}</style>
<style>html,body,#map{height:100%;width:100%;margin:0;background:#e9f0eb}.leaflet-control-attribution{font-size:9px!important}.leaflet-popup-content{font:13px sans-serif}.failure{padding:70px 24px;font:14px sans-serif;color:#345}</style>
</head><body><div id="map"></div><script>${leafletJS.replace(/<\/script/gi, '<\\/script')}</script><script>
function send(message){const data=JSON.stringify(message);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(data);else window.parent.postMessage(data,'*');}
if(!window.L){document.getElementById('map').innerHTML='<div class="failure">Xarita ochilmadi. Internetni tekshiring.</div>';send({type:'error'});}
else{
const map=L.map('map',{zoomControl:false,attributionControl:true,preferCanvas:true,zoomAnimation:false,fadeAnimation:false}).setView([0,0],14);
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
const markers=new Map();let pointKey='';let boundsKey='';let userMarker;
window.updateHalovatMap=function(data){
 if(!data||!data.center||!Array.isArray(data.places))return;
 const key=data.center.latitude+','+data.center.longitude;
 if(key!==pointKey){map.setView([data.center.latitude,data.center.longitude],14);pointKey=key;}
 if(userMarker){userMarker.remove();userMarker=null;}
 if(data.isUserLocation)userMarker=L.circleMarker([data.center.latitude,data.center.longitude],{radius:8,color:'#fff',weight:3,fillColor:'#2789ed',fillOpacity:1}).addTo(map).bindPopup('Sizning joylashuvingiz');
 const ids=new Set(data.places.map(p=>p.id));
 markers.forEach((entry,id)=>{if(!ids.has(id)){entry.marker.remove();markers.delete(id);}});
 data.places.forEach(place=>{
   let entry=markers.get(place.id);
   if(!entry){
     const marker=L.circleMarker([place.latitude,place.longitude],{radius:8,color:'#fff',weight:2,fillColor:'#08724e',fillOpacity:1}).addTo(map);
     marker.on('click',()=>send({type:'select',id:place.id}));
     entry={marker};markers.set(place.id,entry);
   }
   entry.marker.setLatLng([place.latitude,place.longitude]);
   const title=document.createElement('strong');title.textContent=place.name;entry.marker.bindPopup(title);
   entry.marker.setStyle({radius:place.id===data.selectedId?11:8,fillColor:place.id===data.selectedId?'#003527':'#08724e',weight:place.id===data.selectedId?3:2});
 });
 map.invalidateSize();
 // Fit the compact map only when the visible result set changes, preserving user panning on selection.
 const nextBoundsKey=JSON.stringify([key,data.places.map(p=>[p.id,p.latitude,p.longitude])]);
 if(nextBoundsKey!==boundsKey){
   if(data.places.length)map.fitBounds([[data.center.latitude,data.center.longitude],...data.places.map(p=>[p.latitude,p.longitude])],{padding:[24,24],maxZoom:15,animate:false});
   else map.setView([data.center.latitude,data.center.longitude],14);
   boundsKey=nextBoundsKey;
 }
};
window.addEventListener('message',event=>{if(event.source!==window.parent)return;try{const data=typeof event.data==='string'?JSON.parse(event.data):event.data;if(data.type==='halovat-map-update')window.updateHalovatMap(data.payload);}catch{}});
send({type:'ready'});
}
</script></body></html>`;
