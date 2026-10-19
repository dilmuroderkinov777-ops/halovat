"""Build the bundled OSM mosque catalogue from a Geofabrik Uzbekistan extract.

Usage: python extract-mosques.py input.osm.pbf output.json
Requires pyosmium (a developer tool; not an app dependency).
"""
import json
import sys
from datetime import datetime, timezone
import osmium


def is_mosque(tags):
    religion = tags.get('religion', '').lower()
    return tags.get('building') == 'mosque' or (
        tags.get('amenity') == 'place_of_worship'
        and ('muslim' in religion or 'islam' in religion)
    )


class Mosques(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.places = {}

    def add(self, kind, ident, tags, coords):
        if not coords:
            return
        latitude = (min(p[0] for p in coords) + max(p[0] for p in coords)) / 2
        longitude = (min(p[1] for p in coords) + max(p[1] for p in coords)) / 2
        name = next((tags.get(key, '').strip() for key in (
            'name:uz-Latn', 'name:uz', 'name', 'name:ru', 'official_name', 'alt_name'
        ) if tags.get(key, '').strip()), 'Nomi ko‘rsatilmagan masjid')
        address = ', '.join(filter(None, (
            tags.get('addr:street'), tags.get('addr:housenumber'),
            tags.get('addr:district') or tags.get('addr:city')
        )))
        ident = f'{kind}/{ident}'
        self.places[ident] = dict(id=ident, name=name,
            latitude=round(latitude, 7), longitude=round(longitude, 7),
            **({'wikimediaCommons': tags.get('wikimedia_commons')} if tags.get('wikimedia_commons', '').startswith('File:') else {}),
            **({'wikidata': tags.get('wikidata')} if tags.get('wikidata', '').startswith('Q') else {}),
            **({'address': address} if address else {}))

    def node(self, node):
        if is_mosque(node.tags) and node.location.valid():
            self.add('node', node.id, node.tags, [(node.lat, node.lon)])

    def way(self, way):
        if is_mosque(way.tags):
            self.add('way', way.id, way.tags,
                [(node.lat, node.lon) for node in way.nodes if node.location.valid()])

    def area(self, area):
        if not area.from_way() and is_mosque(area.tags):
            self.add('relation', area.orig_id(), area.tags,
                [(node.lat, node.lon) for ring in area.outer_rings()
                 for node in ring if node.location.valid()])


if __name__ == '__main__':
    source, target = sys.argv[1:3]
    with osmium.io.Reader(source) as reader:
        timestamp = reader.header().get('osmosis_replication_timestamp')
    handler = Mosques()
    handler.apply_file(source, locations=True, idx='flex_mem')
    result = dict(
        source='OpenStreetMap contributors / Geofabrik Uzbekistan extract',
        sourceUrl='https://download.geofabrik.de/asia/uzbekistan.html',
        license='ODbL-1.0',
        osmTimestamp=timestamp,
        generatedAt=datetime.now(timezone.utc).isoformat(),
        places=sorted(handler.places.values(), key=lambda place: place['id']),
    )
    if not result['places']:
        raise RuntimeError('Empty catalogue; refusing to overwrite the app data')
    with open(target, 'w', encoding='utf-8') as output:
        json.dump(result, output, ensure_ascii=False, separators=(',', ':'))
    print(f"Extracted {len(result['places'])} mosque records. OSM timestamp: {timestamp}")
