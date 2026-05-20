import { useEffect, useMemo, useState } from 'react';
import { RouteLeafletMap } from './RouteLeafletMap';
import { fetchDrivingRoute } from '../lib/fetchOsrmRoute';
import { buildCommuterGuideSteps } from 'cavitour-shared/commuterGuideBuilder';
import { planCommuterGuideForPlace } from '../lib/terminalTransitPlanner';
import { fetchRouteRowsForTerminal } from '../lib/terminalsFromSupabase';
import { supabase } from '../lib/supabase';
import { CommuterGuideSteps } from './CommuterGuideSteps';

const COMMUTER_DISCLAIMER =
  'Steps follow the mapped road (OSRM / OpenStreetMap), not live transit schedules. Confirm signs, fares, and stops with operators.';
const COMMUTER_FOOTNOTE = 'Roads and stops change — double-check locally, especially if you drive.';

function formatDuration(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes ? `${minutes} min` : ''}`.trim();
}

function numericSeed(value, fallback = 42) {
  const digits = Number(String(value ?? '').replace(/\D/g, '').slice(-4));
  return Number.isFinite(digits) && digits > 0 ? digits : fallback;
}

function mapTerminalRouteRows(rows) {
  return (rows ?? []).map((row) => {
    const route = Array.isArray(row.cavitour_routes) ? row.cavitour_routes[0] : row.cavitour_routes;
    const transport = Array.isArray(row.cavitour_transport_types)
      ? row.cavitour_transport_types[0]
      : row.cavitour_transport_types;
    return {
      routeName: route?.route_name?.trim() ?? '',
      origin: route?.origin?.trim() ?? '',
      destination: route?.destination?.trim() ?? '',
      transportName: transport?.transport_name?.trim() || 'Jeepney',
    };
  });
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
 * In-page directions (Map + commuter guide) matching establishment detail UX.
 */
export function DirectionsPanel({
  onClose,
  destinationName,
  destinationAddress,
  destinationLat,
  destinationLng,
  destMunicipality = null,
  userCoords,
  fallbackDistanceKm,
  seedId = 'route',
}) {
  const [routeSubTab, setRouteSubTab] = useState('routeMain');
  const [osrmDriving, setOsrmDriving] = useState(null);
  const [terminalPlan, setTerminalPlan] = useState(null);
  const [terminalPlanLoading, setTerminalPlanLoading] = useState(false);
  const [boardingRoutes, setBoardingRoutes] = useState([]);

  useEffect(() => {
    setRouteSubTab('routeMain');
  }, [destinationName, destinationLat, destinationLng]);

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

  useEffect(() => {
    if (destinationLat == null || destinationLng == null || !userCoords) {
      setTerminalPlan(null);
      setBoardingRoutes([]);
      setTerminalPlanLoading(false);
      return;
    }
    let cancelled = false;
    setTerminalPlanLoading(true);
    (async () => {
      try {
        const plan = await planCommuterGuideForPlace(supabase, userCoords, {
          lat: destinationLat,
          lng: destinationLng,
        });
        if (!cancelled) setTerminalPlan(plan);
      } catch {
        if (!cancelled) setTerminalPlan(null);
      } finally {
        if (!cancelled) setTerminalPlanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destinationLat, destinationLng, userCoords?.lat, userCoords?.lng]);

  useEffect(() => {
    const originId = terminalPlan?.originTerminal?.id;
    if (!originId) {
      setBoardingRoutes([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchRouteRowsForTerminal(supabase, originId);
        if (!cancelled) setBoardingRoutes(mapTerminalRouteRows(rows));
      } catch {
        if (!cancelled) setBoardingRoutes([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [terminalPlan?.originTerminal?.id]);

  const commuterGuideSteps = useMemo(
    () =>
      buildCommuterGuideSteps({
        userPt: userCoords,
        destPt:
          destinationLat != null && destinationLng != null
            ? { lat: destinationLat, lng: destinationLng }
            : null,
        destinationName,
        destMunicipality,
        terminalPlan: terminalPlanLoading ? null : terminalPlan,
        boardingRoutes,
        osrmSteps: osrmDriving?.steps ?? [],
      }),
    [
      userCoords,
      destinationLat,
      destinationLng,
      destinationName,
      destMunicipality,
      terminalPlan,
      terminalPlanLoading,
      boardingRoutes,
      osrmDriving?.steps,
    ]
  );

  const fallbackRoute = useMemo(
    () => buildFallbackRoute(seedId, fallbackDistanceKm),
    [seedId, fallbackDistanceKm]
  );

  const displayRoute = useMemo(() => {
    if (osrmDriving) {
      return {
        id: 'main-road',
        label: 'Main road',
        mode: 'OSRM driving corridor',
        distanceKm: Number((osrmDriving.distanceM / 1000).toFixed(1)),
        durationMin: Math.max(1, Math.round(osrmDriving.durationS / 60)),
        traffic: 'Moderate',
        accent: 'bg-sky-500',
        color: '#2563eb',
      };
    }
    return fallbackRoute;
  }, [osrmDriving, fallbackRoute]);

  const routeTimeline = useMemo(
    () => [
      {
        title: userCoords ? 'Your location' : 'Starting point',
        meta: userCoords ? 'Detected via GPS' : 'Set your current location',
      },
      {
        title: destinationName,
        meta: destinationAddress || destinationName,
      },
    ],
    [destinationName, destinationAddress, userCoords]
  );

  const destEnd =
    destinationLat != null && destinationLng != null
      ? { lat: destinationLat, lng: destinationLng }
      : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_4px_28px_rgba(0,0,0,0.05)]">
      <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-5 sm:px-6 sm:py-6">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h3 className="font-['Poppins',sans-serif] text-lg font-semibold tracking-tight text-neutral-900">
                Directions
              </h3>
              <p className="mt-0.5 truncate text-sm text-neutral-500">{destinationName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
              aria-label="Close directions"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-4 pb-5 pt-3 sm:px-5 sm:pb-6">
            <div className="flex gap-1 border-b border-neutral-200" role="tablist" aria-label="Route views">
              {[
                { id: 'routeMain', label: 'Map' },
                { id: 'stepGuide', label: 'Commuter guide' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={routeSubTab === id}
                  onClick={() => setRouteSubTab(id)}
                  className={`relative -mb-px border-b-2 px-3 pb-3 text-sm font-medium transition sm:px-4 ${
                    routeSubTab === id
                      ? 'border-neutral-900 text-neutral-900'
                      : 'border-transparent text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5">
              {routeSubTab === 'stepGuide' && (
                <div className="space-y-4">
                  <p className="text-xs leading-relaxed text-neutral-600">
                    Main road toward this place first, then terminals nearest you, then signboards. {COMMUTER_DISCLAIMER}
                  </p>
                  <p className="text-xs text-neutral-500">{COMMUTER_FOOTNOTE}</p>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3.5">
                    <CommuterGuideSteps
                      steps={commuterGuideSteps}
                      loading={terminalPlanLoading && Boolean(userCoords)}
                      emptyMessage={
                        !userCoords
                          ? 'Allow location access to see which terminal and signboards to use.'
                          : 'No terminal data for this area yet.'
                      }
                    />
                  </div>
                </div>
              )}

              {routeSubTab === 'routeMain' && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:gap-0 lg:divide-x lg:divide-neutral-100">
                  <aside className="flex flex-col gap-5 lg:pr-5">
                    <div>
                      <p className="text-xs font-medium text-neutral-400">Trip</p>
                      <div className="mt-2 space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-neutral-500">From</p>
                          <p className="mt-0.5 font-medium text-neutral-900">
                            {userCoords ? 'Your location' : 'Current location'}
                          </p>
                          {userCoords ? <p className="mt-0.5 text-xs text-neutral-500">GPS</p> : null}
                        </div>
                        <div className="h-px bg-neutral-200" />
                        <div>
                          <p className="text-xs text-neutral-500">To</p>
                          <p className="mt-0.5 font-medium leading-snug text-neutral-900">{destinationName}</p>
                          {destinationAddress ? (
                            <p className="mt-1 text-xs leading-relaxed text-neutral-500">{destinationAddress}</p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {displayRoute ? (
                      <div>
                        <p className="text-xs font-medium text-neutral-400">Best route</p>
                        <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-neutral-900">{displayRoute.label}</p>
                              <p className="mt-0.5 text-xs text-neutral-500">{displayRoute.mode}</p>
                            </div>
                            <span className={`h-2 w-2 shrink-0 rounded-full ${displayRoute.accent}`} aria-hidden />
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-200/80 pt-3 text-xs tabular-nums text-neutral-700">
                            <span>{formatDuration(displayRoute.durationMin)}</span>
                            <span className="text-neutral-300" aria-hidden>
                              |
                            </span>
                            <span>{displayRoute.distanceKm} km</span>
                            <span className="text-neutral-300" aria-hidden>
                              |
                            </span>
                            <span>{displayRoute.traffic}</span>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </aside>

                  <div className="flex flex-col gap-5 lg:pl-5">
                    <div>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-sm text-neutral-600">
                          <span className="tabular-nums text-neutral-900">{displayRoute?.distanceKm ?? '—'} km</span>
                          <span className="mx-1.5 text-neutral-300">·</span>
                          <span className="tabular-nums text-neutral-900">
                            {formatDuration(displayRoute?.durationMin ?? 0)}
                          </span>
                        </p>
                        <span className="text-xs text-neutral-400">OpenStreetMap · OSRM</span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500">
                        Driving corridor; walking segments appear when the router uses them.
                      </p>
                      {destEnd ? (
                        <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                          <RouteLeafletMap
                            className="h-[220px] w-full sm:h-[300px] lg:h-[340px]"
                            start={userCoords}
                            end={destEnd}
                            routeId={displayRoute?.id ?? 'main-road'}
                            lineColor={displayRoute?.color ?? '#2563eb'}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-neutral-400">Overview</p>
                      <ul className="mt-3">
                        {routeTimeline.map((step, idx) => {
                          const isLast = idx === routeTimeline.length - 1;
                          return (
                            <li key={`route-tl-${idx}-${step.title}`} className="flex gap-3">
                              <div className="flex w-4 shrink-0 flex-col items-center pt-1.5">
                                <span
                                  className={`h-2 w-2 rounded-full ${isLast ? 'bg-neutral-800' : 'bg-neutral-400'}`}
                                  aria-hidden
                                />
                                {!isLast ? (
                                  <span className="mt-1 w-px flex-1 min-h-[1.25rem] bg-neutral-200" aria-hidden />
                                ) : null}
                              </div>
                              <div className={`min-w-0 flex-1 ${!isLast ? 'pb-4' : ''}`}>
                                <p className="text-sm font-medium text-neutral-900">{step.title}</p>
                                <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{step.meta}</p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
