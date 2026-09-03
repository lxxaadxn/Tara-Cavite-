export type LeafletMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  iconUrl?: string;
};

export type LeafletPreviewPoint = { x: number; y: number };

export type LeafletMapViewProps = {
  markers: LeafletMarker[];
  userLocation: { lat: number; lng: number } | null;
  onMarkerPress?: (id: string, _name?: string) => void;
  onMarkerPreview?: (id: string, point: LeafletPreviewPoint) => void;
  onMarkerPreviewEnd?: () => void;
  style?: object;
};
