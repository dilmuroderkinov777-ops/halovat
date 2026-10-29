# Qibla scene

The screen uses an offline Three.js scene inside the app's existing WebView. No Spline, remote model service, map API or extra native module is required.

The fixed character and palm planters are detailed, transparent, pre-rendered sprites. The marble plane, Kaaba, direction path, foot marker, light, shadows and reflection are live 3D. The person and camera remain fixed; geographic objects rotate around the person's feet. The numeric bearing and haptic alignment use the same true-north sensor readings.

Reference: `design/qibla-proposals/12-third-person-isometric-map.png` at the repository root. Asset generation specifications: `assets/qibla/scene/generation-prompts.json`. Assets were generated with built-in ImageGen and encoded locally as WebP, preserving alpha.

## Editing and rebuilding

- Scene: `src/scene/qibla/scene.ts`, models/materials: `models.ts`, reflection: `reflection.ts`.
- Bridge and error handling: `src/components/QiblaScene.native.tsx` and `QiblaScene.web.tsx`.
- Native labels/actions: `src/components/QiblaCompass.tsx`, `QiblaCalibrationAction.tsx`.
- After editing the renderer or image assets, run `npm run build:qibla`. Commit the generated `src/data/qiblaSceneAssets.ts` with its source changes.
- `node scripts/build-qibla-scene.cjs --check` detects stale generated output. The bundle embeds all four textures, so it works offline.

## Verification

```sh
npm run typecheck
npm run lint
node scripts/check-compass.cjs
node scripts/check-qibla-alignment.cjs
node scripts/check-mosque-screen.cjs
node scripts/check-qibla-scene.cjs
node scripts/check-qibla-page.cjs
```

The last two checks require an installed Playwright Chromium. Set `PLAYWRIGHT_MODULE` to an existing Playwright module and `PLAYWRIGHT_BROWSERS_PATH` if using a non-default browser location. The page test additionally requires local Metro on port 8081 (or `QIBLA_PREVIEW_ORIGIN` pointing to localhost). It substitutes a sensor fixture only in its isolated browser, without changing production files or the user's app data. Screenshots go to `.expo/qibla-check/`.

Rendering is capped at 30 FPS and device pixel ratio 1.5; idle and background screens stop drawing. Haptic feedback is emitted once on reliable alignment within 8°, re-armed outside 12°, with a cooldown. Automated tests verify the actual hook with a mocked haptic module. Physical compass calibration, native touch behavior and physical haptic strength still require an iOS/Android device check.
