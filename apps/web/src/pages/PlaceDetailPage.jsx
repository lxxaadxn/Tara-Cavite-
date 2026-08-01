import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  fetchAllPlacesFromSupabase,
  fetchPlaceById,
  haversineDistanceKm,
  logPlacesFetchError,
} from '../lib/placesFromSupabase';
import { AppHeader } from '../components/AppHeader';
import { PlaceImageLightbox } from '../components/PlaceImageLightbox';
import { DirectionsPanel } from '../components/DirectionsPanel';
import { SaveSuccessToast } from '../components/SaveSuccessToast';
import { PlaceReviewForm } from '../components/PlaceReviewForm';
import { fetchPlaceReviews } from '../lib/placeReviews';
import { readSavedLists, savePlaceToList, savePlaceToListId } from '../lib/savedPlaces';
import { useSaveSuccessToast } from '../lib/useSaveSuccessToast';
import { formatNtdpCategoryTagLabel, getEstablishmentAboutBody } from '../lib/ntdpDisplayLabels';
import { readCachedUserLocation } from '../lib/promptLocationOnLogin';

const olive = '#7ea00e';
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';
function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function formatProximityKm(km) {
  if (!Number.isFinite(km) || km < 0) return null;
  if (km < 1) {
    const m = Math.max(50, Math.round((km * 1000) / 50) * 50);
    return `${m} m`;
  }
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
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

function estimatePrice(placeId) {
  const tiers = ['PHP 500', 'PHP 800', 'PHP 1,200', 'PHP 1,499', 'PHP 1,650'];
  return tiers[numericSeed(placeId, 3) % tiers.length];
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

function saveSessionReviews(placeId, reviews) {
  if (typeof window === 'undefined' || !placeId) return;
  try {
    window.sessionStorage.setItem(storageKeyForPlaceReviews(placeId), JSON.stringify(reviews));
  } catch {
    /* ignore */
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
  const [placeNotFound, setPlaceNotFound] = useState(false);
  const [relatedPlacesRaw, setRelatedPlacesRaw] = useState([]);
  const [userCoords, setUserCoords] = useState(() => {
    const cached = readCachedUserLocation();
    return cached ? { lat: cached.lat, lng: cached.lng } : null;
  });
  const [locationStatus, setLocationStatus] = useState(() =>
    readCachedUserLocation() ? 'ready' : 'idle'
  );
  const [saveStatus, setSaveStatus] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);
  const [sessionReviews, setSessionReviews] = useState([]);
  const [publishedReviews, setPublishedReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const { showSaveSuccess, toastProps } = useSaveSuccessToast();
  const [lightboxIndex, setLightboxIndex] = useState(null);

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
    setLightboxIndex(null);
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
    const onCached = (ev) => {
      const d = ev?.detail;
      if (d && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
        setUserCoords({ lat: d.lat, lng: d.lng });
        setLocationStatus('ready');
      }
    };
    window.addEventListener('cavitour:user-location', onCached);
    return () => window.removeEventListener('cavitour:user-location', onCached);
  }, []);

  const requestUserLocation = useCallback(() => {
    if (typeof window === 'undefined' || !window.navigator?.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    setLocationStatus('locating');
    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('ready');
      },
      (err) => {
        setLocationStatus(err?.code === 1 ? 'denied' : 'unavailable');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60_000,
      }
    );
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.navigator?.geolocation) {
      setLocationStatus('unavailable');
      return;
    }
    let cancelled = false;
    setLocationStatus('locating');
    const watchId = window.navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return;
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus('ready');
      },
      (err) => {
        if (cancelled) return;
        setLocationStatus(err?.code === 1 ? 'denied' : 'unavailable');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60_000,
      }
    );
    return () => {
      cancelled = true;
      window.navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPlaceNotFound(false);
      try {
        if (!id || !isUuid(id)) {
          if (!cancelled) {
            setPlaceNotFound(true);
            setSpot(null);
          }
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
            phone: p.phone ?? null,
            email: p.email ?? null,
            website: p.website ?? null,
            social_facebook: p.social_facebook ?? null,
            social_instagram: p.social_instagram ?? null,
            social_twitter: p.social_twitter ?? null,
          });
          setPlaceNotFound(false);
        } else {
          setSpot(null);
          setPlaceNotFound(true);
        }
      } catch (err) {
        logPlacesFetchError('fetchPlaceById', err);
        if (!cancelled) {
          setSpot(null);
          setPlaceNotFound(true);
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
    if (!spot?.id) {
      setPublishedReviews([]);
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    (async () => {
      try {
        const rows = await fetchPlaceReviews(supabase, spot.id);
        if (!cancelled) setPublishedReviews(rows);
      } catch {
        if (!cancelled) setPublishedReviews([]);
      } finally {
        if (!cancelled) setReviewsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

  const visitorReviews = useMemo(() => {
    const publishedIds = new Set(publishedReviews.map((r) => r.id));
    const sessionOnly = sessionReviews.filter((r) => !publishedIds.has(r.id));
    return [...publishedReviews, ...sessionOnly].sort((a, b) => b.at - a.at);
  }, [publishedReviews, sessionReviews]);

  const reviewStatsRatings = useMemo(() => {
    if (visitorReviews.length > 0) {
      return visitorReviews.map((r) => r.rating);
    }
    return dummyReviews.map((d) => d.rating);
  }, [visitorReviews, dummyReviews]);

  const mergedReviewStats = useMemo(() => buildReviewStatsFromRatings(reviewStatsRatings), [reviewStatsRatings]);

  const allListedReviews = useMemo(() => {
    if (visitorReviews.length > 0) return visitorReviews;
    return [...dummyReviews].sort((a, b) => b.at - a.at);
  }, [visitorReviews, dummyReviews]);

  const reviewAuthorNickname = useMemo(() => {
    const meta = authUser?.user_metadata ?? {};
    const fromMeta =
      (typeof meta.username === 'string' && meta.username.trim()) ||
      (typeof meta.nickname === 'string' && meta.nickname.trim()) ||
      '';
    if (fromMeta) return fromMeta;
    const email = authUser?.email?.split('@')[0]?.trim();
    return email || '';
  }, [authUser]);

  const handleReviewSubmitted = useCallback(
    (review) => {
      if (authUser) {
        setPublishedReviews((prev) => {
          const without = prev.filter((r) => r.userId !== review.userId);
          return [review, ...without];
        });
        setSessionReviews((prev) => prev.filter((r) => r.userId !== review.userId));
      } else if (spot?.id) {
        setSessionReviews((prev) => {
          const next = [review, ...prev.filter((r) => r.id !== review.id)];
          saveSessionReviews(spot.id, next);
          return next;
        });
      }
    },
    [authUser, spot?.id]
  );

  const detailThumbs = useMemo(() => {
    if (!spot) return [extras[0], extras[1], PLACEHOLDER_IMG];
    if (spot.galleryUrls?.length > 1) {
      const t = spot.galleryUrls.slice(1, 4);
      return [0, 1, 2].map((i) => t[i] ?? spot.image);
    }
    return [extras[0], extras[1], spot.image];
  }, [spot]);

  const galleryImages = useMemo(() => {
    if (!spot?.image) return detailThumbs.filter(Boolean);
    const merged = [spot.image, ...detailThumbs];
    return merged.filter((url, i) => url && merged.indexOf(url) === i);
  }, [spot?.image, detailThumbs]);

  const suggestedPlaces = useMemo(() => {
    if (!spot?.lat || !spot?.lng) return [];
    return relatedPlacesRaw
      .filter((s) => s.id !== spot.id && s.lat != null && s.lng != null)
      .map((s) => ({
        id: s.id,
        name: s.name,
        location: s.city_mun ?? cleanPlaceAddress(s.name, s.address),
        image: s.imageUrl || PLACEHOLDER_IMG,
        distanceKm: haversineDistanceKm(spot.lat, spot.lng, s.lat, s.lng),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 6);
  }, [relatedPlacesRaw, spot]);

  const distanceToPlaceKm = useMemo(() => {
    if (!spot?.lat || !spot?.lng || !userCoords) return null;
    return haversineDistanceKm(userCoords.lat, userCoords.lng, spot.lat, spot.lng);
  }, [spot?.lat, spot?.lng, userCoords]);

  const touristSpotOverview = useMemo(() => {
    if (!spot) return '';
    return getEstablishmentAboutBody(spot);
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
        <main className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center text-neutral-600">
          {loading ? (
            <p>Loading place…</p>
          ) : (
            <>
              <p className="text-lg font-semibold text-neutral-800">Establishment not found</p>
              <p className="max-w-md text-sm text-neutral-500">
                {placeNotFound && id
                  ? 'This listing is not in public.places yet. Run sync_places_with_images.sql in Supabase SQL Editor.'
                  : 'Invalid place link.'}
              </p>
              <Link to="/search" className="text-sm font-semibold text-[#7ea00e] hover:underline">
                Back to search
              </Link>
            </>
          )}
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
      showSaveSuccess(trimmed);
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
      showSaveSuccess(label);
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
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="group relative block w-full overflow-hidden rounded-2xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
                aria-label={`View photo of ${spot.name}`}
              >
                <img
                  src={spot.image}
                  alt={spot.name}
                  className="h-[250px] w-full object-cover transition duration-200 group-hover:scale-[1.02] sm:h-[360px]"
                />
                <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:opacity-100">
                  View
                </span>
              </button>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                {detailThumbs.map((img, i) => {
                  const galleryIdx = galleryImages.indexOf(img);
                  const openIdx = galleryIdx >= 0 ? galleryIdx : i + 1;
                  return (
                    <button
                      key={`${img}-${i}`}
                      type="button"
                      onClick={() => setLightboxIndex(openIdx)}
                      className="group relative overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
                      aria-label={`View photo ${i + 1}`}
                    >
                      <img
                        src={img}
                        alt=""
                        className="h-24 w-full object-cover transition duration-200 group-hover:scale-105 sm:h-[114px]"
                      />
                      <span className="pointer-events-none absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                    </button>
                  );
                })}
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
                  {spot.hours?.trim() ? (
                    <p className="mt-4 text-sm text-neutral-700">
                      <span className="font-semibold text-neutral-900">Hours: </span>
                      {spot.hours.trim()}
                    </p>
                  ) : null}
                  {spot.phone || spot.email || spot.website || spot.social_facebook || spot.social_instagram || spot.social_twitter ? (
                    <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-700">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Contact</p>
                      <ul className="mt-2 space-y-1.5">
                        {spot.phone ? (
                          <li>
                            <span className="font-medium text-neutral-900">Phone: </span>
                            {spot.phone}
                          </li>
                        ) : null}
                        {spot.email ? (
                          <li>
                            <span className="font-medium text-neutral-900">Email: </span>
                            {spot.email}
                          </li>
                        ) : null}
                        {spot.website ? (
                          <li>
                            <span className="font-medium text-neutral-900">Website: </span>
                            <a href={spot.website} className="text-[#6B8E23] underline break-all" target="_blank" rel="noreferrer">
                              {spot.website}
                            </a>
                          </li>
                        ) : null}
                        {spot.social_facebook ? (
                          <li>
                            <span className="font-medium text-neutral-900">Facebook: </span>
                            <a href={spot.social_facebook} className="text-[#6B8E23] underline break-all" target="_blank" rel="noreferrer">
                              {spot.social_facebook}
                            </a>
                          </li>
                        ) : null}
                        {spot.social_instagram ? (
                          <li>
                            <span className="font-medium text-neutral-900">Instagram: </span>
                            <a href={spot.social_instagram} className="text-[#6B8E23] underline break-all" target="_blank" rel="noreferrer">
                              {spot.social_instagram}
                            </a>
                          </li>
                        ) : null}
                        {spot.social_twitter ? (
                          <li>
                            <span className="font-medium text-neutral-900">X: </span>
                            <a href={spot.social_twitter} className="text-[#6B8E23] underline break-all" target="_blank" rel="noreferrer">
                              {spot.social_twitter}
                            </a>
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              {routePanelOpen && (
                <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-5 sm:px-6 sm:py-6">
                  <DirectionsPanel
                    onClose={closeRoutePanel}
                    destinationName={spot.name}
                    destinationAddress={cleanPlaceAddress(spot.name, spot.address)}
                    destinationLat={spot.lat}
                    destinationLng={spot.lng}
                    destMunicipality={spot.city_mun}
                    userCoords={userCoords}
                    onRequestLocation={requestUserLocation}
                    locationStatus={locationStatus}
                    fallbackDistanceKm={distanceToPlaceKm ?? undefined}
                    seedId={spot.id}
                  />
                </div>
              )}

              {!routePanelOpen && (
              <div className="bg-white">
                <div className="border-b border-neutral-100 bg-gradient-to-br from-[rgba(126,160,14,0.08)] via-white to-white px-5 py-5 sm:px-7 sm:py-6">
                  <h2 className="font-['Poppins',sans-serif] text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
                    Reviews
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-600">
                    Read what visitors shared below — or add your own. Sample reviews show when no one has posted yet.
                  </p>
                </div>

                <div className="space-y-5 p-5 sm:p-7 sm:pt-6">
                  <PlaceReviewForm
                    placeId={spot.id}
                    placeName={spot.name}
                    signedIn={Boolean(authUser)}
                    defaultNickname={reviewAuthorNickname}
                    onSubmitted={handleReviewSubmitted}
                  />

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

          <aside className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto self-start">
            <div className="space-y-5">
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

              {suggestedPlaces.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Suggested establishments</p>
                  <ul className="mt-2 space-y-2">
                    {suggestedPlaces.map((p) => {
                      const distLabel = formatProximityKm(p.distanceKm);
                      return (
                        <li key={p.id}>
                          <Link
                            to={`/places/${p.id}`}
                            className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-2 transition hover:border-neutral-300 hover:shadow-sm"
                          >
                            <img src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                            <div className="min-w-0 flex-1 py-0.5">
                              <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                              <p className="mt-0.5 truncate text-xs text-neutral-500">{p.location}</p>
                              {distLabel ? (
                                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[#7ea00e]">{distLabel} away</p>
                              ) : null}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </main>

      {lightboxIndex !== null && galleryImages.length > 0 ? (
        <PlaceImageLightbox
          images={galleryImages}
          initialIndex={lightboxIndex}
          alt={spot.name}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}

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
      <SaveSuccessToast {...toastProps} />
    </div>
  );
}
