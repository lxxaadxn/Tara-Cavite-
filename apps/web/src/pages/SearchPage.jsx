import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase, searchPlacesByText } from '../lib/placesFromSupabase';
import { placePassesAppliedFilters, sortPlacesByModeWeb } from '../lib/placeFilterHelpers';
import { AppHeader } from '../components/AppHeader';
import { FilterModal } from '../components/FilterModal';
import { PlacesLeafletMap } from '../components/PlacesLeafletMap';
import { SYNC_MESSAGES, mapDemoEstablishmentRows } from 'cavitour-shared';
import { rowToPlace } from '../lib/placesFromSupabase';
import { formatNtdpCategoryTagLabel, getEstablishmentAboutBody } from '../lib/ntdpDisplayLabels';

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

function extractNtdpTag(place) {
  if (place?.ntdp_category) return String(place.ntdp_category).trim();
  const description = place?.description ?? '';
  const match = description.match(/NTDP:\s*([^.\n]+)/i);
  return match?.[1]?.trim() || null;
}

function extractMunicipalityTag(place) {
  if (place?.city_mun) return String(place.city_mun).trim();
  const address = place?.address ?? '';
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const caviteIdx = parts.findIndex((p) => /^cavite$/i.test(p));
  if (caviteIdx > 0) return parts[caviteIdx - 1];
  const parenMatch = (place?.description ?? '').match(/\(([^)]+)\)/);
  return parenMatch?.[1]?.trim() || null;
}

function buildPlaceTags(place) {
  const tags = [extractNtdpTag(place), extractMunicipalityTag(place)]
    .filter(Boolean)
    .map((tag) => tag.replace(/^sta\.?\s*/i, '').replace(/^brgy\.?\s*/i, '').trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(tags));
}

function displayHomeTagLabel(place, tag) {
  const ntdp = extractNtdpTag(place);
  if (ntdp && tag === ntdp) return formatNtdpCategoryTagLabel(tag);
  return tag;
}

function sanitizeDescription(description) {
  if (!description) return '';
  return description
    .replace(/NTDP:\s*[^.\n]*\.?/gi, '')
    .replace(/Barangay:\s*[^.\n]*\.?/gi, '')
    .replace(/STA-v3\s*Cavite\s*2025\s*\([^)]+\)\.?/gi, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function cardRating(seed) {
  return (4.6 + ((seed % 5) * 0.1)).toFixed(1);
}

function cardReviewCount(seed) {
  return 640 + ((seed * 137) % 1800);
}

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

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) return '';
  if (distanceKm < 1) return `${distanceKm.toFixed(2)} km`;
  return `${distanceKm.toFixed(1)} km`;
}

function mapSpotToPlace(spot) {
  return {
    id: spot.id,
    name: spot.name,
    address: spot.address,
    lat: spot.lat,
    lng: spot.lng,
    imageUrl: spot.image,
    description: spot.description,
    ntdp_category: Array.isArray(spot.tags) ? spot.tags[0] : null,
    city_mun: (spot.address || '').split(',').slice(-1)[0]?.trim() || 'Cavite',
    type: Array.isArray(spot.tags) ? spot.tags[0] : 'Place',
  };
}

export function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  /** @type {import('../components/FilterModal').AppliedPlaceFilters | null} */
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [displayPlaces, setDisplayPlaces] = useState([]);
  const [allPlaces, setAllPlaces] = useState([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [dataSource, setDataSource] = useState('loading');
  const [userCoords, setUserCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState(
    typeof window !== 'undefined' && window.navigator?.geolocation ? 'locating' : 'unsupported'
  );
  const trendingRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAllPlacesFromSupabase(supabase, 1000);
        if (cancelled) return;
        trendingRef.current = list;
        setAllPlaces(list);
        setDisplayPlaces(list);
        setDataSource('live');
      } catch {
        if (cancelled) return;
        const fallbackPlaces = mapDemoEstablishmentRows((row) => rowToPlace(row));
        trendingRef.current = fallbackPlaces;
        setAllPlaces(fallbackPlaces);
        setDisplayPlaces(fallbackPlaces);
        setDataSource('demo');
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
        setLocationStatus('ready');
      },
      () => {
        if (cancelled) return;
        setLocationStatus('unavailable');
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
      if (dataSource === 'live') {
        searchPlacesByText(supabase, q, 1000)
          .then((list) => setDisplayPlaces(list.length ? list : []))
          .catch(() => {});
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

  const filteredPlaces = useMemo(() => {
    const sortMode = appliedFilters?.sortMode ?? '';
    let list = sortPlacesByModeWeb(modalFilteredPlaces, sortMode);
    if (!sortMode && userCoords) {
      list = [...list].sort((a, b) => {
        const aDistance = haversineDistanceKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const bDistance = haversineDistanceKm(userCoords.lat, userCoords.lng, b.lat, b.lng);
        return aDistance - bDistance;
      });
    }
    return list;
  }, [modalFilteredPlaces, appliedFilters?.sortMode, userCoords]);

  const mapPlaces = useMemo(
    () => filteredPlaces.filter((p) => p.lat != null && p.lng != null),
    [filteredPlaces]
  );
  const distanceByPlaceId = useMemo(() => {
    const distances = new Map();
    if (!userCoords) return distances;
    for (const place of filteredPlaces) {
      distances.set(place.id, haversineDistanceKm(userCoords.lat, userCoords.lng, place.lat, place.lng));
    }
    return distances;
  }, [filteredPlaces, userCoords]);

  const effectiveSelectedPlaceId = useMemo(() => {
    if (!selectedPlaceId) return null;
    return filteredPlaces.some((p) => p.id === selectedPlaceId) ? selectedPlaceId : null;
  }, [selectedPlaceId, filteredPlaces]);

  const selectedPlace = filteredPlaces.find((p) => p.id === effectiveSelectedPlaceId) ?? null;
  const thumbnailPlaces = useMemo(
    () => filteredPlaces.filter((p) => p.id !== effectiveSelectedPlaceId),
    [filteredPlaces, effectiveSelectedPlaceId]
  );
  const selectedPlaceTags = useMemo(() => buildPlaceTags(selectedPlace), [selectedPlace]);
  const selectedPlaceAboutBody = useMemo(() => {
    if (!selectedPlace) return '';
    return getEstablishmentAboutBody({
      description: sanitizeDescription(selectedPlace.description ?? ''),
      ntdp_category: selectedPlace.ntdp_category,
      name: selectedPlace.name,
      address: selectedPlace.address,
    });
  }, [selectedPlace]);
  const selectedPlaceCardBlurb = useMemo(
    () => (selectedPlaceAboutBody ? selectedPlaceAboutBody.replace(/\s+/g, ' ').trim() : ''),
    [selectedPlaceAboutBody]
  );
  const selectedPlaceDistance = selectedPlace ? distanceByPlaceId.get(selectedPlace.id) : null;

  return (
    <div className="min-h-screen bg-[#efefec] font-['Inter',sans-serif] text-neutral-900">
      <AppHeader />

      <div className="w-full px-3 pb-2 pt-3 sm:px-4 lg:px-8">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.45fr_1fr]">
          <section className="relative min-h-[62vh] overflow-hidden rounded-[20px] border border-neutral-200 bg-[#e8ebe6] shadow-[0_10px_28px_rgba(0,0,0,0.08)] lg:sticky lg:top-[86px] lg:self-start lg:min-h-[calc(100vh-102px)]">
            <PlacesLeafletMap
              places={mapPlaces}
              userLocation={userCoords}
              onMarkerClick={(p) => {
                setSelectedPlaceId(p.id);
              }}
            />

            <div className="pointer-events-none absolute inset-0 z-[450] bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.45),transparent_42%)]" />

          </section>

          <section className="rounded-[20px] border border-neutral-200 bg-white p-3 shadow-[0_10px_28px_rgba(0,0,0,0.08)] sm:p-3.5 lg:min-h-[calc(100vh-102px)]">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
                  </svg>
                  <input
                    type="search"
                    placeholder="Region, city, destination"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
                </svg>
                Filters
              </button>
            </div>
            {locationStatus === 'ready' && (
              <p className="-mt-1 mb-2 text-xs text-neutral-500">Showing places nearest to your current location.</p>
            )}
            {locationStatus === 'unavailable' && (
              <p className="-mt-1 mb-2 text-xs text-neutral-500">Location access is off. Showing all places instead.</p>
            )}

            {selectedPlace ? (
              <article className="rounded-2xl border border-neutral-200 p-2 sm:p-2.5">
                <div className="relative">
                  <img
                    src={selectedPlace.imageUrl || PLACEHOLDER_IMG}
                    alt={selectedPlace.name}
                    className="h-40 w-full rounded-[16px] object-cover sm:h-44"
                  />
                  <span className="absolute left-2 top-2 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700 shadow">4.8</span>
                </div>
                <div className="mt-1.5 flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">Most popular</p>
                    <h2 className="mt-0.5 font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">{selectedPlace.name}</h2>
                    <p className="mt-0.5 text-xs text-neutral-500">{sanitizeAddress(selectedPlace.address, selectedPlace.name)}</p>
                    {selectedPlaceDistance != null && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-neutral-400">
                        <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path
                            fillRule="evenodd"
                            d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {formatDistance(selectedPlaceDistance)}
                      </p>
                    )}
                  </div>
                  <button type="button" className="rounded-lg border border-neutral-200 p-1.5 text-neutral-500 transition hover:bg-neutral-50">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 12h8M12 8v8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {selectedPlaceTags.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {selectedPlaceTags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700"
                      >
                        {displayHomeTagLabel(selectedPlace, tag)}
                      </span>
                    ))}
                  </div>
                )}
                {selectedPlaceCardBlurb ? (
                  <div className="mt-1.5 rounded-xl bg-neutral-50 px-2 py-1.5">
                    <p className="text-xs leading-relaxed text-neutral-600 line-clamp-4">{selectedPlaceCardBlurb}</p>
                  </div>
                ) : null}
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/place/${selectedPlace.id}`)}
                    className="rounded-xl border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                  >
                    Directions
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/place/${selectedPlace.id}`)}
                    className="rounded-xl bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Explore
                  </button>
                </div>
              </article>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {filteredPlaces.map((place, idx) => (
                  <article
                    key={place.id}
                    onClick={() => setSelectedPlaceId(place.id)}
                    className="flex h-full min-h-[234px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 text-left transition hover:shadow-md"
                  >
                    <div className="overflow-hidden rounded-xl bg-neutral-100">
                      <img src={place.imageUrl || PLACEHOLDER_IMG} alt={place.name} className="h-32 w-full object-cover" />
                    </div>
                    <div className="flex-1 px-1 pb-1 pt-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{place.name}</p>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-neutral-500">
                        <svg className="-mt-0.5 mr-1 inline h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path
                            fillRule="evenodd"
                            d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {sanitizeAddress(place.address, place.name)}
                      </p>
                      {distanceByPlaceId.has(place.id) && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-neutral-400">
                          <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path
                              fillRule="evenodd"
                              d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {formatDistance(distanceByPlaceId.get(place.id))}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-neutral-400">
                          <span className="mr-1 text-[#f4c430]">★</span>
                          {cardRating(idx)} ({cardReviewCount(idx).toLocaleString()} Reviews)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/place/${place.id}`);
                          }}
                          className="shrink-0 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                        >
                          Explore
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {selectedPlace && (
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {thumbnailPlaces.map((place, idx) => (
                  <article
                    key={place.id}
                    onClick={() => setSelectedPlaceId(place.id)}
                    className={`flex h-full min-h-[234px] cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white p-2 text-left transition ${
                      effectiveSelectedPlaceId === place.id ? 'border-neutral-900 shadow-md' : 'border-neutral-200'
                    }`}
                  >
                    <div className="overflow-hidden rounded-xl bg-neutral-100">
                      <img
                        src={place.imageUrl || PLACEHOLDER_IMG}
                        alt={place.name}
                        className="h-32 w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 px-1 pb-1 pt-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{place.name}</p>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[11px] text-neutral-500">
                        <svg className="-mt-0.5 mr-1 inline h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                          <path
                            fillRule="evenodd"
                            d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                            clipRule="evenodd"
                          />
                        </svg>
                        {sanitizeAddress(place.address, place.name)}
                      </p>
                      {distanceByPlaceId.has(place.id) && (
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-neutral-400">
                          <svg className="h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <path
                              fillRule="evenodd"
                              d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {formatDistance(distanceByPlaceId.get(place.id))}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] text-neutral-400">
                          <span className="mr-1 text-[#f4c430]">★</span>
                          {cardRating(idx)} ({cardReviewCount(idx).toLocaleString()} Reviews)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/place/${place.id}`);
                          }}
                          className="shrink-0 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                        >
                          Explore
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

          </section>
        </div>

        {dataSource === 'live' && (
          <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-emerald-800">
            {SYNC_MESSAGES.live}
          </p>
        )}
        {dataSource === 'demo' && (
          <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-amber-800">
            {SYNC_MESSAGES.demo}
          </p>
        )}
      </div>

      <FilterModal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        places={allPlaces}
        onApply={(f) => setAppliedFilters(f)}
      />
    </div>
  );
}
