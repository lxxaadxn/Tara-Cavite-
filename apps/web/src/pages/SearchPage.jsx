import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  fetchAllPlacesFromSupabase,
  logPlacesFetchError,
  searchPlacesByText,
} from '../lib/placesFromSupabase';
import { countActiveFilters, placePassesAppliedFilters } from '../lib/placeFilterHelpers';
import { AppHeader } from '../components/AppHeader';
import { FilterModal } from '../components/FilterModal';
import { PlacesLeafletMap } from '../components/PlacesLeafletMap';
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

function cardRating(seed) {
  return (4.6 + ((seed % 5) * 0.1)).toFixed(1);
}

function cardReviewCount(seed) {
  return 640 + ((seed * 137) % 1800);
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
        const list = await fetchAllPlacesFromSupabase(supabase, 1000);
        if (cancelled) return;
        trendingRef.current = list;
        setDisplayPlaces(list);
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
          .then((list) => setDisplayPlaces(list.length ? list : []))
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
    <div className="min-h-screen bg-[#efefec] font-['Inter',sans-serif] text-neutral-900">
      <AppHeader />

      <div className="sticky top-[116px] z-30 flex justify-center bg-[#efefec]/90 px-3 pb-3.5 pt-2.5 backdrop-blur-md sm:px-4 md:top-[72px] lg:px-8">
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
              placeholder="Enter a tourist spot"
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

      <div className="w-full px-3 pb-2 sm:px-4 lg:px-8">
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2 lg:gap-4">
          <section
            className="relative min-h-[62vh] min-w-0 overflow-hidden rounded-[20px] border border-neutral-200 bg-[#e8ebe6] shadow-[0_10px_28px_rgba(0,0,0,0.08)] lg:order-2 lg:sticky lg:top-[128px] lg:self-start lg:min-h-[calc(100vh-144px)]"
            onMouseLeave={() => setPreviewPlaceId(null)}
          >
            <PlacesLeafletMap
              places={mapPlaces}
              userLocation={userCoords}
              onMarkerClick={(p) => navigate(`/place/${p.id}`)}
              onMarkerHover={(p) => setPreviewPlaceId(p.id)}
            />

            <div className="pointer-events-none absolute inset-0 z-[450] bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.45),transparent_42%)]" />

            {previewPlace ? (
              <button
                type="button"
                onClick={() => navigate(`/place/${previewPlace.id}`)}
                className="absolute left-4 top-4 z-[500] max-w-[280px] overflow-hidden rounded-xl border border-neutral-200 bg-white/95 text-left shadow-[0_12px_30px_rgba(0,0,0,0.15)] backdrop-blur-sm transition hover:border-[#7ea00e]/40 sm:left-5 sm:top-5 sm:max-w-[300px]"
                aria-label={`About ${previewPlace.name}`}
              >
                <img
                  src={previewPlace.imageUrl || PLACEHOLDER_IMG}
                  alt=""
                  className="h-28 w-full object-cover"
                />
                <div className="p-3">
                  <p className="font-['Poppins',sans-serif] text-base font-semibold text-neutral-900">{previewPlace.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                    {sanitizeAddress(previewPlace.address, previewPlace.name)}
                  </p>
                  {previewPlace.ntdp_category ? (
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[#7EA00E]">
                      {previewPlace.ntdp_category}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-semibold text-[#7ea00e]">View establishment →</p>
                </div>
              </button>
            ) : null}
          </section>

          <section className="min-w-0 lg:order-1 lg:self-start">
            <div className="grid grid-cols-2 gap-3">
              {filteredPlaces.map((place, idx) => (
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
                  className="flex h-full min-h-[280px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 text-left transition hover:border-[#7ea00e]/35 hover:shadow-md sm:p-2.5"
                >
                  <div className="overflow-hidden rounded-xl bg-neutral-100">
                    <img
                      src={place.imageUrl || PLACEHOLDER_IMG}
                      alt={place.name}
                      className="h-36 w-full object-cover sm:h-40"
                    />
                  </div>
                  <div className="flex-1 px-1 pb-1 pt-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-base font-semibold text-neutral-900">{place.name}</p>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-neutral-500">
                      <svg className="-mt-0.5 mr-1 inline h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                        <path
                          fillRule="evenodd"
                          d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {sanitizeAddress(place.address, place.name)}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-sm text-neutral-500">
                        <span className="mr-1 text-[#f4c430]">★</span>
                        {cardRating(idx)} ({cardReviewCount(idx).toLocaleString()} Reviews)
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/place/${place.id}`);
                        }}
                        className="shrink-0 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-sm font-semibold leading-none text-neutral-700 transition hover:bg-neutral-50"
                      >
                        About
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        {dataSource === 'error' && (
          <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-amber-800">
            Could not load Cavite establishments from Supabase
            {fetchError ? ` (${fetchError})` : ''}. Check your connection and that{' '}
            <code className="rounded bg-amber-100 px-1">public.places</code> is readable, then run{' '}
            <code className="rounded bg-amber-100 px-1">npm run cavite:verify-places</code>.
          </p>
        )}
        {dataSource === 'empty' && (
          <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-amber-800">
            Supabase connected but no rows in public.places. Run the view migration, then sync_places_with_images.sql.
          </p>
        )}
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
