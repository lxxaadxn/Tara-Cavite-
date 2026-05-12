import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * User location + nearby terminals as circle markers; classic pin only for the selected terminal.
 * @param {{ id: string; name: string; lat: number; lng: number }[]} terminals
 * @param {string | null} selectedId
 * @param {{ lat: number; lng: number } | null} userLocation
 * @param {(id: string) => void} [onSelectTerminal]
 */
export function TerminalsLeafletMap({ terminals, selectedId, userLocation, onSelectTerminal }) {
  const containerRef = useRef(null);
  const selectRef = useRef(onSelectTerminal);

  useEffect(() => {
    selectRef.current = onSelectTerminal;
  }, [onSelectTerminal]);

  useEffect(() => {
    if (!containerRef.current) return;

    const valid = (terminals ?? []).filter(
      (t) => t.lat != null && t.lng != null && Number.isFinite(t.lat) && Number.isFinite(t.lng)
    );
    const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layer = L.layerGroup().addTo(map);

    const hasUser =
      userLocation?.lat != null &&
      userLocation?.lng != null &&
      Number.isFinite(userLocation.lat) &&
      Number.isFinite(userLocation.lng);

    if (hasUser) {
      const userLatLng = [userLocation.lat, userLocation.lng];
      L.circleMarker(userLatLng, {
        radius: 9,
        color: '#ffffff',
        weight: 2,
        fillColor: '#2563eb',
        fillOpacity: 1,
      })
        .addTo(layer)
        .bindPopup('You are here');

      L.circle(userLatLng, {
        radius: 3500,
        color: '#2563eb',
        weight: 1,
        fillColor: '#2563eb',
        fillOpacity: 0.08,
      }).addTo(layer);
    }

    const sel = selectedId != null ? String(selectedId) : null;

    valid.forEach((t) => {
      const idStr = String(t.id);
      if (sel && idStr === sel) {
        const m = L.marker([t.lat, t.lng]).addTo(layer);
        m.bindPopup(String(t.name || 'Terminal'));
        m.on('click', () => selectRef.current?.(idStr));
        return;
      }
      const c = L.circleMarker([t.lat, t.lng], {
        radius: 7,
        fillColor: '#7EA00E',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.92,
      }).addTo(layer);
      c.bindPopup(String(t.name || 'Terminal'));
      c.on('click', () => selectRef.current?.(idStr));
    });

    const boundsPoints = valid.map((t) => [t.lat, t.lng]);
    if (hasUser) boundsPoints.push([userLocation.lat, userLocation.lng]);

    if (boundsPoints.length === 0) {
      map.setView([14.28, 120.95], 10);
    } else {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
    }

    return () => {
      map.remove();
    };
  }, [terminals, selectedId, userLocation]);

  return <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full min-h-[320px]" />;
}
