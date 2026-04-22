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
 * @param {{ lat: number; lng: number } | null} [userLocation]
 * @param {(p: { id: string; name: string; lat: number; lng: number }) => void} [onMarkerClick]
 */
export function PlacesLeafletMap({ places, userLocation, onMarkerClick }) {
  const containerRef = useRef(null);
  const clickRef = useRef(onMarkerClick);
  clickRef.current = onMarkerClick;

  useEffect(() => {
    if (!containerRef.current) return;

    const valid = (places ?? []).filter((p) => p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng));
    const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const layer = L.layerGroup().addTo(map);

    const hasUserLocation =
      userLocation?.lat != null &&
      userLocation?.lng != null &&
      Number.isFinite(userLocation.lat) &&
      Number.isFinite(userLocation.lng);

    if (valid.length === 0 && !hasUserLocation) {
      map.setView([14.28, 120.95], 10);
    } else {
      valid.forEach((p) => {
        const m = L.marker([p.lat, p.lng]).addTo(layer);
        m.on('click', () => clickRef.current?.(p));
      });

      if (hasUserLocation) {
        const userLatLng = [userLocation.lat, userLocation.lng];
        L.circleMarker(userLatLng, {
          radius: 8,
          color: '#ffffff',
          weight: 2,
          fillColor: '#2563eb',
          fillOpacity: 1,
        })
          .addTo(layer)
          .bindPopup('You are here');

        L.circle(userLatLng, {
          radius: 220,
          color: '#2563eb',
          weight: 1,
          fillColor: '#2563eb',
          fillOpacity: 0.12,
        }).addTo(layer);
      }

      const boundsPoints = valid.map((p) => [p.lat, p.lng]);
      if (hasUserLocation) boundsPoints.push([userLocation.lat, userLocation.lng]);
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }

    return () => {
      map.remove();
    };
  }, [places, userLocation]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full min-h-[320px] z-0" />;
}
