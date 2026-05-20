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
import { greenLeafletPinIcon } from '../lib/leafletGreenPin';

/**
 * @param {{ id: string; name: string; lat: number; lng: number }[]} places
 * @param {{ lat: number; lng: number } | null} [userLocation]
 * @param {(p: { id: string; name: string; lat: number; lng: number }) => void} [onMarkerClick]
 * @param {(p: { id: string; name: string; lat: number; lng: number }) => void} [onMarkerHover]
 * @param {() => void} [onMarkerHoverEnd]
 */
export function PlacesLeafletMap({ places, userLocation, onMarkerClick, onMarkerHover, onMarkerHoverEnd }) {
  const containerRef = useRef(null);
  const clickRef = useRef(onMarkerClick);
  const hoverRef = useRef(onMarkerHover);
  const hoverEndRef = useRef(onMarkerHoverEnd);

  useEffect(() => {
    clickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  useEffect(() => {
    hoverRef.current = onMarkerHover;
  }, [onMarkerHover]);

  useEffect(() => {
    hoverEndRef.current = onMarkerHoverEnd;
  }, [onMarkerHoverEnd]);

  useEffect(() => {
    if (!containerRef.current) return;

    const valid = (places ?? []).filter(
      (p) => p.lat != null && p.lng != null && Number.isFinite(p.lat) && Number.isFinite(p.lng)
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

    const hasUserLocation =
      userLocation?.lat != null &&
      userLocation?.lng != null &&
      Number.isFinite(userLocation.lat) &&
      Number.isFinite(userLocation.lng);

    if (valid.length === 0 && !hasUserLocation) {
      map.setView(CAVITE_MAP_CENTER, CAVITE_MAP_DEFAULT_ZOOM);
    } else {
      valid.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon: greenLeafletPinIcon }).addTo(layer);
        m.bindPopup(String(p.name || 'Establishment'));
        m.on('click', () => clickRef.current?.(p));
        m.on('mouseover', () => hoverRef.current?.(p));
        m.on('mouseout', () => hoverEndRef.current?.());
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
      map.panInsideBounds(CAVITE_MAP_BOUNDS, { animate: false });
    }

    const unlockViewport = lockMapToCaviteViewport(map);

    return () => {
      unlockViewport();
      map.remove();
    };
  }, [places, userLocation]);

  return <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full min-h-[320px]" />;
}
