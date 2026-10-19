# Mosque lookup and locked iPhone notifications — 2026-10-10

## User report

iPhone 15 Pro Max, iOS 26.4, Expo Go: the app opens and a notification arrives with the screen locked, but vibration and flashlight do not activate. The mosque map displays; mosque results are missing. The user reports the same mosque issue on Android.

## Findings and changes

- The original native Overpass request omitted an identifying User-Agent. Live diagnostic requests returned HTTP 406 on `overpass-api.de`, and HTTP 429 with a meaningful User-Agent requirement on `overpass.private.coffee`. Identified follow-up requests still encountered HTTP 500/504/timeouts. No successful live response was claimed.
- Added 2,347 real OSM objects from the official Geofabrik Uzbekistan extract, timestamp `2026-10-09T20:21:04Z`. Original PBF checksum matched the official checksum. Nearby results now appear without a network request where the bundled catalogue has coverage. They remain available if Refresh fails.
- Refresh uses an identifying User-Agent, independent mirror retries, per-host backoff and bounded timeouts. Invalid coordinates and damaged/expired caches are rejected. Empty API responses no longer erase known local results.
- The selected mosque remains on the map even when outside the first 35 markers. UI shows the saved/updated list date and a Refresh action.
- Added iOS vibration, notification sound, LED flash and Focus instructions with Apple links. Expo Go instructions target Expo Go permissions. No background camera/vibration workaround was added; locked-device alert behavior is controlled by iOS settings.

## Checks completed

- `node scripts/check-mosques.cjs`: passed against the actual TypeScript service with mocked storage/network adapters. Covers offline lookup, radius/sort, IDs, invalid coordinates, cache, per-host rate limits, mirror failover, empty/error fallback, shared requests and abort timeouts.
- Bundled results within 7 km: Toshkent 98, Samarqand 46, Buxoro 51, Farg‘ona 10, Nukus 5. These are geographic lookup results, not confirmation of opening hours or operational status.
- `npx tsc --noEmit`: passed.
- `npx expo lint`: passed.
- `npx expo export --platform ios --output-dir dist-ios-check`: passed (Hermes bundle).
- Android `:app:assembleRelease`: passed in 1m 35s.
- Test APK: `C:\Users\dilmu\Desktop\Halovat\Halovat-mosques-offline-2026-10-10.apk`, 71,522,445 bytes.
- APK SHA-256: `b3dfa1efa40d026d0b974cc21d200ef9c72956b9d46b15f7c577d7eff80ffba1`.

## Physical retest still needed

Reload Halovat in iPhone Expo Go and open Masjidlar. Then enable the settings described in Profil → Vibratsiya, chiroq va Focus and send a test notification with the phone locked. No claim is made that iPhone vibration/flash is physically verified after these instructions.

Install the new APK as an update for the Android mosque retest. This remains a test build with the existing signing configuration, not a production store release.

Map tiles/Leaflet require internet. OSM names/coverage and photos remain incomplete; attribution and snapshot regeneration details are in `src/data/MOSQUE_DATA.md`.
