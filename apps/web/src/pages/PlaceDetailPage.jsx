import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase, fetchPlaceById } from '../lib/placesFromSupabase';
import { AppHeader } from '../components/AppHeader';
import { RouteLeafletMap } from '../components/RouteLeafletMap';
import { readSavedLists, savePlaceToList, savePlaceToListId } from '../lib/savedPlaces';
import { formatNtdpCategoryTagLabel, isLikelyPlaceholderDescription } from '../lib/ntdpDisplayLabels';
import { fetchDrivingRoute } from '../lib/fetchOsrmRoute';
import { buildCommuterNarrativeFromOsrmSteps } from '../lib/commuterRouteNarration';

const olive = '#7ea00e';
const COMMUTER_DISCLAIMER =
  'Steps follow the mapped road (OSRM / OpenStreetMap), not live transit schedules. Confirm signs, fares, and stops with operators.';
const COMMUTER_FOOTNOTE = 'Roads and stops change — double-check locally, especially if you drive.';
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';
const DEFAULT_FALLBACK_SPOT = {
  id: 'fallback-spot',
  name: 'Tagaytay Picnic Grove',
  address: 'Tagaytay City, Cavite, Philippines',
  lat: 14.1153,
  lng: 120.9621,
  image: PLACEHOLDER_IMG,
  tags: ['Tourist Spot'],
  description: 'A scenic ridge destination in Cavite with viewpoints, picnic areas, and quick access routes.',
  subtitle: 'Tourist Spot',
  hours: 'Open daily',
  fromSupabase: false,
  ntdp_category: null,
  city_mun: 'Tagaytay City',
  ta_category: null,
  type_code: null,
};

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function cleanPlaceAddress(name, address) {
  if (!address) return 'Cavite, Philippines';
  const parts = address.split(',').map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return 'Cavite, Philippines';
  const first = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedName = String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (first && normalizedName && (first === normalizedName || first.includes(normalizedName) || normalizedName.includes(first))) {
    parts.shift();
  }
  return parts.join(', ') || 'Cavite, Philippines';
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

function spotCategoryTypeFromDb(spot) {
  const raw = String(spot?.ntdp_category ?? '').trim();
  if (raw) return formatNtdpCategoryTagLabel(raw);
  const ta = typeof spot?.ta_category === 'string' ? spot.ta_category.trim() : '';
  if (ta) return ta;
  const tc = typeof spot?.type_code === 'string' ? spot.type_code.trim() : '';
  if (tc) return tc;
  const tag = spot?.tags?.find((t) => t && String(t).trim());
  if (tag) return formatNtdpCategoryTagLabel(String(tag).trim());
  if (spot?.subtitle && typeof spot.subtitle === 'string') {
    const parts = spot.subtitle.split('·');
    if (parts.length > 1) return parts.slice(1).join('·').trim();
    return spot.subtitle.trim();
  }
  return '—';
}

/** Municipality + province line (Cavite inventory); prefers `city_mun` from DB. */
function formatMunicipalityProvince(cityMun, address) {
  const m = cityMun && String(cityMun).trim();
  if (m) {
    if (/philippines/i.test(m)) return m;
    if (/cavite/i.test(m)) return `${m.replace(/,?\s*$/, '')}, Philippines`;
    return `${m}, Cavite, Philippines`;
  }
  const addr = address && String(address).trim();
  if (!addr) return 'Cavite, Philippines';
  const parts = addr.split(',').map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return addr;
  const cavIdx = parts.findIndex((p) => /^cavite$/i.test(p) || /\bcavite\b/i.test(p));
  if (cavIdx >= 0) {
    const start = Math.max(0, cavIdx - 1);
    return parts.slice(start).join(', ');
  }
  return parts.slice(-3).join(', ');
}

function numericSeed(value, fallback = 42) {
  const digits = Number(String(value ?? '').replace(/\D/g, '').slice(-4));
  return Number.isFinite(digits) && digits > 0 ? digits : fallback;
}

function createFallbackSpot(sourcePlace) {
  if (!sourcePlace) return { ...DEFAULT_FALLBACK_SPOT };
  return {
    id: sourcePlace.id || DEFAULT_FALLBACK_SPOT.id,
    name: sourcePlace.name || DEFAULT_FALLBACK_SPOT.name,
    address: sourcePlace.address || DEFAULT_FALLBACK_SPOT.address,
    lat: sourcePlace.lat ?? DEFAULT_FALLBACK_SPOT.lat,
    lng: sourcePlace.lng ?? DEFAULT_FALLBACK_SPOT.lng,
    image: sourcePlace.imageUrl || DEFAULT_FALLBACK_SPOT.image,
    tags: [sourcePlace.ntdp_category].filter(Boolean).slice(0, 6),
    description: sourcePlace.description || `${sourcePlace.name} — ${sourcePlace.address}.`,
    subtitle: sourcePlace.ntdp_category
      ? `${sourcePlace.type ?? 'Place'} · ${formatNtdpCategoryTagLabel(sourcePlace.ntdp_category)}`
      : sourcePlace.type || DEFAULT_FALLBACK_SPOT.subtitle,
    hours: sourcePlace.hours || DEFAULT_FALLBACK_SPOT.hours,
    fromSupabase: false,
    ntdp_category: sourcePlace.ntdp_category ?? null,
    city_mun: sourcePlace.city_mun ?? DEFAULT_FALLBACK_SPOT.city_mun,
    ta_category: sourcePlace.ta_category ?? null,
    type_code: sourcePlace.type_code ?? null,
  };
}

function formatDuration(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes ? `${minutes} min` : ''}`.trim();
}

function formatReviewCount(n) {
  const v = Math.max(0, Math.floor(Number(n) || 0));
  if (v >= 1000) {
    const k = v / 1000;
    const s = k >= 10 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '');
    return `${s}K`;
  }
  return String(v);
}

/** Build stats so total, average, and bar widths all match the same rating list. */
function buildReviewStatsFromRatings(ratings) {
  const list = (ratings ?? []).map((r) => Math.min(5, Math.max(1, Math.round(Number(r)))));
  const total = list.length;
  const labels = ['Five', 'Four', 'Three', 'Two', 'One'];
  const countsByStar = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const s of list) countsByStar[s] += 1;
  const breakdown = [5, 4, 3, 2, 1].map((stars, i) => {
    const count = countsByStar[stars];
    return {
      stars,
      label: labels[i],
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
  const weighted = total ? list.reduce((a, s) => a + s, 0) / total : 0;
  const avgRating = Math.round(weighted * 10) / 10;
  return {
    total,
    avgRating,
    breakdown,
    displayStarCount: total ? Math.min(5, Math.max(1, Math.round(weighted))) : 0,
  };
}

/** Sample reviews — included in totals so averages and bars stay consistent. */
function buildDummyReviews(placeName) {
  const name = placeName?.trim() || 'This place';
  const base = Date.now() - 86_400_000 * 14;
  return [
    {
      id: 'sample-1',
      nickname: 'Mika R.',
      rating: 5,
      text: `Easy visit on a weekday. ${name} matched what we expected from the listing and staff were approachable.`,
      at: base + 86_400_000 * 3,
    },
    {
      id: 'sample-2',
      nickname: 'Kai del Rosario',
      rating: 4,
      text: `Solid stop along our route. A bit busy on a Saturday but still worth the time.`,
      at: base + 86_400_000 * 8,
    },
    {
      id: 'sample-3',
      nickname: 'Benj D.',
      rating: 4,
      text: `Good for a short stay. We'd consider coming back when we're in Cavite again.`,
      at: base + 86_400_000 * 11,
    },
  ];
}

function ReviewStars({ value = 5, size = 'h-4 w-4', dimmed = false }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const active = i < value;
        return (
          <svg
            key={i}
            className={size}
            viewBox="0 0 20 20"
            fill="currentColor"
            style={{ color: active ? '#f4c430' : dimmed ? '#e9ddad' : '#f4e2a1' }}
            aria-hidden
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.155 3.555a1 1 0 00.95.69h3.74c.969 0 1.371 1.24.588 1.81l-3.027 2.2a1 1 0 00-.364 1.118l1.156 3.555c.3.922-.755 1.688-1.539 1.118l-3.027-2.2a1 1 0 00-1.176 0l-3.027 2.2c-.783.57-1.838-.196-1.539-1.118l1.156-3.555a1 1 0 00-.364-1.118l-3.027-2.2c-.783-.57-.38-1.81.588-1.81h3.74a1 1 0 00.95-.69l1.155-3.555z" />
          </svg>
        );
      })}
    </div>
  );
}

function storageKeyForPlaceReviews(placeId) {
  return `cavitour-place-reviews-${placeId}`;
}

function loadSessionReviews(placeId) {
  if (typeof window === 'undefined' || !placeId) return [];
  try {
    const raw = window.sessionStorage.getItem(storageKeyForPlaceReviews(placeId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatReviewTime(ts) {
  const ms = Date.now() - Number(ts);
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

export function PlaceDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [routePanelOpen, setRoutePanelOpen] = useState(false);
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedPlacesRaw, setRelatedPlacesRaw] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);
  const [routeSubTab, setRouteSubTab] = useState('routeMain');
  const [osrmDriving, setOsrmDriving] = useState(null);
  const [osrmLoading, setOsrmLoading] = useState(false);
  const [osrmError, setOsrmError] = useState(null);
  const [sessionReviews, setSessionReviews] = useState([]);

  const openRoutePanel = useCallback(() => {
    setRoutePanelOpen(true);
  }, []);

  const closeRoutePanel = useCallback(() => {
    setRoutePanelOpen(false);
    const p = new URLSearchParams(searchParams);
    if (!p.has('tab')) return;
    p.delete('tab');
    setSearchParams(p, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setRoutePanelOpen(false);
  }, [id]);

  useEffect(() => {
    const q = searchParams.get('tab');
    if (q === 'description' || q === 'reviews' || q === 'route') {
      const p = new URLSearchParams(searchParams);
      p.delete('tab');
      setSearchParams(p, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    if (!routePanelOpen) {
      setRouteSubTab('routeMain');
    }
  }, [routePanelOpen]);

  useEffect(() => {
    if (!routePanelOpen || spot?.lat == null || spot?.lng == null || !userCoords) {
      return;
    }
    let cancelled = false;
    setOsrmLoading(true);
    setOsrmError(null);
    (async () => {
      try {
        const from = { lat: userCoords.lat, lng: userCoords.lng };
        const to = { lat: spot.lat, lng: spot.lng };
        const d = await fetchDrivingRoute(from, to);
        if (!cancelled) {
          setOsrmDriving(d);
        }
      } catch {
        if (!cancelled) {
          setOsrmError('Could not load road route.');
          setOsrmDriving(null);
        }
      } finally {
        if (!cancelled) setOsrmLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routePanelOpen, spot?.lat, spot?.lng, userCoords?.lat, userCoords?.lng]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!id || !isUuid(id)) {
          if (!cancelled) setSpot(createFallbackSpot());
          return;
        }
        const p = await fetchPlaceById(supabase, id);
        if (cancelled) return;
        if (p) {
          setSpot({
            id: p.id,
            name: p.name,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
            image: p.imageUrl || PLACEHOLDER_IMG,
            galleryUrls: p.galleryUrls,
            tags: [p.ntdp_category].filter(Boolean).slice(0, 6),
            description: p.description || `${p.name} — ${p.address}.`,
            subtitle: p.ntdp_category
              ? `${p.type ?? 'Place'} · ${formatNtdpCategoryTagLabel(p.ntdp_category)}`
              : p.type,
            hours: p.hours,
            fromSupabase: true,
            ntdp_category: p.ntdp_category ?? null,
            city_mun: p.city_mun ?? null,
            ta_category: p.ta_category ?? null,
            type_code: p.type_code ?? null,
          });
        } else {
          setSpot(createFallbackSpot(relatedPlacesRaw[0]));
        }
      } catch {
        if (!cancelled) {
          setSpot(createFallbackSpot(relatedPlacesRaw[0]));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, relatedPlacesRaw]);

  useEffect(() => {
    if (!spot?.id) {
      setSessionReviews([]);
      return;
    }
    setSessionReviews(loadSessionReviews(spot.id));
  }, [spot?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAllPlacesFromSupabase(supabase, 1000);
        if (cancelled) return;
        setRelatedPlacesRaw(list);
      } catch {
        if (!cancelled) setRelatedPlacesRaw([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const extras = [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&q=80',
  ];

  const dummyReviews = useMemo(() => (spot ? buildDummyReviews(spot.name) : []), [spot?.name]);

  const reviewStatsRatings = useMemo(() => {
    return [...dummyReviews.map((d) => d.rating), ...sessionReviews.map((s) => s.rating)];
  }, [dummyReviews, sessionReviews]);

  const mergedReviewStats = useMemo(() => buildReviewStatsFromRatings(reviewStatsRatings), [reviewStatsRatings]);

  const allListedReviews = useMemo(() => {
    return [...sessionReviews, ...dummyReviews].sort((a, b) => b.at - a.at);
  }, [dummyReviews, sessionReviews]);

  const detailThumbs = useMemo(() => {
    if (!spot) return [extras[0], extras[1], PLACEHOLDER_IMG];
    if (spot.galleryUrls?.length > 1) {
      const t = spot.galleryUrls.slice(1, 4);
      return [0, 1, 2].map((i) => t[i] ?? spot.image);
    }
    return [extras[0], extras[1], spot.image];
  }, [spot]);

  const relatedPlaces = useMemo(
    () =>
      relatedPlacesRaw
        .filter((s) => s.id !== spot?.id)
        .sort((a, b) => {
          if (!spot) return 0;
          const aDist = haversineDistanceKm(spot.lat, spot.lng, a.lat, a.lng);
          const bDist = haversineDistanceKm(spot.lat, spot.lng, b.lat, b.lng);
          return aDist - bDist;
        })
        .slice(0, 5)
        .map((s) => ({
          id: s.id,
          name: s.name,
          location: s.city_mun ?? cleanPlaceAddress(s.name, s.address),
          image: s.imageUrl || PLACEHOLDER_IMG,
          price: estimatePrice(s.id),
        })),
    [relatedPlacesRaw, spot]
  );
  const routeOptions = useMemo(() => {
    if (!spot) return [];
    const seed = numericSeed(spot.id, 84);
    const baseDistance = 2 + (seed % 14) * 0.55;
    const baseMinutes = Math.round(baseDistance * 6.2);
    return [
      {
        id: 'main-road',
        label: 'Main road',
        mode: 'Via Aguinaldo Highway',
        distanceKm: Number(baseDistance.toFixed(1)),
        durationMin: baseMinutes,
        traffic: 'Moderate',
        accent: 'bg-sky-500',
        color: '#0ea5e9',
      },
    ];
  }, [spot]);

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
        color: '#0ea5e9',
      };
    }
    return routeOptions[0] ?? null;
  }, [osrmDriving, routeOptions]);

  const routeTimeline = useMemo(() => {
    if (!displayRoute || !spot) return [];
    const destAddr = cleanPlaceAddress(spot.name, spot.address);

    return [
      {
        title: userCoords ? 'Your location' : 'Starting point',
        meta: userCoords ? 'Detected via GPS' : 'Set your current location',
      },
      {
        title: spot.name,
        meta: destAddr,
      },
    ];
  }, [displayRoute, spot, userCoords]);

  const touristSpotOverview = useMemo(() => {
    if (!spot) return '';
    const sanitized = sanitizeDescription(spot.description);
    if (sanitized && !isLikelyPlaceholderDescription(sanitized)) return sanitized;
    const cat = spotCategoryTypeFromDb(spot);
    const c = cat === '—' ? 'Cavite tourism' : cat;
    return `This destination is classified under “${c}.” Check with the LGU or site operator for current hours, fees, and visitor guidelines.`;
  }, [spot]);

  const touristSpotCategory = useMemo(() => (spot ? spotCategoryTypeFromDb(spot) : '—'), [spot]);

  const touristSpotMunicipalityProvince = useMemo(
    () => (spot ? formatMunicipalityProvince(spot.city_mun, spot.address) : ''),
    [spot]
  );

  if (loading || !spot) {
    return (
      <div className="min-h-screen flex flex-col bg-white font-['Inter',sans-serif]">
        <AppHeader />
        <main className="flex-1 flex items-center justify-center p-8 text-neutral-500">
          {loading ? 'Loading place…' : 'Place not found.'}
        </main>
      </div>
    );
  }

  const handleSaveToList = () => {
    const suggestedName = spot?.ntdp_category ? formatNtdpCategoryTagLabel(spot.ntdp_category) : 'My list';
    setListNameDraft(suggestedName);
    setExistingLists(readSavedLists());
    setSaveModalOpen(true);
  };

  const handleConfirmSaveToList = () => {
    const trimmed = String(listNameDraft ?? '').trim();
    if (!trimmed) return;
    const result = savePlaceToList(trimmed, {
      id: spot.id,
      name: spot.name,
      image: spot.image,
      subtitle: cleanPlaceAddress(spot.name, spot.address),
      establishmentTag: spot.ntdp_category
        ? formatNtdpCategoryTagLabel(spot.ntdp_category)
        : spot.tags?.[0] ?? '',
    });
    if (result.ok) {
      setSaveStatus(`Saved to "${trimmed}"`);
      window.setTimeout(() => setSaveStatus(''), 2200);
      setSaveModalOpen(false);
    }
  };

  const handleSaveToExistingList = (listId) => {
    const result = savePlaceToListId(listId, {
      id: spot.id,
      name: spot.name,
      image: spot.image,
      subtitle: cleanPlaceAddress(spot.name, spot.address),
      establishmentTag: spot.ntdp_category
        ? formatNtdpCategoryTagLabel(spot.ntdp_category)
        : spot.tags?.[0] ?? '',
    });
    if (result.ok) {
      const label = result.listName || 'list';
      setSaveStatus(`Saved to "${label}"`);
      window.setTimeout(() => setSaveStatus(''), 2200);
      setSaveModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <main className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 sm:p-5">
            <div className="mb-3">
              <Link
                to="/search"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 transition hover:text-neutral-900 hover:underline"
              >
                <span aria-hidden className="text-2xl leading-none">
                  ‹
                </span>
                Back to search
              </Link>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_216px]">
              <div className="rounded-2xl overflow-hidden">
                <img src={spot.image} alt={spot.name} className="h-[250px] w-full object-cover sm:h-[360px]" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                {detailThumbs.map((img, i) => (
                  <div key={`${img}-${i}`} className="rounded-xl overflow-hidden">
                    <img src={img} alt="" className="h-24 w-full object-cover sm:h-[114px]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="font-['Poppins',sans-serif] text-xl font-medium tracking-tight text-neutral-900 sm:text-2xl sm:leading-snug">
                  {spot.name}
                </h1>
                {spot.address?.trim() ? (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">{spot.address.trim()}</p>
                ) : touristSpotMunicipalityProvince ? (
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500">{touristSpotMunicipalityProvince}</p>
                ) : null}
                <p className="mt-3">
                  <span
                    className="inline-block max-w-full rounded-full px-3 py-1 text-[10px] font-normal leading-snug text-[#3d4a06] shadow-sm sm:text-[11px]"
                    style={{ backgroundColor: 'rgba(126, 160, 14, 0.22)' }}
                  >
                    {touristSpotCategory !== '—' ? touristSpotCategory : 'Cavite tourism'}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-start gap-2 pt-1">
                {saveStatus && <span className="text-xs font-medium text-emerald-700">{saveStatus}</span>}
                <button
                  type="button"
                  onClick={handleSaveToList}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-50"
                  aria-label="Save place"
                  title="Save place"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_4px_28px_rgba(0,0,0,0.05)]">
              {!routePanelOpen && (
                <div className="border-b border-neutral-100 bg-gradient-to-b from-neutral-50/90 to-white px-5 py-6 sm:px-7 sm:py-7">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">About this place</p>
                  <p className="mt-4 text-sm leading-relaxed text-neutral-700 whitespace-pre-line">{touristSpotOverview}</p>
                </div>
              )}

              {routePanelOpen && (
                <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-5 sm:px-6 sm:py-6">
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-4 sm:px-5 sm:py-4">
                      <div className="min-w-0">
                        <h3 className="font-['Poppins',sans-serif] text-lg font-semibold tracking-tight text-neutral-900">
                          Directions
                        </h3>
                        <p className="mt-0.5 truncate text-sm text-neutral-500">{spot.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={closeRoutePanel}
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
                          { id: 'stepGuide', label: 'Turn-by-turn' },
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
                            <p className="text-xs leading-relaxed text-neutral-600">{COMMUTER_DISCLAIMER}</p>
                            <p className="text-xs text-neutral-500">{COMMUTER_FOOTNOTE}</p>
                            <div className="whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-sm leading-relaxed text-neutral-800">
                              {buildCommuterNarrativeFromOsrmSteps(osrmDriving?.steps ?? [], spot.name)}
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
                                    {userCoords ? (
                                      <p className="mt-0.5 text-xs text-neutral-500">GPS</p>
                                    ) : null}
                                  </div>
                                  <div className="h-px bg-neutral-200" />
                                  <div>
                                    <p className="text-xs text-neutral-500">To</p>
                                    <p className="mt-0.5 font-medium leading-snug text-neutral-900">{spot.name}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                                      {cleanPlaceAddress(spot.name, spot.address)}
                                    </p>
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
                                    <span className="tabular-nums text-neutral-900">
                                      {displayRoute?.distanceKm ?? '—'} km
                                    </span>
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
                                <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                                  <RouteLeafletMap
                                    className="h-[220px] w-full sm:h-[300px] lg:h-[340px]"
                                    start={userCoords}
                                    end={{ lat: spot.lat, lng: spot.lng }}
                                    routeId={displayRoute?.id ?? 'main-road'}
                                    lineColor={displayRoute?.color ?? '#2563eb'}
                                  />
                                </div>
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
                                            className={`h-2 w-2 rounded-full ${
                                              isLast ? 'bg-neutral-800' : 'bg-neutral-400'
                                            }`}
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
              )}

              {!routePanelOpen && (
              <div className="bg-white">
                <div className="border-b border-neutral-100 bg-gradient-to-br from-[rgba(126,160,14,0.08)] via-white to-white px-5 py-5 sm:px-7 sm:py-6">
                  <h2 className="font-['Poppins',sans-serif] text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
                    Reviews
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
                    Read what visitors shared below — basahin ang experience ng iba pag nagplaplano ka ng bisita.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-7 sm:pt-6">
                  <div className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50/40 shadow-sm">
                    <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1.35fr)_minmax(220px,1fr)]">
                      <div className="space-y-3 border-b border-neutral-100/90 p-5 sm:p-6 lg:border-b-0 lg:border-r lg:border-neutral-100/90 lg:py-7 lg:pl-7 lg:pr-8">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                          Rating breakdown
                        </p>
                        <div className="space-y-2.5">
                          {mergedReviewStats.breakdown.map((row) => (
                            <div
                              key={row.label}
                              className="grid grid-cols-[48px_minmax(0,80px)_minmax(0,1fr)_52px] items-center gap-2 sm:gap-3"
                            >
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                                {row.label}
                              </p>
                              <div className="flex shrink-0 justify-start">
                                <ReviewStars value={row.stars} size="h-3.5 w-3.5" />
                              </div>
                              <div className="h-2 min-w-0 rounded-full bg-white/80 ring-1 ring-neutral-200/80">
                                <div
                                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                                  style={{ width: `${row.pct}%`, backgroundColor: olive }}
                                />
                              </div>
                              <span className="text-right text-xs text-neutral-300 tabular-nums" aria-hidden>
                                {'\u00a0'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div
                        className="flex flex-col justify-center gap-2 px-5 py-6 text-center sm:px-8 sm:py-8"
                        style={{
                          background:
                            'linear-gradient(165deg, rgba(126,160,14,0.12), rgba(126,160,14,0.04) 50%, #fff 100%)',
                        }}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                          Overall
                        </p>
                        <p
                          className="text-4xl font-bold tabular-nums leading-none sm:text-5xl"
                          style={{ color: olive }}
                        >
                          {mergedReviewStats.total > 0 ? mergedReviewStats.avgRating.toFixed(1) : '—'}
                        </p>
                        <div className="flex justify-center pt-1">
                          {mergedReviewStats.total > 0 ? (
                            <ReviewStars value={mergedReviewStats.displayStarCount} size="h-5 w-5 sm:h-6 sm:w-6" />
                          ) : (
                            <ReviewStars value={0} size="h-5 w-5 sm:h-6 sm:w-6" dimmed />
                          )}
                        </div>
                        <p className="text-xs font-medium text-neutral-700 sm:text-sm">
                          {mergedReviewStats.total > 0 ? `${formatReviewCount(mergedReviewStats.total)} reviews` : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm">
                    {allListedReviews.map((r) => {
                      const displayNickname =
                        typeof r.nickname === 'string' && r.nickname.trim() ? r.nickname.trim() : 'Guest';
                      return (
                        <li key={r.id} className="px-4 py-4 transition-colors hover:bg-neutral-50/60 sm:px-5 sm:py-5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-neutral-900">{displayNickname}</p>
                            <time
                              className="text-[11px] text-neutral-400 tabular-nums"
                              dateTime={new Date(r.at).toISOString()}
                            >
                              {formatReviewTime(r.at)}
                            </time>
                          </div>
                          <div className="mt-1.5">
                            <ReviewStars value={r.rating} size="h-4 w-4" />
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-neutral-700">{r.text}</p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              )}

            </div>
          </section>

          <aside className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 lg:sticky lg:top-24 self-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Map location</p>
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <iframe
                  title="Map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${spot.lng - 0.02}%2C${spot.lat - 0.02}%2C${spot.lng + 0.02}%2C${spot.lat + 0.02}&layer=mapnik&marker=${spot.lat}%2C${spot.lng}`}
                  className="h-[180px] w-full border-0 lg:h-[200px]"
                />
              </div>
              <button
                type="button"
                onClick={openRoutePanel}
                className="w-full rounded-lg px-3 py-2 text-center text-xs font-semibold text-white shadow-sm transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
                style={{ backgroundColor: olive }}
              >
                Go here?
              </button>
            </div>
          </aside>
        </div>
      </main>

      {saveModalOpen && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save to list"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <h3 className="text-sm font-normal text-neutral-800">Save establishment</h3>
            <p className="mt-1 text-sm text-neutral-500">Pick a list you already created, or type a new list name.</p>
            {existingLists.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Your lists</p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50 p-2">
                  {existingLists.map((l) => (
                    <li key={l.id || l.name}>
                      <button
                        type="button"
                        onClick={() => handleSaveToExistingList(l.id)}
                        className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-neutral-800 transition hover:bg-white"
                      >
                        {l.name}
                        <span className="ml-2 text-xs font-normal text-neutral-500">
                          ({Array.isArray(l.items) ? l.items.length : 0} items)
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-neutral-400">New list name</label>
            <input
              type="text"
              value={listNameDraft}
              onChange={(e) => setListNameDraft(e.target.value)}
              placeholder="My list"
              className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveToList}
                className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: olive }}
              >
                Save to new list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
