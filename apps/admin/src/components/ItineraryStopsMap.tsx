import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './ItineraryStopsMap.module.css';

const DEFAULT_CENTER: L.LatLngExpression = [14.2456, 120.8781];

export type ItineraryMapPoint = {
  lat: number;
  lng: number;
  label: string;
  index: number;
};

function numberedIcon(n: number) {
  return L.divIcon({
    className: styles.pinWrap,
    html: `<div class="${styles.pin}"><span class="${styles.pinNum}">${n}</span></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -24],
  });
}

export function ItineraryStopsMap({
  points,
  sizeKey,
  fill,
  compact,
  showHint = true,
}: {
  points: ItineraryMapPoint[];
  sizeKey?: string | number;
  fill?: boolean;
  compact?: boolean;
  showHint?: boolean;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true }).setView(DEFAULT_CENTER, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    requestAnimationFrame(() => map.invalidateSize());
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 120);
    return () => {
      window.clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, [sizeKey]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const latlngs: L.LatLngExpression[] = [];
    for (const p of points) {
      if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
      const ll: L.LatLngExpression = [p.lat, p.lng];
      latlngs.push(ll);
      L.marker(ll, { icon: numberedIcon(p.index), title: p.label })
        .bindPopup(`<strong>${p.index}. ${p.label}</strong>`)
        .addTo(layer);
    }
    if (latlngs.length === 1) {
      map.setView(latlngs[0], 14);
    } else if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [36, 36], maxZoom: 14 });
    } else {
      map.setView(DEFAULT_CENTER, 11);
    }
    requestAnimationFrame(() => map.invalidateSize());
  }, [points]);

  return (
    <div className={`${styles.wrap} ${fill ? styles.fill : ''} ${compact ? styles.compact : ''}`}>
      {showHint ? (
        <p className={styles.hint}>
          {points.length
            ? 'Markers follow linked establishments (Stop 1, 2, 3…).'
            : 'Link establishments to plot numbered markers.'}
        </p>
      ) : null}
      <div ref={elRef} className={styles.map} />
    </div>
  );
}
