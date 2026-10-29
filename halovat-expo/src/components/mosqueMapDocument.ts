// Geographic markers stay inside Leaflet on native and web, including while panning.
import { leafletCSS, leafletJS } from '../data/leafletAssets';
export const mosqueMapDocument = `<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>${leafletCSS}</style>
<style>
html,body,#map{height:100%;width:100%;margin:0;background:#e9f0eb}
.leaflet-control-attribution{font-size:9px!important}
.leaflet-popup-content{font:13px sans-serif}
.leaflet-control-zoom{border:1px solid #dbe4dd!important;border-radius:10px!important;overflow:hidden;box-shadow:0 2px 8px #173d2820}
.mosque-pin{background:none;border:0;display:flex;align-items:center;justify-content:center}
.mosque-pin span{box-sizing:border-box;width:30px;height:30px;border:2px solid #fff;border-radius:50%;background:#08724e;color:#fff;display:flex;align-items:center;justify-content:center;font:600 13px -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 2px 5px #173d2830}
.mosque-pin.active span{background:#003527;box-shadow:0 0 0 4px #ffffff80,0 2px 5px #173d2830}
.failure{padding:70px 24px;font:14px sans-serif;color:#345}
</style>
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
 data.places.forEach((place,index)=>{
   const active=place.id===data.selectedId;
   const icon=L.divIcon({className:'mosque-pin'+(active?' active':''),html:'<span>'+(index+1)+'</span>',iconSize:[44,44],iconAnchor:[22,22],popupAnchor:[0,-18]});
   let entry=markers.get(place.id);
   if(!entry){
     const marker=L.marker([place.latitude,place.longitude],{icon,title:place.name}).addTo(map);
     marker.on('click',()=>send({type:'select',id:place.id}));
     entry={marker};markers.set(place.id,entry);
   }
   entry.marker.setLatLng([place.latitude,place.longitude]);
   entry.marker.setIcon(icon);
   entry.marker.setZIndexOffset(active?1000:0);
   const title=document.createElement('strong');title.textContent=place.name;entry.marker.bindPopup(title);
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
