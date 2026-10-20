import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { useCallback, useState } from 'react';
import { foregroundLocation } from '../services/foregroundLocation';
import { createHeadingFilter, headingDelta, HEADING_STABILITY } from '../domain/compassHeading';

type Point = { latitude: number; longitude: number };
type Reading = { heading: number | null; accuracy: number; trueNorth: boolean; source: string; tilt: number };
const empty: Reading = { heading: null, accuracy: 0, trueNorth: false, source: '', tilt: 0 };
export function useCompass(city: Point) {
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [reading, setReading] = useState(empty);
  const [status, setStatus] = useState<'waiting' | 'ready' | 'permission' | 'unavailable' | 'no_sensor'>('waiting');
  const [generation, setGeneration] = useState(0);

  useFocusEffect(useCallback(() => {
    let disposed = false;
    let run = generation;
    let subscription: { remove(): void } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let settleTimer: ReturnType<typeof setInterval> | undefined;
    let permissionRequested = false;
    let permissionRequest: ReturnType<typeof Location.requestForegroundPermissionsAsync> | undefined;
    const locationPermission = async () => {
      // Even an already-granted Android request can briefly open an Activity.
      // Never request again on the AppState resume caused by that Activity.
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted || current.canAskAgain === false) return current;
      if (!permissionRequested) {
        permissionRequested = true;
        permissionRequest = Location.requestForegroundPermissionsAsync();
      }
      return permissionRequest ?? current;
    };
    const stop = () => {
      run++; subscription?.remove(); subscription = undefined; clearTimeout(timer); clearInterval(settleTimer); settleTimer = undefined;
    };
    const start = async () => {
      stop();
      const current = run;
      const filterHeading = createHeadingFilter();
      const alive = () => !disposed && current === run;
      setReading(empty); setStatus('waiting'); setPosition(null);
      if (Platform.OS === 'web') { setStatus('unavailable'); return; }
      // Use the original Expo heading watcher. A slow GPS fix must not delay it.
      const locate = async () => {
        const value = await foregroundLocation();
        if (!alive()) return;
        setPosition(value);
      };
      try {
        const permission = await locationPermission();
        if (!alive()) return;
        if (!permission.granted) { setStatus('permission'); return; }
        void locate().catch(() => undefined);
        timer = setTimeout(() => { if (alive()) setStatus('unavailable'); }, 8000);
        const watcher = await Location.watchHeadingAsync(value => {
          if (!alive()) return;
          const realNorth = Number.isFinite(value.trueHeading) && value.trueHeading >= 0;
          const raw = realNorth ? value.trueHeading : value.magHeading;
          if (!Number.isFinite(raw) || raw < 0) return;
          clearTimeout(timer);
          clearInterval(settleTimer); settleTimer = undefined;
          const publish = () => {
            if (!alive()) return true;
            const heading = filterHeading(raw, Date.now());
            setReading(previous => previous.heading === heading && previous.accuracy === value.accuracy && previous.trueNorth === realNorth
              ? previous : { heading, accuracy: value.accuracy, trueNorth: realNorth, source: 'expo_location', tilt: 0 });
            setStatus('ready');
            return Math.abs(headingDelta(heading, raw)) <= HEADING_STABILITY;
          };
          // Expo can stop emitting when the phone stops. Finish the turn even
          // when no second sensor callback arrives, then stop the timer.
          if (!publish()) settleTimer = setInterval(() => {
            if (publish()) { clearInterval(settleTimer); settleTimer = undefined; }
          }, 50);
        }, () => { if (alive()) { clearInterval(settleTimer); settleTimer = undefined; setReading(empty); setStatus('unavailable'); } });
        if (alive()) subscription = watcher; else watcher.remove();
      } catch { if (alive()) { clearTimeout(timer); setStatus('unavailable'); } }
    };
    if (AppState.currentState === 'active') void start();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void start(); else { stop(); setReading(empty); }
    });
    return () => { disposed = true; stop(); listener.remove(); };
  }, [generation]));

  return { coordinates: position?.coords ?? city, gpsAccuracy: position?.coords.accuracy ?? null,
    heading: reading.heading, headingAccuracy: reading.accuracy, trueNorth: reading.trueNorth,
    sensorSource: reading.source, tilt: reading.tilt, status, restart: () => setGeneration(value => value + 1) };
}
