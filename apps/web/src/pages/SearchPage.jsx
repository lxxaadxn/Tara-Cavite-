import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  fetchAllPlacesFromSupabase,
  logPlacesFetchError,
  searchPlacesByText,
} from '../lib/placesFromSupabase';
import { filterPlacesWithMedia } from '../lib/marketingPlaces';
import { countActiveFilters, placePassesAppliedFilters } from '../lib/placeFilterHelpers';
import { AppHeader } from '../components/AppHeader';
import { FilterModal } from '../components/FilterModal';
import { PlacesLeafletMap } from '../components/PlacesLeafletMap';
import { fetchPlaceReviewStats } from '../lib/placeReviews';
import { readCachedUserLocation } from '../lib/promptLocationOnLogin';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

function normalizeToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function sanitizeAddress(address, placeName = '') {
  if (!address) return 'Cavite, Philippines';
  const normalizedName = normalizeToken(placeName);
  const parts = address
    .split(',')
    .map((part) => part.trim());
  const cleanedParts = parts.filter((part, idx) => {
    if (!part) return false;
    if (/^sta\.?/i.test(part) || /^brgy\.?/i.test(part) || /^barangay/i.test(part)) return false;
    if (idx === 0 && normalizedName) {
      const normalizedPart = normalizeToken(part);
      if (normalizedPart === normalizedName || normalizedPart.includes(normalizedName) || normalizedName.includes(normalizedPart)) {
        return false;
      }
    }
    return true;
  });
  return cleanedParts.length ? cleanedParts.join(', ') : address;
}

export function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** @type {import('../lib/placeFilterHelpers').AppliedPlaceFilters | null} */
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [displayPlaces, setDisplayPlaces] = useState([]);
  const [dataSource, setDataSource] = useState('loading');
  const [fetchError, setFetchError] = useState('');
  const [userCoords, setUserCoords] = useState(() => {
    const cached = readCachedUserLocation();
    return cached ? { lat: cached.lat, lng: cached.lng } : null;
  });
  const [previewPlaceId, setPreviewPlaceId] = useState(null);
  const [reviewStats, setReviewStats] = useState(() => ({}));
  const trendingRef = useRef([]);

  useEffect(() => {
    const onCached = (ev) => {
      const d = ev?.detail;
      if (d && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
        setUserCoords({ lat: d.lat, lng: d.lng });
      }
    };
    window.addEventListener('cavitour:user-location', onCached);
    return () => window.removeEventListener('cavitour:user-location', onCached);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [list, stats] = await Promise.all([
          fetchAllPlacesFromSupabase(supabase, 1000).then(filterPlacesWithMedia),
          fetchPlaceReviewStats(supabase).catch((err) => {
            logPlacesFetchError('fetchPlaceReviewStats', err);
            return {};
          }),
        ]);
        if (cancelled) return;
        trendingRef.current = list;
        setDisplayPlaces(list);
        setReviewStats(stats);
        setFetchError('');
        setDataSource(list.length > 0 ? 'supabase' : 'empty');
      } catch (err) {
        if (cancelled) return;
        logPlacesFetchError('fetchAllPlacesFromSupabase', err);
        const message = err instanceof Error ? err.message : 'Could not load establishments.';
        setFetchError(message);
        trendingRef.current = [];
        setDisplayPlaces([]);
        setDataSource('error');
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
      () => {
        if (cancelled) return;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setDisplayPlaces(trendingRef.current);
      return;
    }
    const t = setTimeout(() => {
      if (dataSource === 'supabase' || dataSource === 'empty') {
        searchPlacesByText(supabase, q, 1000)
          .then((list) => setDisplayPlaces(filterPlacesWithMedia(list.length ? list : [])))
          .catch((err) => logPlacesFetchError('searchPlacesByText', err));
        return;
      }
      const qLower = q.toLowerCase();
      setDisplayPlaces(
        trendingRef.current.filter((place) =>
          `${place.name} ${place.address} ${place.city_mun ?? ''} ${place.ntdp_category ?? ''}`
            .toLowerCase()
            .includes(qLower)
        )
      );
    }, 380);
    return () => clearTimeout(t);
  }, [search, dataSource]);

  const modalFilteredPlaces = useMemo(
    () => displayPlaces.filter((p) => placePassesAppliedFilters(p, appliedFilters)),
    [displayPlaces, appliedFilters]
  );

  const filteredPlaces = modalFilteredPlaces;

  const activeFilterCount = countActiveFilters(appliedFilters);

  const mapPlaces = useMemo(
    () => filteredPlaces.filter((p) => p.lat != null && p.lng != null),
    [filteredPlaces]
  );

  const previewPlace = useMemo(
    () => (previewPlaceId ? filteredPlaces.find((p) => String(p.id) === String(previewPlaceId)) : null),
    [previewPlaceId, filteredPlaces]
  );

  return (
    <div className="bg-[#F1F7F6] font-['Poppins',sans-serif] text-[#16352E] max-lg:min-h-dvh lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex max-w-[1600px] flex-col max-lg:min-h-dvh lg:h-full">
        <AppHeader embedded />

        <div className="shrink-0 px-4 pb-4 sm:px-6 lg:px-8">
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-center"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-full bg-[#F1F7F6] px-4 py-3 shadow-[inset_0_1px_2px_rgba(22,53,46,0.04)]">
              <svg
                className="h-[19px] w-[19px] shrink-0 text-[#707D7D]"
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
                placeholder="Enter a tourist spot"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-w-0 bg-transparent text-[15px] leading-snug text-[#16352E] outline-none placeholder:text-[#707D7D]"
              />
            </div>
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="relative shrink-0 rounded-full bg-[#F1F7F6] px-5 py-3 text-sm font-semibold text-[#1B8A70] transition hover:bg-[#D4EFE8]"
              aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Open filters'}
            >
              Filters
              {activeFilterCount > 0 ? (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#10A37F] px-1.5 text-[10px] font-semibold text-white">
                  {activeFilterCount}
                </span>
              ) : null}
            </button>
            <button
              type="submit"
              className="shrink-0 rounded-full bg-[#10A37F] px-6 py-3 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(16,163,127,0.28)] transition hover:bg-[#168F7A]"
            >
              Search
            </button>
          </form>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 px-4 pb-5 sm:px-6 lg:grid-cols-12 lg:gap-5 lg:overflow-hidden lg:px-8">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[24px] bg-white p-4 sm:p-5 lg:col-span-7 lg:h-full">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dataSource === 'error' && (
                <p className="mb-4 text-center text-xs text-amber-800">
                  Could not load Cavite establishments from Supabase
                  {fetchError ? ` (${fetchError})` : ''}. Check your connection and that{' '}
                  <code className="rounded bg-amber-100 px-1">public.places</code> is readable, then run{' '}
                  <code className="rounded bg-amber-100 px-1">npm run cavite:verify-places</code>.
                </p>
              )}
              {dataSource === 'empty' && (
                <p className="mb-4 text-center text-xs text-amber-800">
                  Supabase connected but no rows in public.places. Run the view migration, then sync_places_with_images.sql.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filteredPlaces.map((place) => {
                const stats = reviewStats[String(place.id)];
                const reviewCount = stats?.reviewCount ?? 0;
                const avgRating = stats?.avgRating;
                return (
                <article
                  key={place.id}
                  role="link"
                  tabIndex={0}
                  onClick={() => navigate(`/place/${place.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/place/${place.id}`);
                    }
                  }}
                  className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[16px] bg-white text-left shadow-[0_8px_24px_rgba(22,53,46,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(22,53,46,0.1)]"
                >
                  <div className="overflow-hidden bg-neutral-100">
                    <img
                      src={place.imageUrl || PLACEHOLDER_IMG}
                      alt={place.name}
                      className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:h-44"
                    />
                  </div>
                  <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-base font-semibold leading-snug text-[#16352E]">{place.name}</p>
                      <span
                        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#1B8A70] shadow-[0_4px_10px_rgba(22,53,46,0.08)]"
                        aria-hidden
                      >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M7 17 17 7M8 7h9v9" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-[#707D7D]">
                      <svg className="-mt-0.5 mr-1 inline h-4 w-4 text-[#39A98F]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {sanitizeAddress(place.address, place.name)}
                    </p>
                    <p className="mt-2 text-sm text-[#707D7D]">
                      <span className="mr-1 text-[#f4c430]">★</span>
                      {reviewCount > 0
                        ? `${avgRating.toFixed(1)} (${reviewCount.toLocaleString()} ${reviewCount === 1 ? 'Review' : 'Reviews'})`
                        : 'No reviews yet'}
                    </p>
                  </div>
                </article>
                );
              })}
              </div>
            </div>
          </section>

          <section
            className="relative min-h-[50vh] min-w-0 overflow-hidden rounded-[24px] bg-[#E8F3F0] outline-none lg:col-span-5 lg:h-full lg:min-h-0"
            onMouseLeave={() => setPreviewPlaceId(null)}
          >
            <PlacesLeafletMap
              places={mapPlaces}
              userLocation={userCoords}
              onMarkerClick={(p) => navigate(`/place/${p.id}`)}
              onMarkerHover={(p) => setPreviewPlaceId(p.id)}
            />

            {previewPlace ? (
              <button
                type="button"
                onClick={() => navigate(`/place/${previewPlace.id}`)}
                className="absolute left-4 top-4 z-[500] max-w-[280px] overflow-hidden rounded-2xl bg-white/95 text-left shadow-[0_12px_30px_rgba(22,53,46,0.16)] backdrop-blur-sm transition hover:shadow-[0_16px_36px_rgba(22,53,46,0.2)] sm:left-5 sm:top-5"
                aria-label={`About ${previewPlace.name}`}
              >
                <img
                  src={previewPlace.imageUrl || PLACEHOLDER_IMG}
                  alt=""
                  className="h-28 w-full object-cover"
                />
                <div className="p-3">
                  <p className="font-['Poppins',sans-serif] text-base font-semibold text-[#16352E]">{previewPlace.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-[#707D7D]">
                    {sanitizeAddress(previewPlace.address, previewPlace.name)}
                  </p>
                  {previewPlace.ntdp_category ? (
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[#10A37F]">
                      {previewPlace.ntdp_category}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-semibold text-[#10A37F]">View establishment →</p>
                </div>
              </button>
            ) : null}
          </section>
        </div>
      </div>

      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        appliedFilters={appliedFilters}
        places={displayPlaces}
        onApply={(f) => {
          const n =
            (f.selectedCategoryKeys?.length ?? 0) +
            (f.selectedCityKeys?.length ?? 0) +
            (f.selectedMunicipalityKeys?.length ?? 0);
          setAppliedFilters(n > 0 ? f : null);
        }}
      />
    </div>
  );
}
