// Build-time enrichment only. No location or API key is sent by the app.
const fs = require('node:fs');
const places = require('../src/data/mosques-uzbekistan.json').places;
const headers = { 'User-Agent': 'Halovat/1.0 (mosque catalogue; https://github.com/dilmuroderkinov777-ops/halovat)' };
async function json(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${response.status}: ${new URL(url).hostname}`);
  return response.json();
}
const plain = value => String(value ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();
async function main() {
  const ids = [...new Set(places.map(p => p.wikidata).filter(id => /^Q\d+$/.test(id ?? '')))];
  const entities = (await json('https://www.wikidata.org/w/api.php?' + new URLSearchParams({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims', format: 'json' }))).entities;
  const files = places.map(place => {
    const name = place.wikimediaCommons || (entities[place.wikidata]?.claims?.P18?.find(claim => claim.rank !== 'deprecated')?.mainsnak?.datavalue?.value);
    return name ? { place, title: name.startsWith('File:') ? name : `File:${name}` } : null;
  }).filter(Boolean);
  const titles = [...new Set(files.map(item => item.title.replaceAll('_', ' ')))];
  const photos = {};
  for (let offset = 0; offset < titles.length; offset += 20) {
    const payload = await json('https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
      action: 'query', format: 'json', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '640', titles: titles.slice(offset, offset + 20).join('|'),
    }));
    for (const page of Object.values(payload.query?.pages ?? {})) {
      const info = page.imageinfo?.[0]; if (!info?.thumburl || !info.descriptionurl) continue;
      const metadata = info.extmetadata ?? {};
      const license = plain(metadata.LicenseShortName?.value);
      const artist = plain(metadata.Artist?.value);
      if (!license || !artist || !/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(info.thumburl)) continue;
      for (const item of files.filter(item => item.title.replaceAll('_', ' ') === page.title)) {
        photos[item.place.id] = { url: info.thumburl, source: info.descriptionurl, artist, license, licenseUrl: metadata.LicenseUrl?.value ?? '', title: page.title };
      }
    }
  }
  if (!Object.keys(photos).length) throw Error('No verified image metadata returned; refusing to replace catalogue');
  fs.writeFileSync('src/data/mosque-photo-catalogue.json', JSON.stringify(photos, null, 2) + '\n');
  console.log(`Verified ${Object.keys(photos).length} mosque photos with attribution from explicit OSM/Wikidata links.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
