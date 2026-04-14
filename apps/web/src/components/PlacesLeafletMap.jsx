import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Reliable marker assets (avoids Vite path issues with leaflet images) */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * @param {{ id: string; name: string; lat: number; lng: number }[]} places
 * @param {(p: { id: string; name: string; lat: number; lng: number }) => void} [onMarkerClick]
 */
export function PlacesLeafletMap({ places, onMarkerClick }) {
  const containerRef = useRef(null);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;

  useEffect(() => {
    if (!containerRef.current) return;

    const valid = (places ?? []).filter((p) => p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const map = L.map(containerRef.current, { scrollWheelZoom: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);

    if (valid.length === 0) {
      map.setView([14.28, 120.95], 10);
    } else {
      valid.forEach((p) => {
        const m = L.marker([p.lat, p.lng]).addTo(layer);
        m.bindPopup(`<strong>${escapeHtml(p.name)}</strong>`);
        m.on('click', () => clickRef.current?.(p));
      });
      const bounds = L.latLngBounds(valid.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      map.remove();
    };
  }, [places]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full min-h-[320px] z-0" />;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
