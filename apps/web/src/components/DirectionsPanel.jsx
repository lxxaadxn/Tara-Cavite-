import { useEffect, useMemo, useState } from 'react';
import { RouteLeafletMap } from './RouteLeafletMap';
import { fetchDrivingRoute } from '../lib/fetchOsrmRoute';
import { googleMapsDirectionsUrl } from '../lib/osmUrls';

function numericSeed(value, fallback = 42) {
  const digits = Number(String(value ?? '').replace(/\D/g, '').slice(-4));
  return Number.isFinite(digits) && digits > 0 ? digits : fallback;
}

function buildFallbackRoute(seedId, distanceKmHint) {
  const seed = numericSeed(seedId, 84);
  const baseDistance =
    Number.isFinite(distanceKmHint) && distanceKmHint > 0
      ? distanceKmHint
      : 2 + (seed % 14) * 0.55;
  const baseMinutes = Math.max(1, Math.round(baseDistance * 6.2));
  return {
    id: 'main-road',
    label: 'Main road',
    mode: 'Via main roads',
    distanceKm: Number(baseDistance.toFixed(1)),
    durationMin: baseMinutes,
    traffic: 'Moderate',
    accent: 'bg-sky-500',
    color: '#2563eb',
  };
}

/**
 * Directions popup (map + driving corridor) for establishment detail.
 */
export function DirectionsPanel({
  onClose,
  destinationName,
  destinationAddress,
  destinationLat,
  destinationLng,
  userCoords,
  fallbackDistanceKm,
  seedId = 'route',
}) {
  const [osrmDriving, setOsrmDriving] = useState(null);

  const mapsUrl = googleMapsDirectionsUrl(destinationLat, destinationLng, 'driving', null);

  useEffect(() => {
    if (destinationLat == null || destinationLng == null || !userCoords) {
      setOsrmDriving(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const from = { lat: userCoords.lat, lng: userCoords.lng };
        const to = { lat: destinationLat, lng: destinationLng };
        const d = await fetchDrivingRoute(from, to);
        if (!cancelled) setOsrmDriving(d);
      } catch {
        if (!cancelled) setOsrmDriving(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destinationLat, destinationLng, userCoords?.lat, userCoords?.lng]);

  const fallbackRoute = useMemo(
    () => buildFallbackRoute(seedId, fallbackDistanceKm),
    [seedId, fallbackDistanceKm]
  );

  const displayRoute = useMemo(() => {
    if (osrmDriving) {
      return {
        id: 'main-road',
        label: 'Main road',
        mode: 'Via main roads',
        distanceKm: Number((osrmDriving.distanceM / 1000).toFixed(1)),
        durationMin: Math.max(1, Math.round(osrmDriving.durationS / 60)),
        traffic: 'Moderate',
        accent: 'bg-sky-500',
        color: '#2563eb',
      };
    }
    return fallbackRoute;
  }, [osrmDriving, fallbackRoute]);

  const destEnd =
    destinationLat != null && destinationLng != null
      ? { lat: destinationLat, lng: destinationLng }
      : null;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-5 py-4">
        <h3 className="min-w-0 truncate font-['Poppins',sans-serif] text-lg font-semibold tracking-tight text-neutral-900">
          Directions
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
          aria-label="Close directions"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="px-5 py-5">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,200px)_minmax(0,1fr)] lg:gap-0 lg:divide-x lg:divide-neutral-100">
          <aside className="flex flex-col gap-4 lg:pr-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">From</p>
              <p className="mt-1 text-sm font-semibold text-neutral-900">Your location</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">To</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-neutral-900">{destinationName}</p>
              {destinationAddress ? (
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{destinationAddress}</p>
              ) : null}
            </div>
          </aside>

          <div className="lg:pl-5">
            {destEnd ? (
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                <RouteLeafletMap
                  className="h-[300px] w-full sm:h-[380px] lg:h-[460px]"
                  start={userCoords}
                  end={destEnd}
                  routeId={displayRoute?.id ?? 'main-road'}
                  lineColor={displayRoute?.color ?? '#10A37F'}
                />
              </div>
            ) : null}
          </div>
        </div>

        {mapsUrl && mapsUrl !== '#' ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-xl bg-[#10A37F] px-4 text-base font-semibold text-white transition hover:bg-[#168F7A]"
          >
            Open in Google Maps
          </a>
        ) : null}
      </div>
    </div>
  );
}
