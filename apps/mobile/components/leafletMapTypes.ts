export type LeafletMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

export type LeafletMapViewProps = {
  markers: LeafletMarker[];
  /** Transport terminals (e.g. mock terminals) — shown as green dots on the map. */
  terminals?: LeafletMarker[];
  userLocation: { lat: number; lng: number } | null;
  onMarkerPress: (id: string, _name?: string) => void;
  style?: object;
};
