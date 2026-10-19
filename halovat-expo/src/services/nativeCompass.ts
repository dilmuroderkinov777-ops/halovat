import { NativeModule, requireOptionalNativeModule } from 'expo';

export type HeadingReading = {
  status: 'ready' | 'unavailable';
  heading?: number;
  accuracy?: number;
  trueNorth?: boolean;
  source?: string;
  tilt?: number;
  reason?: string;
};
declare class CompassModule extends NativeModule<{ onHeading: (event: HeadingReading) => void }> {
  getStatus(): HeadingReading & { running: boolean; lastReadingAt: number };
  start(latitude: number, longitude: number): Promise<{ available: boolean; source: string }>;
  setLocation(latitude: number, longitude: number): Promise<void>;
  stop(): Promise<void>;
}
export const nativeCompass = requireOptionalNativeModule<CompassModule>('HalovatCompass');

let queue: Promise<unknown> = Promise.resolve();
export function compassCommand<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.catch(() => undefined).then(action);
  queue = next;
  return next;
}
