import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { defaultMapPinDataUrl, leafletPinIconOptions } from 'cavitour-shared/mapPins';
import styles from './CustomPinsPage.module.css';

const CENTER: L.LatLngExpression = [14.2456, 120.8781];

export type MappedPlacePin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  ntdpLabel: string;
  iconUrl: string;
};

function leafletIcon(url: string, label: string) {
  return L.icon(leafletPinIconOptions(url || defaultMapPinDataUrl(label), label));
}

export function PinsPreviewMap({ places }: { places: MappedPlacePin[] }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!elRef.current) return;
    const map = L.map(elRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(CENTER, 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    const sizeTimer = window.setTimeout(() => map.invalidateSize(), 80);
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize();
          })
        : null;
    if (ro && elRef.current) ro.observe(elRef.current);
    return () => {
      window.clearTimeout(sizeTimer);
      ro?.disconnect();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    let cancelled = false;

    const run = async () => {
      const resolved = await Promise.all(
        places.map(async (pin) => {
          if (!pin.iconUrl || pin.iconUrl.startsWith('data:')) return pin;
          const ok = await new Promise<boolean>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = pin.iconUrl;
          });
          return ok ? pin : { ...pin, iconUrl: defaultMapPinDataUrl(pin.ntdpLabel) };
        })
      );
      if (cancelled || !layerRef.current || !mapRef.current) return;
      layer.clearLayers();
      const bounds: L.LatLngExpression[] = [];
      const iconCache = new Map<string, L.Icon>();
      resolved.forEach((pin) => {
        const cacheKey = pin.iconUrl || pin.ntdpLabel;
        let icon = iconCache.get(cacheKey);
        if (!icon) {
          icon = leafletIcon(pin.iconUrl, pin.ntdpLabel);
          iconCache.set(cacheKey, icon);
        }
        const latlng: L.LatLngExpression = [pin.lat, pin.lng];
        bounds.push(latlng);
        L.marker(latlng, { icon, title: pin.name })
          .bindPopup(`${pin.name}${pin.ntdpLabel ? ` — ${pin.ntdpLabel}` : ''}`)
          .addTo(layer);
      });
      if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds), { padding: [36, 36], maxZoom: 13 });
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 13);
      } else {
        map.setView(CENTER, 11);
      }
      requestAnimationFrame(() => map.invalidateSize());
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [places]);

  return <div ref={elRef} className={styles.map} role="img" aria-label="NTDP category pins on the catalog map" />;
}
