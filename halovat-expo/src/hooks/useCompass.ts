import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import { Animated, AppState, Easing, Platform } from 'react-native';
import { useCallback, useState } from 'react';
import { foregroundLocation } from '../services/foregroundLocation';
import { createHeadingFilter, headingDelta } from '../domain/compassHeading';
import { createCompassMotion } from '../domain/compassMotion';
import { compassCommand, nativeCompass } from '../services/nativeCompass';

type Point = { latitude: number; longitude: number };
type Reading = { heading: number | null; accuracy: number; trueNorth: boolean; source: string; tilt: number };
type Sample = Reading & { heading: number };
const empty: Reading = { heading: null, accuracy: 0, trueNorth: false, source: '', tilt: 0 };
const MOTION_INTERVAL = 100;
const READING_INTERVAL = 250;

export function useCompass(city: Point) {
  const [position, setPosition] = useState<Location.LocationObject | null>(null);
  const [reading, setReading] = useState(empty);
  const [status, setStatus] = useState<'waiting' | 'ready' | 'permission' | 'unavailable' | 'no_sensor'>('waiting');
  const [generation, setGeneration] = useState(0);
  const [animatedHeading] = useState(() => new Animated.Value(0));
  const [motion] = useState(createCompassMotion);
  const restart = useCallback(() => setGeneration(value => value + 1), []);

  useFocusEffect(useCallback(() => {
    let disposed = false;
    let run = generation;
    let subscription: { remove(): void } | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let motionTimer: ReturnType<typeof setTimeout> | undefined;
    let readingTimer: ReturnType<typeof setTimeout> | undefined;
    let staleTimer: ReturnType<typeof setTimeout> | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    let permissionRequested = false;
    let permissionRequest: ReturnType<typeof Location.requestForegroundPermissionsAsync> | undefined;
    const locationPermission = async () => {
      // A granted Android request can still open an Activity and trigger resume.
      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted || current.canAskAgain === false) return current;
      if (!permissionRequested) {
        permissionRequested = true;
        permissionRequest = Location.requestForegroundPermissionsAsync();
      }
      return permissionRequest ?? current;
    };
    const stop = () => {
      run++;
      subscription?.remove(); subscription = undefined;
      clearTimeout(timer); clearTimeout(motionTimer); clearTimeout(readingTimer); clearTimeout(staleTimer);
      motionTimer = readingTimer = undefined;
      animation?.stop(); animation = undefined;
      motion.publish(null);
    };
    const start = async () => {
      stop();
      const current = run;
      const alive = () => !disposed && current === run;
      let filterHeading = createHeadingFilter();
      let pending: Sample | undefined;
      let processed: Reading = empty;
      let published: Reading = empty;
      let target: number | undefined;
      let lastMotionAt = -Infinity;
      let lastReadingAt = -Infinity;
      let ready = false;
      const androidCompass = Platform.OS === 'android' ? nativeCompass : null;
      const commitReading = () => {
        readingTimer = undefined;
        if (!alive()) return;
        if (published.heading === processed.heading && published.accuracy === processed.accuracy && published.trueNorth === processed.trueNorth && published.source === processed.source && published.tilt === processed.tilt) return;
        published = processed;
        lastReadingAt = Date.now();
        setReading(published);
      };
      const publish = () => {
        motionTimer = undefined;
        if (!alive() || !pending) return;
        const sample = pending;
        pending = undefined;
        const referenceChanged = processed.heading !== null && processed.trueNorth !== sample.trueNorth;
        const confidenceChanged = processed.accuracy !== sample.accuracy || referenceChanged;
        if (referenceChanged) filterHeading = createHeadingFilter();
        const heading = filterHeading(sample.heading);
        lastMotionAt = Date.now();
        if (target === undefined || referenceChanged || (processed.accuracy === 0 && sample.accuracy > 0)) {
          animation?.stop(); animation = undefined;
          target = heading;
          animatedHeading.setValue(target);
        } else {
          const delta = headingDelta(target, heading);
          if (delta !== 0) {
            target += delta;
            // Preserve the shared native value for native compass consumers;
            // the 3D scene gets bounded targets through motion below.
            animation?.stop();
            animation = Animated.timing(animatedHeading, {
              toValue: target, duration: MOTION_INTERVAL, easing: Easing.linear,
              useNativeDriver: true, isInteraction: false,
            });
            animation.start();
          }
        }
        const motionChanged = processed.heading !== heading || confidenceChanged;
        processed = { ...sample, heading };
        if (motionChanged) motion.publish({ heading, accuracy: sample.accuracy, trueNorth: sample.trueNorth });
        if (!ready) { ready = true; setStatus('ready'); }
        if (published.heading === null || confidenceChanged || Date.now() - lastReadingAt >= READING_INTERVAL) {
          clearTimeout(readingTimer); readingTimer = undefined;
          commitReading();
        } else if (readingTimer === undefined && published.heading !== heading) {
          readingTimer = setTimeout(commitReading, READING_INTERVAL - (Date.now() - lastReadingAt));
        }
      };
      const fail = () => {
        if (!alive()) return;
        stop();
        setReading(empty); setStatus('unavailable');
      };
      const invalidate = () => {
        if (!alive()) return;
        clearTimeout(timer); clearTimeout(motionTimer); clearTimeout(readingTimer); clearTimeout(staleTimer);
        motionTimer = readingTimer = undefined;
        animation?.stop(); animation = undefined;
        pending = undefined; target = undefined; ready = false;
        processed = published = empty;
        filterHeading = createHeadingFilter();
        motion.publish(null);
        setReading(empty); setStatus('unavailable');
      };
      const receive = (sample: Sample) => {
        if (!alive() || !Number.isFinite(sample.heading) || sample.heading < 0) return;
        clearTimeout(timer);
        if (androidCompass) {
          // Native rotation sensors publish a heartbeat even when stationary.
          // Clear a dead stream, but keep its listener for native recovery.
          clearTimeout(staleTimer);
          staleTimer = setTimeout(invalidate, 3000);
        }
        pending = sample;
        if (processed.accuracy !== sample.accuracy || processed.trueNorth !== sample.trueNorth || Date.now() - lastMotionAt >= MOTION_INTERVAL) {
          clearTimeout(motionTimer); motionTimer = undefined;
          publish();
        } else if (motionTimer === undefined) {
          motionTimer = setTimeout(publish, MOTION_INTERVAL - (Date.now() - lastMotionAt));
        }
      };
      setReading(empty); setStatus('waiting'); setPosition(null);
      if (Platform.OS === 'web') { setStatus('unavailable'); return; }
      const locate = async () => {
        const value = await foregroundLocation();
        if (!alive()) return;
        if (androidCompass) await compassCommand(async () => {
          if (alive()) await androidCompass.setLocation(value.coords.latitude, value.coords.longitude);
        });
        if (alive()) setPosition(value);
      };
      try {
        const permission = await locationPermission();
        if (!alive()) return;
        if (!permission.granted && !androidCompass) { setStatus('permission'); return; }
        // A slow GPS fix must not delay the native north-referenced heading.
        if (permission.granted) void locate().catch(() => undefined);
        timer = setTimeout(() => { if (alive()) setStatus('unavailable'); }, 8000);
        if (androidCompass) {
          let nativeStarted = false;
          const listener = androidCompass.addListener('onHeading', value => {
            if (!alive() || !nativeStarted) return;
            if (value.status !== 'ready') { invalidate(); return; }
            receive({ heading: value.heading ?? NaN, accuracy: value.accuracy ?? 0,
              trueNorth: value.trueNorth === true, source: value.source ?? 'native', tilt: value.tilt ?? 0 });
          });
          // Queue teardown immediately, including when start is still resolving.
          // A late old start/stop must never stop the next focused session.
          subscription = { remove: () => {
            listener.remove();
            void compassCommand(() => androidCompass.stop()).catch(() => undefined);
          } };
          const result = await compassCommand(() => alive()
            ? androidCompass.start(city.latitude, city.longitude)
            : Promise.resolve({ available: false }));
          nativeStarted = result.available;
          if (alive() && !result.available) { stop(); setReading(empty); setStatus('no_sensor'); }
          return;
        }
        const watcher = await Location.watchHeadingAsync(value => {
          const trueNorth = Number.isFinite(value.trueHeading) && value.trueHeading >= 0;
          const heading = trueNorth ? value.trueHeading : value.magHeading;
          receive({ heading, accuracy: value.accuracy, trueNorth, source: 'expo_location', tilt: 0 });
        }, fail);
        if (alive()) subscription = watcher; else watcher.remove();
      } catch { fail(); }
    };
    if (AppState.currentState === 'active') void start();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') void start(); else { stop(); setReading(empty); }
    });
    return () => { disposed = true; stop(); listener.remove(); };
  }, [animatedHeading, city.latitude, city.longitude, generation, motion]));

  return { coordinates: position?.coords ?? city, gpsAccuracy: position?.coords.accuracy ?? null,
    animatedHeading, motion, heading: reading.heading, headingAccuracy: reading.accuracy, trueNorth: reading.trueNorth,
    sensorSource: reading.source, tilt: reading.tilt, status, restart };
}
