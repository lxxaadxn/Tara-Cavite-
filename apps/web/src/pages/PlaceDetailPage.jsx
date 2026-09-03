import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  fetchAllPlacesFromSupabase,
  fetchPlaceById,
  haversineDistanceKm,
  logPlacesFetchError,
} from '../lib/placesFromSupabase';
import { AppHeader } from '../components/AppHeader';
import { PlaceImageLightbox } from '../components/PlaceImageLightbox';
import { SaveSuccessToast } from '../components/SaveSuccessToast';
import { PlaceReviewForm } from '../components/PlaceReviewForm';
import { fetchPlaceReviews } from '../lib/placeReviews';
import { hasQrPlaceVisit } from 'cavitour-shared/placeCheckin';
import { fetchSavedListsForUser, savePlaceToListIdRemote, savePlaceToListRemote } from '../lib/savedPlacesSupabase';
import { useSaveSuccessToast } from '../lib/useSaveSuccessToast';
import { formatNtdpCategoryTagLabel, getEstablishmentAboutBody } from '../lib/ntdpDisplayLabels';
import { readCachedUserLocation } from '../lib/promptLocationOnLogin';
import { googleMapsDirectionsUrl } from '../lib/osmUrls';
import { PlacesLeafletMap } from '../components/PlacesLeafletMap';
import { lookupLocalEstablishmentUrls } from '../lib/establishmentLocalImages';

const olive = '#10A37F';
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

function formatClockAnalog(raw) {
  const m = String(raw ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hour24 = Number(m[1]);
  const minutes = m[2];
  if (!Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) return null;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

/** Catalog hours are "07:00 – 17:00"; show analog 12-hour time. */
function formatHoursAnalog(hours) {
  const text = String(hours ?? '').trim();
  if (!text) return '';
  if (/\b(?:am|pm)\b/i.test(text)) return text;
  const parts = text.split(/\s*[–—-]\s*/);
  if (parts.length === 2) {
    const start = formatClockAnalog(parts[0]);
    const end = formatClockAnalog(parts[1]);
    if (start && end) return `${start} – ${end}`;
  }
  return formatClockAnalog(text) || text;
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


function formatReviewTime(ts) {
  const ms = Date.now() - Number(ts);
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function HighlightIcon({ name }) {
  const common = 'h-5 w-5 text-[#10A37F]';
  switch (name) {
    case 'type':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h7" />
        </svg>
      );
    case 'category':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 7a2 2 0 0 1 2-2h6l4 4v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" />
        </svg>
      );
    case 'hours':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="8" />
          <path strokeLinecap="round" d="M12 8v4l3 2" />
        </svg>
      );
    case 'municipality':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      );
    case 'phone':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 4.5h3l1.2 3.2-1.8 1.1a12 12 0 0 0 6.3 6.3l1.1-1.8 3.2 1.2v3A2 2 0 0 1 17.5 19 14.5 14.5 0 0 1 5 6.5a2 2 0 0 1 1.5-2Z" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="12" cy="12" r="8" />
          <path strokeLinecap="round" d="M9 12h6M12 9v6" />
        </svg>
      );
  }
}

export function PlaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placeNotFound, setPlaceNotFound] = useState(false);
  const [relatedPlacesRaw, setRelatedPlacesRaw] = useState([]);
  const [userCoords, setUserCoords] = useState(() => {
    const cached = readCachedUserLocation();
    return cached ? { lat: cached.lat, lng: cached.lng } : null;
  });
  const [saveStatus, setSaveStatus] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [canWriteReview, setCanWriteReview] = useState(false);
  const [reviewPhotoLightbox, setReviewPhotoLightbox] = useState(null);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);
  const [saveListError, setSaveListError] = useState('');
  const [publishedReviews, setPublishedReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [authUser, setAuthUser] = useState(null);
  const { showSaveSuccess, toastProps } = useSaveSuccessToast();
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const openGoogleDirections = useCallback(() => {
    if (spot?.lat == null || spot?.lng == null) {
      window.alert('This place does not have map coordinates yet.');
      return;
    }
    const url = googleMapsDirectionsUrl(spot.lat, spot.lng, 'driving', null);
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [spot?.lat, spot?.lng]);

  useEffect(() => {
    setLightboxIndex(null);
    setHeroIndex(0);
    setOverviewExpanded(false);
    setShareCopied(false);
    setReviewFormOpen(false);
    setCanWriteReview(false);
    setReviewPhotoLightbox(null);
  }, [id]);

  useEffect(() => {
    if (!reviewFormOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setReviewFormOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [reviewFormOpen]);

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
      }
    };
    window.addEventListener('cavitour:user-location', onCached);
    return () => window.removeEventListener('cavitour:user-location', onCached);
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
    if (!spot?.id || !authUser) {
      setCanWriteReview(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const visited = await hasQrPlaceVisit(supabase, spot.id);
      if (!cancelled) setCanWriteReview(visited);
    })();
    return () => {
      cancelled = true;
    };
  }, [spot?.id, authUser]);

  useEffect(() => {
    if (!spot?.id) {
      setPublishedReviews([]);
      setReviewsError('');
      return;
    }
    let cancelled = false;
    setReviewsLoading(true);
    setReviewsError('');
    (async () => {
      try {
        const rows = await fetchPlaceReviews(supabase, spot.id);
        if (!cancelled) setPublishedReviews(rows);
      } catch (err) {
        if (!cancelled) {
          setPublishedReviews([]);
          setReviewsError(err?.message || 'Could not load reviews.');
        }
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

  const galleryImages = useMemo(() => {
    const urls = [];
    const push = (u) => {
      const v = String(u ?? '').trim();
      if (!v || v === PLACEHOLDER_IMG) return;
      if (!urls.includes(v)) urls.push(v);
    };
    if (spot) {
      push(spot.image);
      for (const u of spot.galleryUrls ?? []) push(u);
      const hasDbImage = Boolean(spot.image?.trim() && spot.image !== PLACEHOLDER_IMG);
      const hasDbGallery = Boolean((spot.galleryUrls ?? []).some((u) => String(u ?? '').trim()));
      if (!hasDbImage && !hasDbGallery) {
        for (const u of lookupLocalEstablishmentUrls(spot.name) ?? []) push(u);
      }
    }
    return urls.length ? urls : [PLACEHOLDER_IMG];
  }, [spot]);

  const heroImage = galleryImages[Math.min(heroIndex, galleryImages.length - 1)] || PLACEHOLDER_IMG;

  const galleryThumbs = useMemo(() => {
    if (!galleryImages.length) return [];
    const restIdx = galleryImages.map((_, i) => i).filter((i) => i !== heroIndex);
    const poolIdx = restIdx.length ? restIdx : galleryImages.map((_, i) => i);
    return Array.from({ length: 3 }, (_, i) => {
      const index = poolIdx[i % poolIdx.length];
      return { url: galleryImages[index], index };
    });
  }, [galleryImages, heroIndex]);

  const extraPhotoCount = Math.max(0, galleryImages.length - 4);

  const visitorReviews = useMemo(
    () => [...publishedReviews].sort((a, b) => b.at - a.at),
    [publishedReviews]
  );

  const reviewStatsRatings = useMemo(
    () => visitorReviews.map((r) => r.rating),
    [visitorReviews]
  );

  const mergedReviewStats = useMemo(() => buildReviewStatsFromRatings(reviewStatsRatings), [reviewStatsRatings]);

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

  const handleReviewSubmitted = useCallback(async () => {
    setReviewFormOpen(false);
    if (!spot?.id) return;
    try {
      const rows = await fetchPlaceReviews(supabase, spot.id);
      setPublishedReviews(rows);
      setReviewsError('');
    } catch (err) {
      setReviewsError(err?.message || 'Could not load reviews.');
    }
  }, [spot?.id]);

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

  const highlightCards = useMemo(() => {
    if (!spot) return [];
    const typeValue = String(spot.ta_category || spot.type_code || '').trim();
    const categoryValue = touristSpotCategory !== '—' ? touristSpotCategory : '';
    const municipalityValue = String(spot.city_mun || '').trim();
    return [
      { key: 'type', label: 'Type', value: typeValue || '—' },
      { key: 'category', label: 'Category', value: categoryValue || '—' },
      { key: 'municipality', label: 'Municipality', value: municipalityValue || '—' },
    ];
  }, [spot, touristSpotCategory]);

  const hasContact = Boolean(
    String(spot?.hours || '').trim() ||
      spot?.phone ||
      spot?.email ||
      spot?.website ||
      spot?.social_facebook ||
      spot?.social_instagram ||
      spot?.social_twitter
  );

  const overviewNeedsToggle = touristSpotOverview.length > 220;
  const overviewText =
    overviewNeedsToggle && !overviewExpanded
      ? `${touristSpotOverview.slice(0, 220).trim()}…`
      : touristSpotOverview;

  const cycleHero = useCallback(
    (delta) => {
      setHeroIndex((prev) => {
        const len = galleryImages.length || 1;
        return (prev + delta + len) % len;
      });
    },
    [galleryImages.length]
  );

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = spot?.name || 'Tara, Cavite!';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title, url, text: title });
        return;
      }
    } catch {
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 2000);
    } catch {
    }
  }, [spot?.name]);

  if (loading || !spot) {
    return (
      <div className="min-h-screen flex flex-col bg-white font-['Poppins',sans-serif]">
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
              <Link to="/search" className="text-sm font-semibold text-[#10A37F] hover:underline">
                Back to search
              </Link>
            </>
          )}
        </main>
      </div>
    );
  }

  const handleSaveToList = async () => {
    if (!authUser) {
      const next = encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/search');
      navigate(`/login?next=${next}`);
      return;
    }
    const suggestedName = spot?.ntdp_category ? formatNtdpCategoryTagLabel(spot.ntdp_category) : 'My list';
    setListNameDraft(suggestedName);
    setExistingLists([]);
    setSaveListError('');
    setSaveModalOpen(true);
    try {
      const lists = await fetchSavedListsForUser(authUser.id);
      setExistingLists(lists);
    } catch {
      setExistingLists([]);
    }
  };

  const placePayload = {
    id: spot.id,
    name: spot.name,
    image: spot.image,
    subtitle: cleanPlaceAddress(spot.name, spot.address),
    establishmentTag: spot.ntdp_category
      ? formatNtdpCategoryTagLabel(spot.ntdp_category)
      : spot.tags?.[0] ?? '',
  };

  const saveFailureMessage = (reason) => {
    if (reason === 'place_not_in_catalog') {
      return 'This establishment could not be saved. Try again or pick another list.';
    }
    if (reason === 'list_not_found') return 'That list is no longer available.';
    if (reason === 'invalid_input') return 'Enter a list name to save this establishment.';
    return 'Could not save this establishment. Try again.';
  };

  const saveExceptionMessage = (err) => {
    const msg = String(err?.message ?? '').trim();
    return msg || saveFailureMessage();
  };

  const handleConfirmSaveToList = async () => {
    const trimmed = String(listNameDraft ?? '').trim();
    if (!trimmed) {
      setSaveListError(saveFailureMessage('invalid_input'));
      return;
    }
    if (!authUser) {
      const next = encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/search');
      navigate(`/login?next=${next}`);
      return;
    }
    setSaveListError('');
    try {
      const result = await savePlaceToListRemote(authUser.id, trimmed, placePayload);
      if (result.ok) {
        showSaveSuccess(trimmed);
        setSaveModalOpen(false);
        return;
      }
      setSaveListError(saveFailureMessage(result.reason));
    } catch (err) {
      setSaveListError(saveExceptionMessage(err));
    }
  };

  const handleSaveToExistingList = async (listId) => {
    if (!authUser) {
      const next = encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/search');
      navigate(`/login?next=${next}`);
      return;
    }
    setSaveListError('');
    try {
      const result = await savePlaceToListIdRemote(authUser.id, listId, placePayload);
      if (result.ok) {
        const label = result.listName || 'list';
        showSaveSuccess(label);
        setSaveModalOpen(false);
        return;
      }
      setSaveListError(saveFailureMessage(result.reason));
    } catch (err) {
      setSaveListError(saveExceptionMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Poppins',sans-serif]">
      <AppHeader />

      <main className="flex w-full min-w-0 flex-1 flex-col px-4 py-4 sm:px-6 lg:px-10 xl:px-12">
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-900"
        >
          <span aria-hidden className="text-lg leading-none">
            ‹
          </span>
          Back to search
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-['Poppins',sans-serif] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
                {spot.name}
              </h1>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-neutral-500">
              <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.2" />
              </svg>
              <span>{spot.address?.trim() || touristSpotMunicipalityProvince || 'Cavite, Philippines'}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {shareCopied ? <span className="text-xs font-medium text-emerald-700">Link copied</span> : null}
            {saveStatus ? <span className="text-xs font-medium text-emerald-700">{saveStatus}</span> : null}
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" />
              </svg>
              Share
            </button>
            <button
              type="button"
              onClick={() => void handleSaveToList()}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Save
            </button>
          </div>
        </div>

        <div className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,28vw)] lg:gap-8">
          <section className="min-w-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.15fr)_minmax(150px,0.55fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(170px,0.5fr)] lg:gap-3">
              <div className="relative h-[320px] overflow-hidden rounded-2xl bg-neutral-100 sm:h-[420px] lg:h-[min(64vh,680px)]">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(heroIndex)}
                  className="block h-full w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10A37F] focus-visible:ring-offset-2"
                  aria-label={`View photo of ${spot.name}`}
                >
                  <img
                    src={heroImage}
                    alt={spot.name}
                    className="h-full w-full object-cover"
                  />
                </button>
                {galleryImages.length > 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => cycleHero(-1)}
                      className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-sm"
                      aria-label="Previous photo"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => cycleHero(1)}
                      className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-neutral-800 shadow-sm"
                      aria-label="Next photo"
                    >
                      ›
                    </button>
                  </>
                ) : null}
              </div>
              <div className="grid h-[220px] grid-cols-3 gap-2 sm:h-[420px] sm:grid-cols-1 sm:grid-rows-3 lg:h-[min(64vh,680px)]">
                {galleryThumbs.map((thumb, i) => {
                  const isLast = i === galleryThumbs.length - 1 && extraPhotoCount > 0;
                  return (
                    <button
                      key={`${thumb.url}-${thumb.index}-${i}`}
                      type="button"
                      onClick={() => setLightboxIndex(thumb.index)}
                      className="relative min-h-0 overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[#10A37F] focus-visible:ring-offset-2"
                      aria-label={isLast ? `View ${extraPhotoCount} more photos` : `View photo ${i + 2}`}
                    >
                      <img src={thumb.url} alt="" className="h-full w-full object-cover" />
                      {isLast ? (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-semibold text-white">
                          +{extraPhotoCount}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
            {formatProximityKm(distanceToPlaceKm) ? (
              <div className="mt-8 flex flex-wrap items-end gap-x-8 gap-y-3 border-b border-neutral-100 pb-5">
                <div>
                  <p className="text-xs font-medium text-neutral-400">Distance</p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">{formatProximityKm(distanceToPlaceKm)}</p>
                </div>
              </div>
            ) : null}

            <div className="mt-8">
              <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Overview</h2>
              <p className="mt-3 text-sm leading-relaxed text-neutral-600 whitespace-pre-line">{overviewText}</p>
              {overviewNeedsToggle ? (
                <button
                  type="button"
                  onClick={() => setOverviewExpanded((open) => !open)}
                  className="mt-2 text-sm font-semibold text-[#10A37F] hover:underline"
                >
                  {overviewExpanded ? 'Read less' : 'Read more'}
                </button>
              ) : null}
            </div>

            {highlightCards.length > 0 ? (
              <div className="mt-8">
                <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Highlights</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {highlightCards.map((item) => (
                    <div key={item.key} className="rounded-xl border border-neutral-200 bg-white p-4">
                      <HighlightIcon name={item.key} />
                      <p className="mt-3 text-xs font-medium text-neutral-400">{item.label}</p>
                      <p className="mt-1 break-all text-sm font-semibold text-neutral-900">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {spot.lat != null && spot.lng != null ? (
              <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Location</h2>
                  <button
                    type="button"
                    onClick={openGoogleDirections}
                    className="rounded-full bg-[#10A37F] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Directions
                  </button>
                </div>
                <div className="relative mt-4 h-[360px] overflow-hidden rounded-2xl border border-neutral-200">
                  <PlacesLeafletMap
                    places={[
                      {
                        id: spot.id,
                        name: spot.name,
                        lat: spot.lat,
                        lng: spot.lng,
                        ntdp_category: spot.ntdp_category,
                      },
                    ]}
                  />
                </div>
              </div>
            ) : null}

            {suggestedPlaces.length > 0 ? (
              <div className="mt-8">
                <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Nearby</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {suggestedPlaces.slice(0, 4).map((p) => {
                    const distLabel = formatProximityKm(p.distanceKm);
                    return (
                      <Link
                        key={p.id}
                        to={`/place/${p.id}`}
                        className="overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-sm"
                      >
                        <img src={p.image} alt="" className="h-28 w-full object-cover" />
                        <div className="p-2.5">
                          <p className="truncate text-sm font-semibold text-neutral-900">{p.name}</p>
                          <p className="mt-0.5 truncate text-xs text-neutral-500">{distLabel ? `${distLabel} away` : p.location}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>

          <aside className="self-start space-y-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Contact</h2>
              {hasContact ? (
                <div className="mt-4 grid grid-cols-2 gap-4 items-start text-sm text-neutral-700">
                  <ul className="space-y-2.5">
                    {String(spot.hours || '').trim() ? (
                      <li>
                        <span className="text-xs font-medium text-neutral-400">Hours</span>
                        <p className="mt-0.5 font-medium text-neutral-900">{formatHoursAnalog(spot.hours)}</p>
                      </li>
                    ) : null}
                    {spot.phone ? (
                      <li>
                        <span className="text-xs font-medium text-neutral-400">Phone</span>
                        <p className="mt-0.5 font-medium text-neutral-900">{spot.phone}</p>
                      </li>
                    ) : null}
                    {spot.email ? (
                      <li>
                        <span className="text-xs font-medium text-neutral-400">Email</span>
                        <p className="mt-0.5 font-medium text-neutral-900">{spot.email}</p>
                      </li>
                    ) : null}
                  </ul>
                  {spot.website || spot.social_facebook || spot.social_instagram || spot.social_twitter ? (
                    <div className="space-y-2.5">
                      <div>
                        <span className="block text-xs font-medium text-neutral-400">Social Media</span>
                        {spot.website ? (
                          <a
                            href={spot.website}
                            className="mt-1.5 flex h-7 w-7 overflow-hidden rounded-md bg-[#1877F2] text-white shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1877F2]"
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Open Facebook page"
                          >
                            <svg className="h-full w-full" viewBox="0 0 40 40" aria-hidden>
                              <path
                                fill="currentColor"
                                d="M22.25 40V24.6h5.15l.77-6H22.25v-3.86c0-1.74.48-2.93 2.98-2.93h3.17V6.34c-.55-.08-2.43-.24-4.62-.24-4.57 0-7.7 2.79-7.7 7.91V18.6H13v6h3.08V40h6.17Z"
                              />
                            </svg>
                          </a>
                        ) : null}
                      </div>
                      {spot.social_facebook ? (
                        <div>
                          <span className="text-xs font-medium text-neutral-400">Facebook</span>
                          <a href={spot.social_facebook} className="mt-0.5 block break-all font-medium text-[#10A37F] underline" target="_blank" rel="noreferrer">
                            {spot.social_facebook}
                          </a>
                        </div>
                      ) : null}
                      {spot.social_instagram ? (
                        <div>
                          <span className="text-xs font-medium text-neutral-400">Instagram</span>
                          <a href={spot.social_instagram} className="mt-0.5 block break-all font-medium text-[#10A37F] underline" target="_blank" rel="noreferrer">
                            {spot.social_instagram}
                          </a>
                        </div>
                      ) : null}
                      {spot.social_twitter ? (
                        <div>
                          <span className="text-xs font-medium text-neutral-400">X</span>
                          <a href={spot.social_twitter} className="mt-0.5 block break-all font-medium text-[#10A37F] underline" target="_blank" rel="noreferrer">
                            {spot.social_twitter}
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">No contact details listed yet.</p>
              )}
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
              <h2 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Reviews</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-600">
                Reviews from visitors who posted about this establishment.
              </p>
              <div className="mt-4 space-y-4">
                <div className="overflow-hidden rounded-xl border border-neutral-100 bg-neutral-50/40">
                  <div className="flex flex-col gap-4 p-4">
                    <div className="text-center">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
                        Overall
                      </p>
                      <p className="mt-1 text-3xl font-bold tabular-nums leading-none" style={{ color: olive }}>
                        {mergedReviewStats.total > 0 ? mergedReviewStats.avgRating.toFixed(1) : '—'}
                      </p>
                      <div className="mt-2 flex justify-center">
                        {mergedReviewStats.total > 0 ? (
                          <ReviewStars value={mergedReviewStats.displayStarCount} size="h-4 w-4" />
                        ) : (
                          <ReviewStars value={0} size="h-4 w-4" dimmed />
                        )}
                      </div>
                      <p className="mt-1 text-xs font-medium text-neutral-700">
                        {mergedReviewStats.total > 0 ? `${formatReviewCount(mergedReviewStats.total)} reviews` : 'No reviews yet'}
                      </p>
                    </div>
                    {mergedReviewStats.total > 0 ? (
                      <div className="space-y-2">
                        {mergedReviewStats.breakdown.map((row) => (
                          <div key={row.label} className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                              {row.label}
                            </p>
                            <div className="h-1.5 min-w-0 rounded-full bg-neutral-100">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${row.pct}%`, backgroundColor: olive }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {reviewsError ? (
                  <p className="text-sm text-red-600">{reviewsError}</p>
                ) : null}
                {reviewsLoading ? (
                  <p className="text-sm text-neutral-500">Loading reviews…</p>
                ) : visitorReviews.length > 0 ? (
                  <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white">
                    {visitorReviews.map((r) => {
                      const displayNickname =
                        typeof r.nickname === 'string' && r.nickname.trim() ? r.nickname.trim() : 'Traveler';
                      return (
                        <li key={r.id} className="px-3 py-3">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-neutral-900">{displayNickname}</p>
                            <time
                              className="text-[11px] text-neutral-400 tabular-nums"
                              dateTime={new Date(r.at).toISOString()}
                            >
                              {formatReviewTime(r.at)}
                            </time>
                          </div>
                          <div className="mt-1">
                            <ReviewStars value={r.rating} size="h-3.5 w-3.5" />
                          </div>
                          <p className="mt-1.5 text-sm leading-relaxed text-neutral-700">{r.text}</p>
                          {Array.isArray(r.photoUrls) && r.photoUrls.length > 0 ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {r.photoUrls.map((url, photoIndex) => (
                                <button
                                  key={`${r.id}-${url}`}
                                  type="button"
                                  onClick={() => setReviewPhotoLightbox({ images: r.photoUrls, index: photoIndex })}
                                  className="h-14 w-14 overflow-hidden rounded-lg border border-neutral-200"
                                  aria-label="Open review photo"
                                >
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : !reviewsError ? (
                  <p className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
                    No reviews yet. Be the first to share your visit.
                  </p>
                ) : null}

                {canWriteReview ? (
                  <button
                    type="button"
                    onClick={() => setReviewFormOpen(true)}
                    className="inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
                    style={{ backgroundColor: olive }}
                  >
                    Write a review
                  </button>
                ) : (
                  <p className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
                    <span className="font-semibold text-neutral-800">Visit to leave a review.</span>{' '}
                    Scan the establishment QR code in the Tara, Cavite! app to unlock reviews.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {reviewFormOpen && canWriteReview ? (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Write a review"
          onClick={() => setReviewFormOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Write a review</h3>
              <button
                type="button"
                onClick={() => setReviewFormOpen(false)}
                className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Close review form"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <PlaceReviewForm
              plain
              placeId={spot.id}
              placeName={spot.name}
              signedIn={Boolean(authUser)}
              defaultNickname={reviewAuthorNickname}
              onSubmitted={handleReviewSubmitted}
            />
          </div>
        </div>
      ) : null}

      {reviewPhotoLightbox?.images?.length ? (
        <PlaceImageLightbox
          images={reviewPhotoLightbox.images}
          initialIndex={reviewPhotoLightbox.index || 0}
          alt="Review photo"
          onClose={() => setReviewPhotoLightbox(null)}
        />
      ) : null}

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
                        onClick={() => void handleSaveToExistingList(l.id)}
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
              onChange={(e) => {
                setListNameDraft(e.target.value);
                if (saveListError) setSaveListError('');
              }}
              placeholder="My list"
              className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(16, 163, 127,0.22)]"
            />
            {saveListError ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {saveListError}
              </p>
            ) : null}
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
                onClick={() => void handleConfirmSaveToList()}
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
