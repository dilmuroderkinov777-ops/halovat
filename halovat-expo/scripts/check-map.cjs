const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const catalogue = require('../src/data/mosques-uzbekistan.json');
function load(relative, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const sandbox = { exports: {}, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name.endsWith('.jpg')) return name;
    throw new Error('Unexpected dependency: ' + name);
  } };
  vm.runInNewContext(compiled, sandbox);
  return sandbox.exports;
}
const assets = load('src/data/leafletAssets.ts');
const { mosqueMapDocument } = load('src/components/mosqueMapDocument.ts', { '../data/leafletAssets': assets });
assert.equal(/<script[^>]+src=/i.test(mosqueMapDocument), false, 'Map engine must load without a CDN');
for (const [, script] of mosqueMapDocument.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(script);
assert.ok(mosqueMapDocument.includes('tile.openstreetmap.org'));
assert.ok(mosqueMapDocument.includes('preferCanvas:true'));

// Run the map bridge against Leaflet adapters, without opening a browser.
const fits = [], layers = [];
const map = { setView() { return this; }, invalidateSize() {}, fitBounds(points, options) { fits.push({ points, options }); } };
const L = {
  map: () => map, control: { zoom: () => ({ addTo() {} }) }, tileLayer: () => ({ addTo() {} }),
  circleMarker: () => {
    const layer = { removed: false, addTo() { layers.push(this); return this; }, on() {},
      bindPopup() { return this; }, setLatLng() {}, setStyle() {}, remove() { this.removed = true; } };
    return layer;
  },
};
const window = { L, parent: { postMessage() {} }, addEventListener() {} };
const bridge = [...mosqueMapDocument.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)[1];
vm.runInNewContext(bridge, { L, window, document: { createElement: () => ({}) } });
const center = { latitude: 41, longitude: 69 };
const visible = catalogue.places.slice(0, 3);
window.updateHalovatMap({ center, places: visible });
assert.equal(fits.length, 1);
assert.equal(fits[0].points.length, 4, 'Compact map must fit the center and all three visible mosques');
assert.equal(fits[0].options.maxZoom, 15);
assert.equal(layers.filter(layer => !layer.removed).length, 3);
window.updateHalovatMap({ center, places: visible, selectedId: visible[1].id });
assert.equal(fits.length, 1, 'Selecting a marker must preserve map panning/zoom');
window.updateHalovatMap({ center, places: catalogue.places.slice(0, 6) });
assert.equal(fits.at(-1).points.length, 7, 'Show more must fit the newly visible results');
window.updateHalovatMap({ center, places: visible });
assert.equal(layers.filter(layer => !layer.removed).length, 3, 'Refresh must remove hidden markers');
window.updateHalovatMap({ center, places: [] });
assert.equal(layers.filter(layer => !layer.removed).length, 0);

const distanceBetween = (a, b) => Math.hypot(a.latitude - b.latitude, (a.longitude - b.longitude) * 0.75) * 111_000;
const remotePhotos = require('../src/data/mosque-photo-catalogue.json');
const { mosquePhoto } = load('src/services/mosquePhotos.ts', { './mosques': { distanceBetween }, '../data/mosque-photo-catalogue.json': remotePhotos });
const remoteSource = mosquePhoto({ id: 'way/790949485', name: 'Orifjonboy Masjidi', latitude: 41.3172335, longitude: 69.2510216 });
assert.ok(Array.isArray(remoteSource), 'RN 0.86 Android drops network headers on a single-object source');
assert.match(remoteSource[0].headers['User-Agent'], /^Halovat\//, 'Wikimedia rejects generic OkHttp requests');
const minor = catalogue.places.find(p => p.id === 'relation/4827007');
assert.ok(mosquePhoto(minor).endsWith('mosque-minor.jpg'), 'OSM Cyrillic Minor name must have its photo');
const imam = catalogue.places.find(p => p.id === 'relation/19934455');
assert.ok(mosquePhoto(imam).endsWith('mosque-hazrati-imom.jpg'));
assert.equal(mosquePhoto({ ...imam, id: 'unknown-namesake', latitude: 39, longitude: 66 }), undefined, 'A namesake in another city must not receive the Tashkent photo');
for (const [id, photo] of Object.entries(remotePhotos)) {
  assert.ok(catalogue.places.some(place => place.id === id));
  assert.ok(photo.artist && photo.license && photo.source.startsWith('https://commons.wikimedia.org/'));
  assert.match(photo.url, /^https:\/\/(upload|thumb)\.wikimedia\.org\//);
}
assert.ok(mosquePhoto({ ...minor, name: 'Minor jome’ masjidi' }));
console.log('PASS: offline Leaflet runtime, embedded script syntax, canvas map, Cyrillic/long landmark names and geographic photo matching.');
