export type MosquePlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

export type MosqueMapProps = {
  center: { latitude: number; longitude: number };
  places: MosquePlace[];
  onSelect: (id: string) => void;
};
