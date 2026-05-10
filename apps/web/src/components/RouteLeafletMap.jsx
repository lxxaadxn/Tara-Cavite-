import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const ROAD_BLUE = '#1d4ed8';

function buildRoutePoints(start, end, curve = 0.18) {
  const midLat = (start.lat + end.lat) / 2;
  const midLng = (start.lng + end.lng) / 2;
  const dLat = end.lat - start.lat;
  const dLng = end.lng - start.lng;
  const normalLat = -dLng;
  const normalLng = dLat;
  const mag = Math.hypot(normalLat, normalLng) || 1;
  const offsetLat = (normalLat / mag) * curve * 0.04;
  const offsetLng = (normalLng / mag) * curve * 0.04;
  return [
    [start.lat, start.lng],
    [midLat + offsetLat, midLng + offsetLng],
    [end.lat, end.lng],
  ];
}

function drawSegmentPolylines(map, points, lineColor) {
  if (!points || points.length < 2) return;
  L.polyline(points, {
    color: lineColor,
    weight: 11,
    opacity: 0.18,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map);
  L.polyline(points, {
    color: '#ffffff',
    weight: 8,
    opacity: 0.96,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map);
  L.polyline(points, {
    color: lineColor,
    weight: 5,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
  }).addTo(map);
}

/**
 * @param {Object} props
 * @param {{ lat: number; lng: number } | null} [props.start]
 * @param {{ lat: number; lng: number }} props.end
 * @param {string} [props.routeId]
 * @param {string} [props.lineColor] — markers / accent; road line uses OSRM blue for multi-segment
 * @param {Array<Array<[number, number]>>} [props.externalSegments] — precomputed [lat,lng][] per OSRM leg (terminal chain)
 * @param {string} [props.className] — tailwind height/width (default h-[350px] w-full)
 */
export function RouteLeafletMap({ start, end, routeId = 'fastest', lineColor = '#0ea5e9', externalSegments, className }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !end) return;

    const fallbackStart = {
      lat: end.lat - 0.018,
      lng: end.lng - 0.024,
    };
    const from = start ?? fallbackStart;

    const map = L.map(containerRef.current, { scrollWheelZoom: true, zoomControl: true });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    const drawEndpoints = () => {
      L.circleMarker([from.lat, from.lng], {
        radius: 7,
        color: '#ffffff',
        weight: 3,
        fillColor: lineColor,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('Start');

      L.circleMarker([end.lat, end.lng], {
        radius: 8,
        color: '#ffffff',
        weight: 3,
        fillColor: lineColor,
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup('Destination');
    };

    const drawRoute = (points, durationSec = null) => {
      drawEndpoints();
      drawSegmentPolylines(map, points, ROAD_BLUE);

      if (Number.isFinite(durationSec) && points.length > 2) {
        const midpoint = points[Math.floor(points.length / 2)];
        const minutes = Math.max(1, Math.round(durationSec / 60));
        const badge = L.divIcon({
          className: 'route-duration-badge',
          html: `<span style="display:inline-block;background:#fff;border:1px solid #d4d4d8;border-radius:999px;padding:4px 8px;font:600 12px Inter,sans-serif;color:#111827;box-shadow:0 2px 8px rgba(0,0,0,0.14);">${minutes} min</span>`,
          iconSize: [72, 28],
          iconAnchor: [36, 14],
        });
        L.marker(midpoint, { icon: badge, interactive: false }).addTo(map);
      }

      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    };

    const drawMultiFromSegments = (segmentArrays) => {
      drawEndpoints();
      const flat = [];
      for (const seg of segmentArrays) {
        if (!seg || seg.length < 2) continue;
        drawSegmentPolylines(map, seg, ROAD_BLUE);
        for (const p of seg) flat.push(p);
      }
      if (flat.length > 1) {
        map.fitBounds(L.latLngBounds(flat), { padding: [40, 40], maxZoom: 14 });
      } else {
        map.fitBounds(L.latLngBounds([[from.lat, from.lng], [end.lat, end.lng]]), { padding: [40, 40], maxZoom: 14 });
      }
    };

    const useExternal =
      Array.isArray(externalSegments) &&
      externalSegments.length > 0 &&
      externalSegments.some((seg) => seg && seg.length > 1);

    const curveByRoute = {
      'main-road': 0.06,
      fastest: 0.08,
      scenic: 0.28,
      budget: -0.22,
    };
    const fallbackPoints = buildRoutePoints(from, end, curveByRoute[routeId] ?? 0.12);

    let cancelled = false;

    if (useExternal) {
      drawMultiFromSegments(externalSegments);
      return () => {
        cancelled = true;
        map.remove();
      };
    }

    (async () => {
      try {
        const fromPair = `${from.lng},${from.lat}`;
        const endPair = `${end.lng},${end.lat}`;
        const base = `https://router.project-osrm.org/route/v1`;
        const tryProfile = async (profile) => {
          const url = `${base}/${profile}/${fromPair};${endPair}?alternatives=false&overview=full&steps=false&geometries=geojson`;
          const res = await fetch(url);
          if (!res.ok) throw new Error('Route request failed');
          const payload = await res.json();
          const route = payload?.routes?.[0];
          const coords = route?.geometry?.coordinates;
          if (!Array.isArray(coords) || coords.length < 2) throw new Error('No route geometry');
          return { roadPoints: coords.map(([lng, lat]) => [lat, lng]), duration: route?.duration ?? null };
        };

        let result;
        try {
          result = await tryProfile('driving');
        } catch {
          result = await tryProfile('foot');
        }
        if (cancelled) return;
        drawRoute(result.roadPoints, result.duration);
      } catch {
        if (cancelled) return;
        drawRoute(fallbackPoints);
      }
    })();

    return () => {
      cancelled = true;
      map.remove();
    };
  }, [start, end, routeId, lineColor, externalSegments]);

  return <div ref={containerRef} className={className ?? 'h-[350px] w-full'} />;
}
