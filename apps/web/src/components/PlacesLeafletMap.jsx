import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import './PlacesLeafletMap.css';
import {
  CAVITE_LEAFLET_MAP_OPTIONS,
  CAVITE_MAP_BOUNDS,
  CAVITE_MAP_CENTER,
  CAVITE_MAP_DEFAULT_ZOOM,
  CAVITE_MAP_MAX_ZOOM,
  lockMapToCaviteViewport,
} from '../lib/caviteMapBounds';
import { CAVITOUR_USER_DOT_GREEN, greenLeafletPinIcon, greenUserDotOptions } from '../lib/leafletGreenPin';
import { leafletPinIconOptions, resolveMapPinUrlForLabel } from 'cavitour-shared/mapPins';
import { useSiteContent } from '../lib/useSiteContent';
import { supabase } from '../lib/supabase';

/**
 * @param {{ id: string; name: string; lat: number; lng: number; ntdp_category?: string | null }[]} places
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
  const cms = useSiteContent();
  const [lookups, setLookups] = useState([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('ntdp_categories')
      .select('ntdp_category_id, ntdp_category_name')
      .then(({ data }) => {
        if (cancelled) return;
        setLookups(
          (data ?? []).map((r) => ({
            tableId: r.ntdp_category_id,
            label: r.ntdp_category_name,
          }))
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

    const clusters = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: CAVITE_MAP_MAX_ZOOM,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
        return L.divIcon({
          html: `<span>${count}</span>`,
          className: `cavitour-cluster cavitour-cluster--${size}`,
          iconSize: L.point(size === 'large' ? 48 : size === 'medium' ? 40 : 34, size === 'large' ? 48 : size === 'medium' ? 40 : 34),
        });
      },
    });
    map.addLayer(clusters);

    const iconCache = new Map();

    const hasUserLocation =
      userLocation?.lat != null &&
      userLocation?.lng != null &&
      Number.isFinite(userLocation.lat) &&
      Number.isFinite(userLocation.lng);

    if (valid.length === 0 && !hasUserLocation) {
      map.setView(CAVITE_MAP_CENTER, CAVITE_MAP_DEFAULT_ZOOM);
    } else {
      valid.forEach((p) => {
        const label = p.ntdp_category || '';
        const cacheKey = label || '_default';
        let icon = iconCache.get(cacheKey);
        if (!icon) {
          const url = resolveMapPinUrlForLabel(cms, lookups, label);
          icon = url ? L.icon(leafletPinIconOptions(url, label)) : greenLeafletPinIcon;
          iconCache.set(cacheKey, icon);
        }
        const m = L.marker([p.lat, p.lng], { icon });
        m.bindPopup(String(p.name || 'Establishment'));
        m.on('click', () => clickRef.current?.(p));
        m.on('mouseover', () => hoverRef.current?.(p));
        m.on('mouseout', () => hoverEndRef.current?.());
        clusters.addLayer(m);
      });

      if (hasUserLocation) {
        const userLatLng = [userLocation.lat, userLocation.lng];
        L.circleMarker(userLatLng, greenUserDotOptions({ radius: 8 }))
          .addTo(map)
          .bindPopup('You are here');

        L.circle(userLatLng, {
          radius: 220,
          color: CAVITOUR_USER_DOT_GREEN,
          weight: 1,
          fillColor: CAVITOUR_USER_DOT_GREEN,
          fillOpacity: 0.12,
        }).addTo(map);
      }

      const boundsPoints = valid.map((p) => [p.lat, p.lng]);
      if (hasUserLocation) boundsPoints.push([userLocation.lat, userLocation.lng]);
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      map.panInsideBounds(CAVITE_MAP_BOUNDS, { animate: false });
    }

    const unlockViewport = lockMapToCaviteViewport(map);
    const el = containerRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            map.invalidateSize(true);
          })
        : null;
    if (el && ro) ro.observe(el);

    return () => {
      ro?.disconnect();
      unlockViewport();
      map.remove();
    };
  }, [places, userLocation, cms, lookups]);

  return <div ref={containerRef} className="absolute inset-0 z-0 h-full w-full min-h-[320px]" />;
}
