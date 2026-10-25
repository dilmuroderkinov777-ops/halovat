const KAABA = { latitude: 21.4225, longitude: 39.8262 };

export function radians(degrees: number) { return degrees * Math.PI / 180; }

export function qiblaBearing(latitude: number, longitude: number) {
  const lat = radians(latitude);
  const kaabaLat = radians(KAABA.latitude);
  const deltaLongitude = radians(KAABA.longitude - longitude);
  const y = Math.sin(deltaLongitude) * Math.cos(kaabaLat);
  const x = Math.cos(lat) * Math.sin(kaabaLat) - Math.sin(lat) * Math.cos(kaabaLat) * Math.cos(deltaLongitude);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// Place a geographic bearing relative to the top of the phone's screen.
// Clockwise is positive; crossing north must keep the shortest turn.
export function relativeBearing(bearing: number, heading: number) {
  return ((bearing - heading + 540) % 360 + 360) % 360 - 180;
}
