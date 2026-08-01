import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CAVITE_LEAFLET_MAP_OPTIONS,
  CAVITE_MAP_BOUNDS,
  CAVITE_MAP_CENTER,
  CAVITE_MAP_DEFAULT_ZOOM,
  CAVITE_MAP_MAX_ZOOM,
  lockMapToCaviteViewport,
} from '../lib/caviteMapBounds';
import { CAVITOUR_USER_DOT_GREEN, greenLeafletPinIcon, greenUserDotOptions } from '../lib/leafletGreenPin';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/**
 * User location dot + terminal pins (green); selected terminal uses the default blue pin.
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
    const map = L.map(containerRef.current, {
      scrollWheelZoom: true,
      zoomControl: false,
      ...CAVITE_LEAFLET_MAP_OPTIONS,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: CAVITE_MAP_MAX_ZOOM,
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
      L.circleMarker(userLatLng, greenUserDotOptions({ radius: 9 }))
        .addTo(layer)
        .bindPopup('You are here');

      L.circle(userLatLng, {
        radius: 3500,
        color: CAVITOUR_USER_DOT_GREEN,
        weight: 1,
        fillColor: CAVITOUR_USER_DOT_GREEN,
        fillOpacity: 0.08,
      }).addTo(layer);
    }

    const sel = selectedId != null ? String(selectedId) : null;

    valid.forEach((t) => {
      const idStr = String(t.id);
      const isSelected = sel != null && idStr === sel;
      const m = L.marker(
        [t.lat, t.lng],
        isSelected ? { zIndexOffset: 1000 } : { icon: greenLeafletPinIcon }
      ).addTo(layer);
      m.bindPopup(String(t.name || 'Terminal'));
      m.on('click', () => selectRef.current?.(idStr));
    });

    const boundsPoints = valid.map((t) => [t.lat, t.lng]);
    if (hasUser) boundsPoints.push([userLocation.lat, userLocation.lng]);

    if (boundsPoints.length === 0) {
      map.setView(CAVITE_MAP_CENTER, CAVITE_MAP_DEFAULT_ZOOM);
    } else {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
      map.panInsideBounds(CAVITE_MAP_BOUNDS, { animate: false });
    }

    const unlockViewport = lockMapToCaviteViewport(map);

    return () => {
      unlockViewport();
      map.remove();
    };
  }, [terminals, selectedId, userLocation]);

  return <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full min-h-[320px]" />;
}
