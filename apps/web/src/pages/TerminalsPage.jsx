import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { FilterModal } from '../components/FilterModal';
import { TerminalsLeafletMap } from '../components/TerminalsLeafletMap';
import { placeMatchesLocationKeysWeb } from '../lib/placeFilterHelpers';
import { supabase } from '../lib/supabase';
import { buildMallTerminalCatalog, fetchTerminalsFromSupabase } from '../lib/terminalsFromSupabase';

const INITIAL_MALL_TERMINALS = buildMallTerminalCatalog();

function haversineKm(lat1, lng1, lat2, lng2) {
  const toR = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function terminalPassesAppliedFilters(terminal, filters) {
  if (!filters) return true;
  const locKeys = [...(filters.selectedCityKeys ?? []), ...(filters.selectedMunicipalityKeys ?? [])];
  if (!locKeys.length) return true;
  return placeMatchesLocationKeysWeb(
    { city_mun: terminal.city, address: terminal.subtitle },
    locKeys
  );
}

function countActiveTerminalFilters(filters) {
  if (!filters) return 0;
  return (filters.selectedCityKeys?.length ?? 0) + (filters.selectedMunicipalityKeys?.length ?? 0);
}

export function TerminalsPage() {
  const [terminals, setTerminals] = useState(INITIAL_MALL_TERMINALS);
  const [selectedTerminalId, setSelectedTerminalId] = useState(INITIAL_MALL_TERMINALS[0]?.id ?? '1');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** @type {import('../lib/placeFilterHelpers').AppliedPlaceFilters | null} */
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [userCoords, setUserCoords] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const live = await fetchTerminalsFromSupabase(supabase);
        if (!cancelled) {
          setTerminals(live);
          setSelectedTerminalId((prev) => (live.some((terminal) => terminal.id === prev) ? prev : live[0]?.id ?? '1'));
        }
      } catch {
        if (!cancelled) setTerminals(INITIAL_MALL_TERMINALS);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const filteredTerminals = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = terminals.filter((terminal) => terminalPassesAppliedFilters(terminal, appliedFilters));
    if (q) {
      list = list.filter((terminal) =>
        `${terminal.name} ${terminal.subtitle} ${terminal.city}`.toLowerCase().includes(q)
      );
    }
    if (
      userCoords &&
      list.every((t) => t.lat != null && t.lng != null && Number.isFinite(t.lat) && Number.isFinite(t.lng))
    ) {
      list = [...list].sort(
        (a, b) =>
          haversineKm(userCoords.lat, userCoords.lng, a.lat, a.lng) -
          haversineKm(userCoords.lat, userCoords.lng, b.lat, b.lng)
      );
    }
    return list;
  }, [search, terminals, userCoords, appliedFilters]);

  const activeFilterCount = countActiveTerminalFilters(appliedFilters);

  const filterPreviewPlaces = useMemo(
    () => terminals.map((t) => ({ id: t.id, city_mun: t.city, address: t.subtitle })),
    [terminals]
  );

  const selectedTerminal =
    filteredTerminals.find((terminal) => terminal.id === selectedTerminalId) ??
    filteredTerminals[0] ??
    terminals[0];

  const mapMarkers = useMemo(
    () =>
      filteredTerminals
        .filter((t) => t.lat != null && t.lng != null && Number.isFinite(t.lat) && Number.isFinite(t.lng))
        .map((t) => ({ id: String(t.id), name: t.name, lat: t.lat, lng: t.lng })),
    [filteredTerminals]
  );

  const distanceLine =
    userCoords && selectedTerminal?.lat != null && selectedTerminal?.lng != null
      ? haversineKm(userCoords.lat, userCoords.lng, selectedTerminal.lat, selectedTerminal.lng).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-[#eef1ec] font-['Inter',sans-serif]">
      <AppHeader />

      <div className="sticky top-[116px] z-30 flex justify-center bg-[#eef1ec]/90 px-3 pb-3.5 pt-2.5 backdrop-blur-md sm:px-4 md:top-[72px] lg:px-8">
        <div
          className="flex w-full max-w-xl items-stretch overflow-hidden rounded-2xl bg-white shadow-[0_2px_14px_rgba(31,41,55,0.07)] ring-1 ring-neutral-900/[0.04] transition-shadow focus-within:shadow-[0_4px_20px_rgba(126,160,14,0.12)] focus-within:ring-[#7EA00E]/25"
          role="search"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
            <svg
              className="h-[19px] w-[19px] shrink-0 text-neutral-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4-4" />
            </svg>
            <input
              type="search"
              placeholder="Search terminal"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full min-w-0 bg-transparent text-[15px] leading-snug text-neutral-800 outline-none placeholder:text-neutral-400"
            />
          </div>
          <div className="my-2.5 w-px shrink-0 bg-neutral-100" aria-hidden />
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="group relative flex w-14 shrink-0 items-center justify-center text-neutral-500 transition hover:bg-neutral-50 hover:text-[#1F4F59] active:bg-neutral-100"
            aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Open filters'}
          >
            <svg
              className="h-5 w-5 transition group-hover:scale-105"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M4 7h16" />
              <path d="M7 12h10" />
              <path d="M10 17h4" />
              <circle cx="7" cy="7" r="2" fill="currentColor" stroke="none" />
              <circle cx="17" cy="12" r="2" fill="currentColor" stroke="none" />
              <circle cx="12" cy="17" r="2" fill="currentColor" stroke="none" />
            </svg>
            {activeFilterCount > 0 ? (
              <span className="absolute right-2.5 top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#7EA00E] px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1460px] px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_14px_34px_rgba(0,0,0,0.08)] lg:max-h-[calc(100vh-10.5rem)]">
          <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] lg:min-h-0 lg:max-h-[calc(100vh-10.5rem)]">
            <section className="border-b border-neutral-200 bg-[#f8faf7] p-4 lg:min-h-0 lg:overflow-hidden lg:border-b-0 lg:border-r">
              <div className="max-h-[42vh] space-y-2 overflow-y-auto pr-1 lg:max-h-none lg:h-[calc(100vh-11.5rem)]">
                {filteredTerminals.map((terminal) => {
                  const dist =
                    userCoords && terminal.lat != null && terminal.lng != null
                      ? haversineKm(userCoords.lat, userCoords.lng, terminal.lat, terminal.lng).toFixed(1)
                      : null;
                  return (
                    <button
                      key={terminal.id}
                      type="button"
                      onClick={() => setSelectedTerminalId(terminal.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedTerminal.id === terminal.id
                          ? 'border-[#95bb23] bg-white shadow-[0_8px_20px_rgba(126,160,14,0.18)]'
                          : 'border-neutral-200 bg-white hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{terminal.name}</p>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
                          {terminal.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500">{terminal.subtitle}</p>
                      {dist != null ? (
                        <p className="mt-1 text-[11px] font-medium text-[#1f4f59]">~{dist} km from you</p>
                      ) : null}
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                        <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                          <p className="text-neutral-400">City</p>
                          <p className="font-semibold text-neutral-700">{terminal.city}</p>
                        </div>
                        <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                          <p className="text-neutral-400">Routes</p>
                          <p className="font-semibold text-neutral-700">{terminal.routes}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="relative p-2 sm:p-3 lg:min-h-0">
              <div className="relative h-[min(42vh,320px)] min-h-[240px] overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 sm:h-[min(48vh,380px)] lg:h-[calc(100vh-12rem)] lg:max-h-[calc(100vh-12rem)] lg:min-h-0">
                <TerminalsLeafletMap
                  terminals={mapMarkers}
                  selectedId={selectedTerminalId != null ? String(selectedTerminalId) : null}
                  userLocation={userCoords}
                  onSelectTerminal={(id) => setSelectedTerminalId(id)}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 z-[400] h-24 bg-gradient-to-b from-white/80 to-transparent" />
              </div>

              <article className="pointer-events-auto absolute left-4 top-4 z-[500] max-w-[280px] rounded-xl border border-neutral-200 bg-white/95 p-2.5 shadow-[0_12px_30px_rgba(0,0,0,0.15)] backdrop-blur-sm sm:left-5 sm:top-5 sm:max-w-[300px] sm:p-3 lg:left-5 lg:top-5">
                <div>
                  <p className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">{selectedTerminal.name}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{selectedTerminal.subtitle}</p>
                  {distanceLine != null ? (
                    <p className="mt-2 text-xs font-medium text-[#1f4f59]">About {distanceLine} km from your location</p>
                  ) : null}
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600">{selectedTerminal.blurb}</p>
                  <Link
                    to={`/terminals/${selectedTerminal.id}`}
                    className="mt-3 inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Open terminal
                  </Link>
                </div>
              </article>
            </section>
          </div>
        </div>
      </div>

      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        appliedFilters={appliedFilters}
        places={filterPreviewPlaces}
        hideCategories
        resultNoun="terminal"
        onApply={(f) => {
          const n = (f.selectedCityKeys?.length ?? 0) + (f.selectedMunicipalityKeys?.length ?? 0);
          setAppliedFilters(
            n > 0
              ? {
                  selectedCategoryKeys: [],
                  selectedCityKeys: f.selectedCityKeys,
                  selectedMunicipalityKeys: f.selectedMunicipalityKeys,
                }
              : null
          );
        }}
      />
    </div>
  );
}
