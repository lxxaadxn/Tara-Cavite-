import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  fetchAllPlacesFromSupabase,
  logPlacesFetchError,
  searchPlacesByText,
} from '../lib/placesFromSupabase';
import { filterPlacesWithMedia } from '../lib/marketingPlaces';
import {
  fetchAppFilterCategoryOptions,
  isHiddenSearchCategory,
  labelMapFromOptions,
  staticCategoryOptions,
} from '../lib/appFilterCategories';
import {
  countActiveFilters,
  placePassesAppliedFilters,
  setRuntimeCategoryLabels,
} from '../lib/placeFilterHelpers';
import { formatNtdpCategoryTagLabel } from '../lib/ntdpDisplayLabels';
import { AppHeader } from '../components/AppHeader';
import { FilterModal } from '../components/FilterModal';
import { PlacesLeafletMap } from '../components/PlacesLeafletMap';
import { SaveSuccessToast } from '../components/SaveSuccessToast';
import { SaveToListModal } from '../components/SaveToListModal';
import { fetchPlaceReviewStats } from '../lib/placeReviews';
import { readCachedUserLocation } from '../lib/promptLocationOnLogin';
import { fetchSavedListsForUser, savePlaceToListIdRemote, savePlaceToListRemote } from '../lib/savedPlacesSupabase';
import { SAVED_LISTS_UPDATED_EVENT } from '../lib/savedPlaces';
import { useSaveSuccessToast } from '../lib/useSaveSuccessToast';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

function Skel({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

function SearchPlacesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Loading places">
      {Array.from({ length: 6 }).map((_, i) => (
        <article key={i} className="flex flex-col overflow-hidden rounded-[16px] bg-white ring-1 ring-neutral-100">
          <Skel className="h-40 w-full rounded-none sm:h-44" />
          <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
            <Skel className="h-5 w-40 max-w-full" />
            <Skel className="mt-2 h-4 w-48 max-w-full" />
            <Skel className="mt-2 h-4 w-28" />
            <Skel className="mt-3 h-8 w-28 rounded-full" />
          </div>
        </article>
      ))}
    </div>
  );
}

function pillsFromCategoryOptions(opts) {
  return [
    { id: 'all', label: 'All', kind: 'all' },
    ...(opts ?? [])
      .filter((o) => !isHiddenSearchCategory(o))
      .map((o) => ({
        id: `cat:${o.key}`,
        label: o.shortLabel || o.label,
        kind: 'category',
        key: o.key,
        ntdpName: o.ntdpName || o.label,
      })),
  ];
}

function normalizeToken(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function sanitizeAddress(address, placeName = '') {
  if (!address) return '';
  const normalizedName = normalizeToken(placeName);
  const parts = address.split(',').map((part) => part.trim());
  const cleanedParts = parts.filter((part, idx) => {
    if (!part) return false;
    if (/^sta\.?/i.test(part) || /^brgy\.?/i.test(part) || /^barangay/i.test(part)) return false;
    if (idx === 0 && normalizedName) {
      const normalizedPart = normalizeToken(part);
      if (
        normalizedPart === normalizedName ||
        normalizedPart.includes(normalizedName) ||
        normalizedName.includes(normalizedPart)
      ) {
        return false;
      }
    }
    return true;
  });
  return cleanedParts.length ? cleanedParts.join(', ') : String(address).trim();
}

/** Location line from Supabase `city_mun` + address. */
function formatPlaceLocation(place) {
  const city = String(place?.city_mun ?? '').trim();
  const address = sanitizeAddress(place?.address, place?.name);
  if (city && address) {
    const foldCity = normalizeToken(city);
    const foldAddr = normalizeToken(address);
    if (foldAddr.includes(foldCity)) return address;
    return `${city} · ${address}`;
  }
  if (city) return city;
  if (address) return address;
  return 'Cavite, Philippines';
}

function categoryBadgeLabel(place) {
  const raw = String(place?.ntdp_category ?? '').trim();
  if (raw) return formatNtdpCategoryTagLabel(raw);
  const type = String(place?.type ?? place?.ta_category ?? '').trim();
  return type || '';
}

export function SearchPage() {
  const navigate = useNavigate();
  const { showSaveSuccess, toastProps } = useSaveSuccessToast();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** @type {import('../lib/placeFilterHelpers').AppliedPlaceFilters | null} */
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [quickPillId, setQuickPillId] = useState('all');
  const [quickPills, setQuickPills] = useState(() => pillsFromCategoryOptions(staticCategoryOptions()));
  const [displayPlaces, setDisplayPlaces] = useState([]);
  const [dataSource, setDataSource] = useState('loading');
  const [fetchError, setFetchError] = useState('');
  const [userCoords, setUserCoords] = useState(() => {
    const cached = readCachedUserLocation();
    return cached ? { lat: cached.lat, lng: cached.lng } : null;
  });
  const [previewPlaceId, setPreviewPlaceId] = useState(null);
  const [reviewStats, setReviewStats] = useState(() => ({}));
  const [authUser, setAuthUser] = useState(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [savePlace, setSavePlace] = useState(null);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);
  const [saveListError, setSaveListError] = useState('');
  /** @type {[Set<string>, function]} */
  const [savedPlaceIds, setSavedPlaceIds] = useState(() => new Set());
  const trendingRef = useRef([]);

  const refreshSavedPlaceIds = useCallback(async (userId) => {
    if (!userId) {
      setSavedPlaceIds(new Set());
      return;
    }
    try {
      const lists = await fetchSavedListsForUser(userId);
      const ids = new Set();
      for (const list of lists ?? []) {
        for (const item of list.items ?? []) {
          if (item?.kind === 'itinerary' || String(item?.id ?? '').startsWith('itinerary-')) continue;
          const id = String(item?.id ?? '').trim();
          if (id) ids.add(id);
        }
      }
      setSavedPlaceIds(ids);
    } catch {
      setSavedPlaceIds(new Set());
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setAuthUser(data?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setAuthUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshSavedPlaceIds(authUser?.id);
    const onUpdated = () => void refreshSavedPlaceIds(authUser?.id);
    window.addEventListener(SAVED_LISTS_UPDATED_EVENT, onUpdated);
    window.addEventListener('focus', onUpdated);
    return () => {
      window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, onUpdated);
      window.removeEventListener('focus', onUpdated);
    };
  }, [authUser?.id, refreshSavedPlaceIds]);

  useEffect(() => {
    let cancelled = false;
    void fetchAppFilterCategoryOptions().then((opts) => {
      if (cancelled) return;
      setRuntimeCategoryLabels(labelMapFromOptions(opts));
      const nextPills = pillsFromCategoryOptions(opts);
      setQuickPills(nextPills);
      setQuickPillId((prev) => (nextPills.some((p) => p.id === prev) ? prev : 'all'));
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
    let debounceTimer = null;
    const refreshStats = () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        void fetchPlaceReviewStats(supabase)
          .then((stats) => setReviewStats(stats))
          .catch((err) => logPlacesFetchError('fetchPlaceReviewStats.realtime', err));
      }, 400);
    };

    const channel = supabase
      .channel('search-place-reviews')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'place_reviews' }, () => refreshStats())
      .subscribe();

    return () => {
      if (debounceTimer) window.clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
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

  const quickFilters = useMemo(() => {
    const pill = quickPills.find((p) => p.id === quickPillId) || quickPills[0];
    if (!pill || pill.kind === 'all') return null;
    if (pill.kind === 'category') {
      return {
        selectedCategoryKeys: [pill.key],
        selectedCityKeys: [],
        selectedMunicipalityKeys: [],
      };
    }
    if (pill.kind === 'location') {
      return {
        selectedCategoryKeys: [],
        selectedCityKeys: [pill.key],
        selectedMunicipalityKeys: [],
      };
    }
    return null;
  }, [quickPillId, quickPills]);

  const filteredPlaces = useMemo(() => {
    return displayPlaces.filter((p) => {
      if (!placePassesAppliedFilters(p, appliedFilters)) return false;
      if (!placePassesAppliedFilters(p, quickFilters)) return false;
      return true;
    });
  }, [displayPlaces, appliedFilters, quickFilters]);

  const activeFilterCount = countActiveFilters(appliedFilters);

  const mapPlaces = useMemo(
    () => filteredPlaces.filter((p) => p.lat != null && p.lng != null),
    [filteredPlaces]
  );

  const previewPlace = useMemo(
    () => (previewPlaceId ? filteredPlaces.find((p) => String(p.id) === String(previewPlaceId)) : null),
    [previewPlaceId, filteredPlaces]
  );

  const openSaveForPlace = async (place, e) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    let user = authUser;
    if (!user) {
      const { data } = await supabase.auth.getUser();
      user = data?.user ?? null;
      if (user) setAuthUser(user);
    }
    if (!user) {
      const next = encodeURIComponent('/search');
      navigate(`/login?next=${next}`);
      return;
    }
    setSavePlace(place);
    const suggestedName = place?.ntdp_category ? formatNtdpCategoryTagLabel(place.ntdp_category) : 'My list';
    setListNameDraft(suggestedName);
    setExistingLists([]);
    setSaveListError('');
    setSaveModalOpen(true);
    try {
      const lists = await fetchSavedListsForUser(user.id);
      setExistingLists(lists);
    } catch {
      setExistingLists([]);
    }
  };

  const placePayload = savePlace
    ? {
        id: savePlace.id,
        name: savePlace.name,
        image: savePlace.imageUrl || PLACEHOLDER_IMG,
        subtitle: sanitizeAddress(savePlace.address, savePlace.name) || formatPlaceLocation(savePlace),
        establishmentTag: categoryBadgeLabel(savePlace),
      }
    : null;

  const saveFailureMessage = (reason) => {
    if (reason === 'place_not_in_catalog') {
      return 'This establishment could not be saved. Try again or pick another list.';
    }
    if (reason === 'list_not_found') return 'That list is no longer available.';
    if (reason === 'invalid_input') return 'Enter a list name to save this establishment.';
    return 'Could not save this establishment. Try again.';
  };

  const handleConfirmSaveToList = async () => {
    const trimmed = String(listNameDraft ?? '').trim();
    if (!trimmed || !placePayload || !authUser) {
      setSaveListError(saveFailureMessage('invalid_input'));
      return;
    }
    setSaveListError('');
    try {
      const result = await savePlaceToListRemote(authUser.id, trimmed, placePayload);
      if (result.ok) {
        showSaveSuccess(trimmed);
        setSavedPlaceIds((prev) => {
          const next = new Set(prev);
          next.add(String(placePayload.id));
          return next;
        });
        setSaveModalOpen(false);
        setSavePlace(null);
        return;
      }
      setSaveListError(saveFailureMessage(result.reason));
    } catch (err) {
      setSaveListError(String(err?.message ?? '').trim() || saveFailureMessage());
    }
  };

  const handleSaveToExistingList = async (listId) => {
    if (!placePayload || !authUser) return;
    setSaveListError('');
    try {
      const result = await savePlaceToListIdRemote(authUser.id, listId, placePayload);
      if (result.ok) {
        showSaveSuccess(result.listName || 'list');
        setSavedPlaceIds((prev) => {
          const next = new Set(prev);
          next.add(String(placePayload.id));
          return next;
        });
        setSaveModalOpen(false);
        setSavePlace(null);
        return;
      }
      setSaveListError(saveFailureMessage(result.reason));
    } catch (err) {
      setSaveListError(String(err?.message ?? '').trim() || saveFailureMessage());
    }
  };

  return (
    <div className="bg-[#F1F7F6] font-['Poppins',sans-serif] text-[#16352E] max-lg:min-h-dvh lg:h-dvh lg:overflow-hidden">
      <div className="mx-auto flex max-w-[1600px] flex-col max-lg:min-h-dvh lg:h-full">
        <AppHeader embedded />

        <div className="shrink-0 px-4 pb-3 sm:px-6 lg:px-8">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <form
                className="min-w-0 flex-1"
                role="search"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="flex min-w-0 items-center gap-2 rounded-full bg-white px-3 py-2.5 shadow-[inset_0_1px_2px_rgba(22,53,46,0.04)] ring-1 ring-neutral-200/80 sm:px-4">
                  <input
                    type="search"
                    placeholder="Enter a tourist spot"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-w-0 bg-transparent text-[15px] leading-snug text-[#16352E] outline-none placeholder:text-[#707D7D]"
                  />
                  <button
                    type="submit"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#10A37F] text-white transition hover:bg-[#168F7A]"
                    aria-label="Search"
                  >
                    <svg
                      className="h-[18px] w-[18px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.85"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <circle cx="11" cy="11" r="6.5" />
                      <path d="m20 20-4-4" />
                    </svg>
                  </button>
                </div>
              </form>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-white text-[#1B8A70] ring-1 ring-neutral-200/80 transition hover:bg-[#D4EFE8]"
                aria-label={activeFilterCount > 0 ? `Filters (${activeFilterCount} active)` : 'Open filters'}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                  <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" strokeLinejoin="round" />
                </svg>
                {activeFilterCount > 0 ? (
                  <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#10A37F] px-1 text-[10px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
            </div>

            <div
              className="flex min-w-0 shrink-0 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:ml-0"
              role="toolbar"
              aria-label="Quick filters"
            >
              {quickPills.map((pill) => {
                const active = quickPillId === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setQuickPillId(pill.id)}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                      active
                        ? 'bg-[#1B8A70] text-white shadow-[0_4px_12px_rgba(27,138,112,0.25)]'
                        : 'bg-white text-neutral-700 ring-1 ring-neutral-200/90 hover:bg-[#F1F7F6]'
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>
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
              {dataSource === 'loading' ? (
                <SearchPlacesSkeleton />
              ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredPlaces.map((place) => {
                  const stats = reviewStats[String(place.id)];
                  const reviewCount = stats?.reviewCount ?? 0;
                  const avgRating = stats?.avgRating;
                  const badge = categoryBadgeLabel(place);
                  const isSaved = savedPlaceIds.has(String(place.id));
                  return (
                    <article
                      key={place.id}
                      role="link"
                      tabIndex={0}
                      onClick={(e) => {
                        if (e.target.closest('button')) return;
                        navigate(`/place/${place.id}`);
                      }}
                      onKeyDown={(e) => {
                        if (e.target.closest('button')) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/place/${place.id}`);
                        }
                      }}
                      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[16px] bg-white text-left shadow-[0_8px_24px_rgba(22,53,46,0.06)] ring-1 ring-neutral-100 transition hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(22,53,46,0.1)]"
                    >
                      <div className="relative overflow-hidden bg-neutral-100">
                        <img
                          src={place.imageUrl || PLACEHOLDER_IMG}
                          alt={place.name}
                          className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.03] sm:h-44"
                        />
                        {badge ? (
                          <span className="absolute left-2.5 top-2.5 max-w-[70%] truncate rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1B8A70] shadow-sm ring-1 ring-[#1B8A70]/15">
                            {badge}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.stopPropagation();
                          }}
                          onClick={(e) => void openSaveForPlace(place, e)}
                          className={`absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-neutral-200/80 transition hover:bg-[#E8F5F1] ${
                            isSaved ? 'text-[#E76365]' : 'text-[#1B8A70]'
                          }`}
                          aria-label={isSaved ? `Save ${place.name} to another list` : `Save ${place.name}`}
                          aria-pressed={isSaved}
                        >
                          {isSaved ? (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                              <path
                                d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      <div className="flex flex-1 flex-col px-3.5 pb-3.5 pt-3">
                        <p className="text-base font-semibold leading-snug text-[#16352E]">{place.name}</p>
                        <p className="mt-1 text-sm leading-snug text-[#707D7D]">
                          <svg
                            className="-mt-0.5 mr-1 inline h-4 w-4 text-[#39A98F]"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            aria-hidden
                          >
                            <path
                              fillRule="evenodd"
                              d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {formatPlaceLocation(place)}
                        </p>
                        {reviewCount > 0 ? (
                          <p className="mt-2 text-sm text-[#707D7D]">
                            <span className="mr-1 text-[#f4c430]">★</span>
                            {`${avgRating.toFixed(1)} (${reviewCount.toLocaleString()} ${
                              reviewCount === 1 ? 'Review' : 'Reviews'
                            })`}
                          </p>
                        ) : null}
                        <span className="mt-auto flex pt-3">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5F1] px-3.5 py-2 text-xs font-semibold text-[#1B8A70] ring-1 ring-[#1B8A70]/15 transition group-hover:bg-[#1B8A70] group-hover:text-white group-hover:ring-[#1B8A70]">
                            View details
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </span>
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
              )}
            </div>
          </section>

          <section
            className="relative min-h-[50vh] min-w-0 overflow-hidden rounded-[24px] bg-[#E8F3F0] outline-none lg:col-span-5 lg:h-full lg:min-h-0"
            onMouseLeave={() => setPreviewPlaceId(null)}
          >
            {dataSource === 'loading' ? (
              <div className="absolute inset-0 animate-pulse bg-[#d7e8e3]" aria-busy="true" aria-label="Loading map" />
            ) : (
              <PlacesLeafletMap
                places={mapPlaces}
                userLocation={userCoords}
                onMarkerClick={(p) => navigate(`/place/${p.id}`)}
                onMarkerHover={(p) => setPreviewPlaceId(p.id)}
              />
            )}

            {previewPlace && dataSource !== 'loading' ? (
              <button
                type="button"
                onClick={() => navigate(`/place/${previewPlace.id}`)}
                className="absolute left-4 top-4 z-[500] max-w-[280px] overflow-hidden rounded-2xl bg-white/95 text-left shadow-[0_12px_30px_rgba(22,53,46,0.16)] backdrop-blur-sm transition hover:shadow-[0_16px_36px_rgba(22,53,46,0.2)] sm:left-5 sm:top-5"
                aria-label={`About ${previewPlace.name}`}
              >
                <img src={previewPlace.imageUrl || PLACEHOLDER_IMG} alt="" className="h-28 w-full object-cover" />
                <div className="p-3">
                  <p className="font-['Poppins',sans-serif] text-base font-semibold text-[#16352E]">
                    {previewPlace.name}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-[#707D7D]">{formatPlaceLocation(previewPlace)}</p>
                  {categoryBadgeLabel(previewPlace) ? (
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[#10A37F]">
                      {categoryBadgeLabel(previewPlace)}
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
        hideCategories
        onApply={(f) => {
          const n =
            (f.selectedCategoryKeys?.length ?? 0) +
            (f.selectedCityKeys?.length ?? 0) +
            (f.selectedMunicipalityKeys?.length ?? 0);
          setAppliedFilters(n > 0 ? f : null);
        }}
      />

      <SaveToListModal
        open={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false);
          setSavePlace(null);
          setSaveListError('');
        }}
        title="Save to list"
        itemLabel={savePlace?.name}
        lists={existingLists}
        listNameDraft={listNameDraft}
        onListNameChange={(v) => {
          setListNameDraft(v);
          setSaveListError('');
        }}
        onSelectList={(listId) => void handleSaveToExistingList(listId)}
        onCreateList={() => void handleConfirmSaveToList()}
        createDisabled={!String(listNameDraft ?? '').trim()}
      />
      {saveListError ? (
        <p className="fixed bottom-20 left-1/2 z-[1200] max-w-sm -translate-x-1/2 rounded-xl bg-red-600 px-4 py-2 text-center text-sm text-white shadow-lg">
          {saveListError}
        </p>
      ) : null}
      <SaveSuccessToast {...toastProps} />
    </div>
  );
}
