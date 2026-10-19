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
