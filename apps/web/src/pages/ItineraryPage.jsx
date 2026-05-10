import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { publishedItineraries } from '../data/mockItineraries';
import { FilterModal } from '../components/FilterModal';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase } from '../lib/placesFromSupabase';
import { buildRouteEstablishmentRows, mergeSupabaseIntoItineraryBrowse } from '../lib/itineraryBrowse';
import { placePassesAppliedFilters, sortPlacesByModeWeb } from '../lib/placeFilterHelpers';

const olive = '#7ea00e';
const slate = '#1f4f59';

function rowToFilterPlace(row) {
  return {
    id: row.key,
    name: row.name,
    address: row.address,
    city_mun: row.city_mun,
    type: row.type,
    ntdp_category: row.ntdp_category,
    type_code: row.type_code,
    ta_category: row.ta_category,
    lgu_slug: row.lgu_slug,
    description: row.description,
    searchable_text: row.searchable_text,
    created_at: row.created_at,
    lat: row.lat,
    lng: row.lng,
  };
}

export function ItineraryPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** @type {import('../components/FilterModal').AppliedPlaceFilters | null} */
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [browseRows, setBrowseRows] = useState(() => buildRouteEstablishmentRows());
  const [loadStatus, setLoadStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const routeRows = buildRouteEstablishmentRows();
      try {
        const all = await fetchAllPlacesFromSupabase(supabase, 1000);
        if (cancelled) return;
        setBrowseRows(mergeSupabaseIntoItineraryBrowse(routeRows, all));
        setLoadStatus('live');
      } catch {
        if (cancelled) return;
        setBrowseRows(routeRows);
        setLoadStatus('offline');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const modalPlaces = useMemo(() => browseRows.map(rowToFilterPlace), [browseRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = browseRows;
    if (q) {
      rows = rows.filter((r) =>
        [r.name, r.address, r.city_mun, r.type, r.itineraryTitle].some((v) =>
          String(v ?? '')
            .toLowerCase()
            .includes(q)
        )
      );
    }
    const placeLike = rows.map(rowToFilterPlace);
    const passed = rows.filter((_, i) => placePassesAppliedFilters(placeLike[i], appliedFilters));
    const sortMode = appliedFilters?.sortMode ?? '';
    if (!sortMode) return passed;
    const orderKeys = sortPlacesByModeWeb(
      passed.map(rowToFilterPlace),
      sortMode
    ).map((p) => p.id);
    const order = new Map(orderKeys.map((id, idx) => [id, idx]));
    return [...passed].sort((a, b) => (order.get(a.key) ?? 0) - (order.get(b.key) ?? 0));
  }, [browseRows, search, appliedFilters]);

  return (
    <div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="min-w-0">
          <section className="mb-8 rounded-2xl border border-[#dfe8d3] bg-[#f7faef] p-4 sm:p-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#5d7211]">CaviTour curated</p>
                <h2 className="font-['Poppins',sans-serif] text-xl font-bold text-neutral-900">Itineraries by the system</h2>
                <p className="mt-1 text-sm text-neutral-600">Ready-made routes you can save and follow.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {publishedItineraries.map((it) => (
                <Link
                  key={it.id}
                  to={`/itinerary/${it.id}`}
                  className="flex gap-3 rounded-xl border border-[#cddcab] bg-white p-3 transition hover:shadow-md"
                >
                  <img src={it.image} alt="" className="h-20 w-24 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="font-['Poppins',sans-serif] text-sm font-semibold text-neutral-900 line-clamp-2">{it.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{it.subtitle}</p>
                    <p className="mt-2 text-xs font-semibold text-[#1f4f59]">Open route →</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-['Poppins',sans-serif] font-bold text-2xl text-neutral-900">
                Available Itinerary Establishments
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {filteredRows.length} of {browseRows.length} listings
                {loadStatus === 'live' ? ' — includes STA listings near featured stops' : ''}
                {loadStatus === 'offline' ? ' — connect to load more from the database' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: olive }}
            >
              Create Itinerary
            </button>
          </div>

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
              <svg className="h-5 w-5 shrink-0 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, city, or route…"
                className="min-w-0 flex-1 bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
              </svg>
              Filters
            </button>
          </div>

          {filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/80 px-6 py-14 text-center">
              <p className="font-['Poppins',sans-serif] text-base font-semibold text-neutral-800">No matches</p>
              <p className="mt-2 text-sm text-neutral-500">Clear the search box or open Filters and reset.</p>
              <button
                type="button"
                className="mt-5 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                onClick={() => {
                  setSearch('');
                  setAppliedFilters(null);
                }}
              >
                Clear search & filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredRows.map((spot) => (
                <article
                  key={spot.key}
                  className="flex h-full min-h-[226px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 text-left transition hover:shadow-md"
                >
                  <div className="overflow-hidden rounded-xl bg-neutral-100">
                    <img src={spot.image} alt={spot.name} className="h-32 w-full object-cover" />
                  </div>
                  <div className="flex-1 px-1 pb-1 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
                        {spot.name}
                      </h3>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[12px] text-neutral-500">{spot.address}</p>
                    {spot.city_mun ? (
                      <p className="mt-0.5 text-[11px] font-medium text-neutral-600">{spot.city_mun}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                      {spot.kind === 'supabase' && spot.placeId ? (
                        <Link
                          to={`/place/${spot.placeId}`}
                          className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                        >
                          View place
                        </Link>
                      ) : null}
                      <Link
                        to={`/itinerary/${spot.itineraryId}`}
                        className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                      >
                        Open route
                      </Link>
                    </div>
                    <p className="mt-1 text-[11px] text-neutral-400">Via {spot.itineraryTitle}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        places={modalPlaces}
        onApply={setAppliedFilters}
      />

      {createOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[1080px] max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-neutral-900">Create Itinerary</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                aria-label="Close create itinerary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form className="grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
              <div className="rounded-2xl border border-neutral-200 bg-[#fcfcfb] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Itinerary details</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Itinerary title</label>
                    <input
                      placeholder="e.g. Hidden Gems"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">Keep it catchy! Best titles include location and vibe.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">General description</label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about the overall experience..."
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Start date</label>
                    <input
                      type="date"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">End date</label>
                    <input
                      type="date"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Stops and options</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Search destinations</label>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3">
                      <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input className="flex-1 text-sm outline-none" placeholder="Search place" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Destinations</label>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-2">
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(126,160,14,0.14)] text-[11px] font-semibold text-[#6c8612]">
                              {i}
                            </span>
                            <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path
                                fillRule="evenodd"
                                d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <input className="flex-1 text-sm outline-none" placeholder={`Add stop ${i}`} />
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                              aria-label={`Reorder stop ${i}`}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 6h8M8 12h8M8 18h8" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
                      >
                        <span className="text-sm leading-none">+</span>
                        Add destination
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-neutral-200 pt-3 sm:grid-cols-2 lg:col-span-2">
                <button
                  type="button"
                  className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 font-['Poppins',sans-serif] text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
                >
                  Add More
                </button>
                <button
                  type="submit"
                  className="w-full rounded-lg py-2.5 font-['Poppins',sans-serif] text-sm font-bold text-white shadow-[0_10px_20px_rgba(31,79,89,0.24)]"
                  style={{ backgroundColor: slate }}
                >
                  Publish Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
