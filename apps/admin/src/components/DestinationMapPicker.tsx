import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon2x from 'leaflet/dist/images/marker-icon-2x.png';
import icon from 'leaflet/dist/images/marker-icon.png';
import shadow from 'leaflet/dist/images/marker-shadow.png';
import styles from './DestinationMapPicker.module.css';

const DEFAULT_CENTER: L.LatLngExpression = [14.2456, 120.8781];

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x,
  iconUrl: icon,
  shadowUrl: shadow,
});

type Props = {
  lat: string;
  lng: string;
  onPick: (lat: number, lng: number) => void;
};

export function DestinationMapPicker({ lat, lng, onPick }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!elRef.current) return;

    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    const has = Number.isFinite(la) && Number.isFinite(ln);
    const center = has ? ([la, ln] as L.LatLngExpression) : DEFAULT_CENTER;

    const map = L.map(elRef.current, { zoomControl: true }).setView(center, has ? 15 : 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, { draggable: true }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onPickRef.current(p.lat, p.lng);
    });
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng);
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    requestAnimationFrame(() => map.invalidateSize());
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 120);

    // Mount once per instance; parent remounts via `key` when the dialog opens with new context.
    return () => {
      window.clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      marker.setLatLng([la, ln]);
      map.setView([la, ln], Math.max(map.getZoom(), 14));
    }
  }, [lat, lng]);

  return (
    <div className={styles.wrap}>
      <p className={styles.hint}>OpenStreetMap preview. Click the map or drag the pin to set coordinates.</p>
      <div ref={elRef} className={styles.map} />
    </div>
  );
}
