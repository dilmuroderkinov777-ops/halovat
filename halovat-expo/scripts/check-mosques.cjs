// Runs the real TypeScript service with isolated storage/network adapters.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const catalogue = require('../src/data/mosques-uzbekistan.json');
const compiled = ts.transpileModule(fs.readFileSync(path.join(root, 'src/services/mosques.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
const tashkent = { latitude: 41.2995, longitude: 69.2401 };
const london = { latitude: 51.5074, longitude: -0.1278 };
const response = (status, elements = [], retry = null) => ({
  ok: status >= 200 && status < 300, status,
  headers: { get: () => retry }, json: async () => ({ elements }),
});

function load({ raw = null, fetcher = async () => { throw new Error('Offline'); }, instantTimeout = false } = {}) {
  const calls = [];
  const writes = [];
  const storage = { getItem: async () => raw, setItem: async (key, value) => { writes.push({ key, value }); } };
  const sandbox = {
    exports: {}, AbortController,
    setTimeout: instantTimeout ? callback => { queueMicrotask(callback); return 0; } : setTimeout,
    clearTimeout: instantTimeout ? () => {} : clearTimeout,
    fetch: async (url, options) => { calls.push({ url, options }); return fetcher(url, options, calls.length); },
    require: name => {
      if (name === '@react-native-async-storage/async-storage') return { __esModule: true, default: storage };
      if (name === '../data/mosques-uzbekistan.json') return catalogue;
      throw new Error('Unexpected dependency: ' + name);
    },
  };
  vm.runInNewContext(compiled, sandbox, { filename: 'mosques.ts' });
  return { service: sandbox.exports, calls, writes };
}

async function main() {
  assert.equal(catalogue.places.length, 2347);
  assert.equal(catalogue.license, 'ODbL-1.0');
  assert.equal(new Set(catalogue.places.map(place => place.id)).size, catalogue.places.length);
  const offline = load();
  const coverage = [];
  for (const [name, point] of [
    ['Toshkent', tashkent],
    ['Samarqand', { latitude: 39.6542, longitude: 66.9597 }],
    ['Buxoro', { latitude: 39.7681, longitude: 64.4556 }],
    ['Farg‘ona', { latitude: 40.3864, longitude: 71.7864 }],
    ['Nukus', { latitude: 42.4602, longitude: 59.6166 }],
  ]) {
    const result = await offline.service.lookupNearbyMosques(point);
    assert.equal(result.source, 'bundled');
    assert.ok(result.places.length > 0 && result.places.length <= 100);
    assert.ok(result.places.some(place => place.name !== 'Nomi ko‘rsatilmagan masjid'));
    assert.equal(new Set(result.places.map(place => place.id)).size, result.places.length);
    result.places.forEach((place, index, all) => {
      assert.ok(place.distanceMeters <= 7000);
      if (index) assert.ok(all[index - 1].distanceMeters <= place.distanceMeters);
    });
    coverage.push(`${name}: ${result.places.length}`);
  }
  assert.equal(offline.calls.length, 0, 'Bundled searches must not wait for the network');
  assert.ok((await offline.service.cachedMosques(tashkent)).length > 0);
  assert.ok((await offline.service.fetchNearbyMosques(tashkent)).length > 0);
  for (const point of [{ latitude: NaN, longitude: 69 }, { latitude: 91, longitude: 69 }, { latitude: 41, longitude: -181 }]) {
    await assert.rejects(offline.service.lookupNearbyMosques(point), /koordinatalari/);
  }

  const elements = [
    { type: 'node', id: 1, lat: tashkent.latitude, lon: tashkent.longitude, tags: { 'name:uz': '  ', name: 'Haqiqiy masjid' } },
    { type: 'way', id: 2, center: { lat: tashkent.latitude, lon: tashkent.longitude }, tags: {} },
    { type: 'node', id: 3, lat: 99, lon: 69, tags: { name: 'Invalid coordinate' } },
    { type: 'node', id: 4, lat: 40, lon: 69, tags: { name: 'Too far' } },
  ];
  const mirror = load({ fetcher: async (url, options) => {
    assert.ok(options.headers['User-Agent'].startsWith('Halovat/'));
    assert.equal(options.headers.Accept, 'application/json');
    return url.includes('overpass-api.de') ? response(429, [], '60') : response(200, elements);
  } });
  const live = await mirror.service.lookupNearbyMosques(tashkent, true);
  assert.equal(mirror.calls.length, 2, 'Rate limiting one host must not block the mirror');
  assert.equal(live.source, 'live');
  assert.equal(live.places.length, 1, 'Duplicate and invalid/faraway places must be excluded');
  assert.equal(live.places[0].name, 'Haqiqiy masjid');
  assert.equal((await mirror.service.lookupNearbyMosques(tashkent)).source, 'cache');
  assert.equal(mirror.calls.length, 2, 'Fresh local cache must avoid network requests');
  await mirror.service.lookupNearbyMosques(tashkent, true);
  assert.equal(mirror.calls.length, 3, 'A backed-off host must be skipped during refresh');
  assert.ok(mirror.calls[2].url.includes('private.coffee'));
  assert.ok(mirror.writes.length > 0);

  for (const status of [406, 500, 200]) {
    const unavailable = load({ fetcher: async () => response(status) });
    const result = await unavailable.service.lookupNearbyMosques(tashkent, true);
    assert.equal(result.source, 'bundled');
    assert.ok(result.warning && result.places.length > 0, 'Failure or empty API response must retain local results');
    assert.equal(unavailable.calls.length, 2);
  }

  const corrupt = load({ raw: '{invalid JSON' });
  assert.equal((await corrupt.service.lookupNearbyMosques(tashkent)).source, 'bundled');
  const expired = load({ raw: JSON.stringify({ point: london, createdAt: Date.now() - 8 * 86400_000, places: [{ id: 'node/9', name: 'Old', ...london, amenities: [] }] }) });
  await assert.rejects(expired.service.lookupNearbyMosques(london));

  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const shared = load({ fetcher: async () => { await gate; return response(200, elements); } });
  const a = shared.service.lookupNearbyMosques(tashkent, true);
  const b = shared.service.lookupNearbyMosques(tashkent, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(shared.calls.length, 1, 'Simultaneous requests must share one network search');
  release();
  const [first, second] = await Promise.all([a, b]);
  assert.equal(first, second);

  const timedOut = load({ instantTimeout: true, fetcher: async (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => { const error = new Error('Timeout'); error.name = 'AbortError'; reject(error); });
  }) });
  const timeoutFallback = await timedOut.service.lookupNearbyMosques(tashkent, true);
  assert.equal(timeoutFallback.source, 'bundled');
  assert.ok(timeoutFallback.warning);
  assert.equal(timedOut.calls.length, 2);
  console.log('PASS: mosque catalogue, offline lookup, radius/sort, cache, validation, mirror/backoff, fallback, coalescing and timeouts.');
  console.log(coverage.join(' | '));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
