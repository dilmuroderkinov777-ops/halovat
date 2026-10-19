# Bundled Uzbekistan mosque data

`mosques-uzbekistan.json` contains 2,347 OpenStreetMap objects identified as mosques. These are real OSM records, not demonstration locations. Nearby node/way duplicates are merged by the service; the record count is not a count of unique operational mosques.

## Attribution and source

© OpenStreetMap contributors. This database is available under the [Open Database License (ODbL) 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See [OSM copyright](https://www.openstreetmap.org/copyright).

- Distributor: [Geofabrik Uzbekistan extract](https://download.geofabrik.de/asia/uzbekistan.html).
- Input: [uzbekistan-261009.osm.pbf](https://download.geofabrik.de/asia/uzbekistan-261009.osm.pbf).
- Data timestamp: `2026-10-09T20:21:04Z`.
- Verified input MD5: `de1f2818aa074c59a6c2263e638174f4` (matches Geofabrik's published checksum).
- Generated database and extraction script are included in this project. Database licensing is separate from application code licensing.

## Regeneration

Use Python with `osmium` (pyosmium), a developer dependency:

```text
python scripts/extract-mosques.py uzbekistan-261009.osm.pbf src/data/mosques-uzbekistan.json
```

The extractor accepts nodes, ways and multipolygon relations tagged `building=mosque`, or `amenity=place_of_worship` with Muslim/Islam religion. Ways and relation areas use their bounding-box center, matching Overpass's center output. Names prefer Uzbek tags, with other existing names as fallbacks. Contributor account metadata is excluded. The snapshot is refreshed by regenerating this file and shipping an app update; a user's Refresh action only caches results for their local area.

## Runtime behavior and limits

- The app shows saved live results (30 minutes) or bundled nearby results first. No network request is required for areas with bundled entries.
- Nearby search uses a 7 km straight-line radius and displays at most 100 results, ordered by distance. The map renders up to 35 markers and always includes the selected result.
- An explicit Refresh, or an area without bundled results, queries Overpass mirrors with bounded timeouts, an identifying User-Agent and per-host backoff. Failure retains nearby cached/bundled results with a visible warning.
- OSM coverage, names, addresses and active status may be incomplete or outdated. An unlabelled record remains unlabelled; no invented name or amenity is added.
- The catalogue does not include photographs. Existing curated local photos are retained; other cards honestly show that no photo is available.
- Map tiles and loading the Leaflet library still require internet. The mosque list can work offline independently of the map.
