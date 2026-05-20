import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { DirectionsPanel } from '../components/DirectionsPanel';
import { isMallTerminalId } from 'cavitour-shared/terminalCatalogPolicy';
import { supabase } from '../lib/supabase';
import { fetchRouteRowsForTerminal, fetchTerminalsFromSupabase } from '../lib/terminalsFromSupabase';

const olive = '#7ea00e';

function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRadians = (deg) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function extractOne(v) {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function getTerminalAboutBody(terminal) {
  const blurb = terminal.blurb?.trim();
  if (blurb) return blurb;
  const city = terminal.city?.trim() || 'Cavite';
  return `${terminal.name} is a mall-based public transport terminal in ${city}, Cavite. Commuters board jeepneys, buses, and vans here for trips across the province and toward Metro Manila.`;
}

function uniqueTransportNames(routeRows) {
  const names = new Set();
  for (const row of routeRows) {
    const tt = extractOne(row.cavitour_transport_types);
    const name = tt?.transport_name?.trim();
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function formatProximityKm(km) {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km < 1) {
    const m = Math.max(50, Math.round(km * 1000 / 50) * 50);
    return `${m} m`;
  }
  return `${km.toFixed(1)} km`;
}

function routeRowToCard(row) {
  const r = extractOne(row.cavitour_routes);
  const tt = extractOne(row.cavitour_transport_types);
  const label = r?.route_name?.trim() ?? `Route ${row.route_id}`;
  return {
    key: `${row.route_id}-${label}`,
    label,
    transport: tt?.transport_name?.trim() ?? '',
  };
}

export function TerminalDetailPage() {
  const { id } = useParams();
  const [terminal, setTerminal] = useState(null);
  const [allTerminals, setAllTerminals] = useState([]);
  const [routeRows, setRouteRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCoords, setUserCoords] = useState(null);
  const [routePanelOpen, setRoutePanelOpen] = useState(false);

  const openRoutePanel = useCallback(() => setRoutePanelOpen(true), []);
  const closeRoutePanel = useCallback(() => setRoutePanelOpen(false), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTerminal(null);
      setRouteRows([]);
      try {
        const list = await fetchTerminalsFromSupabase(supabase);
        if (cancelled) return;
        setAllTerminals(list);
        if (!isMallTerminalId(id)) return;
        const found = list.find((t) => String(t.id) === String(id));
        if (found) {
          setTerminal(found);
          const rows = await fetchRouteRowsForTerminal(supabase, id);
          if (!cancelled) setRouteRows(rows);
        }
      } catch {
        /* offline: seed catalog only */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    setRoutePanelOpen(false);
  }, [id]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.navigator?.geolocation) return;
    let cancelled = false;
    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const routeCards = useMemo(() => routeRows.map(routeRowToCard), [routeRows]);

  const nearbyTerminals = useMemo(() => {
    if (!terminal?.lat || !terminal?.lng) return [];
    return allTerminals
      .filter((t) => String(t.id) !== String(terminal.id) && t.lat != null && t.lng != null)
      .map((t) => ({
        ...t,
        distanceKm: haversineDistanceKm(terminal.lat, terminal.lng, t.lat, t.lng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [allTerminals, terminal]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-['Inter',sans-serif]">
        <AppHeader />
        <p className="px-6 py-20 text-center text-neutral-500">Loading terminal…</p>
      </div>
    );
  }

  if (!terminal) {
    return (
      <div className="min-h-screen bg-white">
        <AppHeader />
        <div className="mx-auto max-w-lg px-6 py-20 text-center">
          <p className="mb-4 text-neutral-600">Terminal not found.</p>
          <Link to="/terminals" className="font-semibold" style={{ color: olive }}>
            ← All terminals
          </Link>
        </div>
      </div>
    );
  }

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${terminal.lng - 0.02}%2C${terminal.lat - 0.02}%2C${terminal.lng + 0.02}%2C${terminal.lat + 0.02}&layer=mapnik&marker=${terminal.lat}%2C${terminal.lng}`;
  const distanceToTerminalKm =
    userCoords ? haversineDistanceKm(userCoords.lat, userCoords.lng, terminal.lat, terminal.lng) : null;
  const aboutBody = getTerminalAboutBody(terminal);
  const transportModes = uniqueTransportNames(routeRows);

  return (
    <div className="flex min-h-screen flex-col bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 sm:p-5">
            <div className="mb-4">
                <Link
                  to="/terminals"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-700 hover:underline"
                  aria-label="Back to terminals"
                >
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  Terminals
                </Link>
            </div>

            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-['Poppins',sans-serif] text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl sm:leading-snug">
                  {terminal.name}
                </h1>
                {terminal.subtitle?.trim() ? (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">{terminal.subtitle.trim()}</p>
                ) : null}
                <p className="mt-3">
                  <span
                    className="inline-block max-w-full rounded-full px-3 py-1 text-[10px] font-normal leading-snug text-[#3d4a06] shadow-sm sm:text-[11px]"
                    style={{ backgroundColor: 'rgba(126, 160, 14, 0.22)' }}
                  >
                    Mall terminal · {terminal.city}
                  </span>
                </p>
              </div>
            </div>

            {routePanelOpen ? (
              <DirectionsPanel
                onClose={closeRoutePanel}
                destinationName={terminal.name}
                destinationAddress={terminal.subtitle?.trim() ?? `${terminal.city}, Cavite`}
                destinationLat={terminal.lat}
                destinationLng={terminal.lng}
                userCoords={userCoords}
                fallbackDistanceKm={distanceToTerminalKm ?? undefined}
                seedId={terminal.id}
              />
            ) : (
            <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_4px_28px_rgba(0,0,0,0.05)]">
              <div className="border-b border-neutral-100 bg-gradient-to-b from-neutral-50/90 to-white px-5 py-6 sm:px-7 sm:py-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  About this terminal
                </p>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">{aboutBody}</p>
                {terminal.status ? (
                  <p className="mt-4 text-sm text-neutral-700">
                    <span className="font-semibold text-neutral-900">Operating hours: </span>
                    {terminal.status}
                  </p>
                ) : null}
                {transportModes.length > 0 ? (
                  <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Transport</p>
                    <p className="mt-2 leading-relaxed">{transportModes.join(' · ')}</p>
                  </div>
                ) : null}
                {distanceToTerminalKm != null ? (
                  <div className="mt-4 rounded-xl border border-[rgba(126,160,14,0.2)] bg-[rgba(126,160,14,0.06)] px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5c7a0a]">
                      From your location
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-700">
                      About {distanceToTerminalKm.toFixed(1)} km away — typical jeepney or van time varies with traffic.
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            )}

            <div className="mt-5 overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_4px_28px_rgba(0,0,0,0.05)]">
              <div className="border-b border-neutral-100 bg-gradient-to-b from-neutral-50/90 to-white px-5 py-5 sm:px-7 sm:py-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Terminal routes
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                  Corridors served from {terminal.name}
                </p>
              </div>
              <div className="px-3 py-3 sm:px-4 sm:py-4">
                {routeCards.length === 0 ? (
                  <p className="px-2 py-6 text-center text-sm text-neutral-500">
                    No routes listed for this terminal yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200">
                    {routeCards.map((route) => (
                      <li key={route.key}>
                        <div className="flex items-center justify-between gap-4 bg-white px-4 py-3.5 sm:px-5 sm:py-4">
                          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-neutral-900">
                            {route.label}
                          </p>
                          {route.transport ? (
                            <span
                              className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium text-[#3d4a06] sm:text-[11px]"
                              style={{ backgroundColor: 'rgba(126, 160, 14, 0.18)' }}
                            >
                              {route.transport}
                            </span>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>

          <aside className="self-start rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-3 sm:p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:min-h-0">
            <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="min-h-0 max-h-[min(720px,85vh)] overflow-y-auto overscroll-y-contain px-3 py-3 lg:max-h-[calc(100vh-7.5rem)]">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Map location</p>
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <iframe title="Map" src={mapSrc} className="h-[180px] w-full border-0 lg:h-[200px]" />
                  </div>
                  <button
                    type="button"
                    onClick={openRoutePanel}
                    className="block w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
                    style={{ backgroundColor: olive }}
                  >
                    Go here?
                  </button>
                </div>

                {nearbyTerminals.length > 0 ? (
                  <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                        Nearby terminals
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">Nearest to {terminal.name}</p>
                    </div>
                    <ul className="space-y-2">
                      {nearbyTerminals.map((t) => {
                        const proximity = formatProximityKm(t.distanceKm);
                        return (
                          <li key={t.id}>
                            <Link
                              to={`/terminals/${t.id}`}
                              className="group flex items-center gap-3 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2.5 transition hover:border-[#7ea00e]/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="line-clamp-1 text-sm font-semibold text-neutral-900 group-hover:text-[#5c7a0a]">
                                  {t.name}
                                </p>
                                <p className="mt-0.5 line-clamp-1 text-xs text-neutral-500">{t.city}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  {proximity ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(126,160,14,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[#5c7a0a]">
                                      <svg
                                        className="h-3 w-3 shrink-0 opacity-80"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M12 21s7-4.35 7-10a7 7 0 10-14 0c0 5.65 7 10 7 10z"
                                        />
                                        <circle cx="12" cy="11" r="2.5" />
                                      </svg>
                                      {proximity}
                                    </span>
                                  ) : null}
                                  <span className="line-clamp-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                                    Mall terminal
                                  </span>
                                </div>
                              </div>
                              <svg
                                className="h-4 w-4 shrink-0 text-neutral-300 transition group-hover:translate-x-0.5 group-hover:text-[#7ea00e]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
                              </svg>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
