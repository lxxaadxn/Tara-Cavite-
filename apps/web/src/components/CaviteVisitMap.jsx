import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { foldLguName } from 'cavitour-shared/lguKind';
import {
  CAVITE_LEAFLET_MAP_OPTIONS,
  CAVITE_MAP_BOUNDS,
  CAVITE_MAP_CENTER,
  CAVITE_MAP_DEFAULT_ZOOM,
  CAVITE_MAP_MAX_ZOOM,
  lockMapToCaviteViewport,
} from '../lib/caviteMapBounds';

const GEOJSON_URL = '/maps/cavite-lgus.geojson';
const MASK_FILL = '#F1F7F6';

function matchVisitCount(counts, featureName, featureFold) {
  const fold = featureFold || foldLguName(featureName);
  if (counts.has(fold)) return counts.get(fold);
  for (const [key, n] of counts) {
    if (key === fold || key.includes(fold) || fold.includes(key)) return n;
  }
  return 0;
}

function reverseRing(ring) {
  return [...ring].reverse();
}

/** World polygon with Cavite LGU exteriors as holes so OSM outside the province is covered. */
function buildCaviteMaskGeoJSON(featureCollection) {
  const worldRing = [
    [-180, -90],
    [180, -90],
    [180, 90],
    [-180, 90],
    [-180, -90],
  ];
  const holes = [];
  for (const feature of featureCollection?.features ?? []) {
    const geometry = feature?.geometry;
    if (!geometry) continue;
    if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates?.[0])) {
      holes.push(reverseRing(geometry.coordinates[0]));
    } else if (geometry.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates ?? []) {
        if (Array.isArray(polygon?.[0])) holes.push(reverseRing(polygon[0]));
      }
    }
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [worldRing, ...holes],
    },
  };
}

/**
 * Interactive Cavite LGU map — visited municipalities light up teal.
 * Surrounding provinces are masked so only Cavite shows.
 * @param {{ cityMun?: string }[]} visits
 */
export function CaviteVisitMap({ visits }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const maskRef = useRef(null);
  const geoRef = useRef(null);

  const counts = useMemo(() => {
    const map = new Map();
    for (const visit of visits ?? []) {
      const raw = String(visit.cityMun ?? '').trim();
      if (!raw) continue;
      const key = foldLguName(raw);
      if (!key) continue;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return map;
  }, [visits]);

  const visitedCount = useMemo(() => counts.size, [counts]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      attributionControl: false,
      ...CAVITE_LEAFLET_MAP_OPTIONS,
    }).setView(CAVITE_MAP_CENTER, CAVITE_MAP_DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: CAVITE_MAP_MAX_ZOOM,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const unlock = lockMapToCaviteViewport(map, CAVITE_MAP_BOUNDS);
    mapRef.current = map;
    layerRef.current = null;
    maskRef.current = null;

    requestAnimationFrame(() => map.invalidateSize());
    const t = window.setTimeout(() => map.invalidateSize(), 150);

    return () => {
      window.clearTimeout(t);
      unlock();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      maskRef.current = null;
      geoRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    (async () => {
      try {
        let geo = geoRef.current;
        if (!geo) {
          const res = await fetch(GEOJSON_URL);
          if (!res.ok) throw new Error('Could not load Cavite map');
          geo = await res.json();
          if (cancelled) return;
          geoRef.current = geo;
        }
        if (cancelled) return;

        if (!maskRef.current) {
          const mask = L.geoJSON(buildCaviteMaskGeoJSON(geo), {
            style: {
              stroke: false,
              fillColor: MASK_FILL,
              fillOpacity: 1,
              interactive: false,
            },
          }).addTo(map);
          maskRef.current = mask;
          mask.bringToFront();
        }

        if (layerRef.current) {
          map.removeLayer(layerRef.current);
        }

        const next = L.geoJSON(geo, {
          style: (feature) => {
            const name = feature?.properties?.name || '';
            const fold = feature?.properties?.fold || foldLguName(name);
            const n = matchVisitCount(counts, name, fold);
            const active = n > 0;
            return {
              color: active ? '#0F5C4C' : '#94A3B8',
              weight: active ? 1.5 : 1,
              opacity: 1,
              fillColor: active ? '#1B8A70' : '#E2E8F0',
              fillOpacity: active ? 0.72 : 0.35,
            };
          },
          onEachFeature: (feature, lyr) => {
            const name = feature?.properties?.name || 'Place';
            const fold = feature?.properties?.fold || foldLguName(name);
            const n = matchVisitCount(counts, name, fold);
            lyr.bindTooltip(
              n > 0 ? `${name} · ${n} visit${n === 1 ? '' : 's'}` : `${name} · not visited yet`,
              { sticky: true, direction: 'top', opacity: 0.95 }
            );
          },
        }).addTo(map);
        layerRef.current = next;

        if (maskRef.current) {
          maskRef.current.bringToFront();
        }

        const bounds = next.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds.pad(0.02), { animate: false });
        }
        map.invalidateSize();
      } catch {
        /* keep empty map */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [counts]);

  return (
    <section className="rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
      <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold text-neutral-900 sm:text-base">
        Cavite travel map
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        {visitedCount
          ? `Areas you've reached light up in teal. Hover a city or municipality for visit counts.`
          : 'Reach or check in to destinations — visited cities and municipalities will light up here.'}
      </p>
      <div
        ref={containerRef}
        className="mt-4 h-64 w-full overflow-hidden rounded-xl bg-[#F1F7F6] ring-1 ring-neutral-200/80 sm:h-80"
        role="img"
        aria-label="Map of Cavite cities and municipalities"
      />
      <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-neutral-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#1B8A70]" aria-hidden />
          Visited
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#E2E8F0] ring-1 ring-neutral-300" aria-hidden />
          Not yet
        </span>
      </div>
    </section>
  );
}
