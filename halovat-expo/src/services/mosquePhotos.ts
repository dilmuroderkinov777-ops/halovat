import type { MosquePlace } from '../components/mosqueMap.types';
import { distanceBetween } from './mosques';
import photoCatalogue from '../data/mosque-photo-catalogue.json';

type PhotoCredit = { url: string; source: string; artist: string; license: string; licenseUrl: string; title: string };
const remotePhotos: Record<string, PhotoCredit> = photoCatalogue;

// Match the actual landmark and coordinates, including OSM's longer/Cyrillic names.
// A mosque with a similar name in another city must not receive this photograph.
const photos = [
  { point: { latitude: 41.335, longitude: 69.274 }, pattern: /\bminor\b|минор/i, source: require('../../assets/mosque-minor.jpg') },
  { point: { latitude: 41.337, longitude: 69.240 }, pattern: /hazrati\s+(imom|imam)|hasti?\s*imom|ҳазрати|хазрати/i, source: require('../../assets/mosque-hazrati-imom.jpg') },
  { point: { latitude: 41.327, longitude: 69.211 }, pattern: /ko.?kcha|к[ўуо]кча|shayx\s+zayniddin|шейх\s+зайниддин/i, source: require('../../assets/mosque-kokcha.jpg') },
];

function localPhoto(place: MosquePlace) {
  const normalized = place.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return photos.find(photo => photo.pattern.test(normalized) && distanceBetween(photo.point, place) < 2000)?.source;
}

export function mosquePhoto(place: MosquePlace) {
  // RN 0.86's Android Image forwards custom headers only for an array source.
  // A single object silently drops User-Agent and Wikimedia rejects generic OkHttp.
  return localPhoto(place) ?? (remotePhotos[place.id] ? [{
    uri: remotePhotos[place.id].url,
    headers: { 'User-Agent': 'Halovat/1.0.1 (Android; uz.halovat.expo; mosque photographs)' },
  }] : undefined);
}
export function mosquePhotoCredit(place: MosquePlace) {
  return localPhoto(place) ? undefined : remotePhotos[place.id];
}
