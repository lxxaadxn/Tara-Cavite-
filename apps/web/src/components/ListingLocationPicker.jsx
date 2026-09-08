import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { greenLeafletPinIcon } from '../lib/leafletGreenPin';

/** Cavite's rough centre, for listings that have no pin yet. */
const DEFAULT_CENTER = [14.2456, 120.8781];

/**
 * Drag-to-adjust pin for the owner's own listing. Mirrors the admin catalog
 * picker: drag the marker or click the map to move it.
 */
export function ListingLocationPicker({ lat, lng, onPick }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    if (!elRef.current) return undefined;

    const hasPin = Number.isFinite(lat) && Number.isFinite(lng);
    const center = hasPin ? [lat, lng] : DEFAULT_CENTER;

    const map = L.map(elRef.current, { zoomControl: true }).setView(center, hasPin ? 16 : 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, { draggable: true, icon: greenLeafletPinIcon }).addTo(map);
    marker.on('dragend', () => {
      const p = marker.getLatLng();
      onPickRef.current(p.lat, p.lng);
    });
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onPickRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;
    markerRef.current = marker;
    // The map often mounts inside a panel that is still settling its width.
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 120);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount once; the effect below follows later coordinate changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const current = marker.getLatLng();
    // Skip the echo of a drag the owner just finished, or the view fights them.
    if (Math.abs(current.lat - lat) < 1e-7 && Math.abs(current.lng - lng) < 1e-7) return;
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng]);

  return <div ref={elRef} className="h-[320px] w-full" />;
}
