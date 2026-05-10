import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase, fetchPlaceById } from '../lib/placesFromSupabase';
import { AppHeader } from '../components/AppHeader';
import { RouteLeafletMap } from '../components/RouteLeafletMap';
import { readSavedLists, savePlaceToList, savePlaceToListId } from '../lib/savedPlaces';
import { planNearestTerminalsForPlaceCommute } from '../lib/terminalTransitPlanner';
import { recordDestinationReached } from '../lib/destinationReachedActivity';
import {
  formatNtdpCategoryTagLabel,
  getEstablishmentAboutBody,
  getPreviewReviewEntries,
} from '../lib/ntdpDisplayLabels';
import {
  fetchDrivingRoute,
  fetchFootRoute,
  formatDistanceM,
  formatDurationS,
} from '../lib/fetchOsrmRoute';
import {
  buildCommuterNarrativeFromOsrmSteps,
  commuterDirectStepInstruction,
  commuterStepHint,
} from '../lib/commuterRouteNarration';

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
};

function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

function estimatePrice(placeId) {
  const numeric = Number(String(placeId).replace(/\D/g, '').slice(-3));
  const seed = Number.isFinite(numeric) && numeric > 0 ? numeric : 42;
  return 20 + (seed % 70);
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
  };
}

function formatDuration(totalMinutes) {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours} hr ${minutes ? `${minutes} min` : ''}`.trim();
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

export function PlaceDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const initialTab = (() => {
    const q = searchParams.get('tab');
    return ['description', 'reviews', 'route'].includes(q) ? q : 'description';
  })();
  const [tab, setTab] = useState(initialTab);
  const [relatedPlacesRaw, setRelatedPlacesRaw] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);
  const [terminalTransitPlan, setTerminalTransitPlan] = useState(null);
  const [terminalTransitLoading, setTerminalTransitLoading] = useState(false);
  const [destinationReachedBusy, setDestinationReachedBusy] = useState(false);
  const [routeSubTab, setRouteSubTab] = useState('routeSteps');
  const [osrmDriving, setOsrmDriving] = useState(null);
  const [osrmFoot, setOsrmFoot] = useState(null);
  const [osrmLoading, setOsrmLoading] = useState(false);
  const [osrmError, setOsrmError] = useState(null);
  const [fullMapOpen, setFullMapOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get('tab');
    const next = ['description', 'reviews', 'route'].includes(q) ? q : 'description';
    if (next !== tab) setTab(next);
  }, [searchParams, tab]);

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
    if (!userCoords || spot?.lat == null || spot?.lng == null) {
      setTerminalTransitPlan(null);
      setTerminalTransitLoading(false);
      return;
    }
    let cancelled = false;
    setTerminalTransitLoading(true);
    (async () => {
      try {
        const plan = await planNearestTerminalsForPlaceCommute(supabase, userCoords, {
          lat: spot.lat,
          lng: spot.lng,
        });
        if (!cancelled) setTerminalTransitPlan(plan);
      } catch {
        if (!cancelled) setTerminalTransitPlan(null);
      } finally {
        if (!cancelled) setTerminalTransitLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userCoords, spot?.lat, spot?.lng]);

  useEffect(() => {
    if (tab !== 'route') {
      setRouteSubTab('routeSteps');
    }
  }, [tab]);

  useEffect(() => {
    if (tab !== 'route' || spot?.lat == null || spot?.lng == null || !userCoords) {
      return;
    }
    let cancelled = false;
    setOsrmLoading(true);
    setOsrmError(null);
    (async () => {
      try {
        const from = { lat: userCoords.lat, lng: userCoords.lng };
        const to = { lat: spot.lat, lng: spot.lng };
        const [d, f] = await Promise.all([fetchDrivingRoute(from, to), fetchFootRoute(from, to)]);
        if (!cancelled) {
          setOsrmDriving(d);
          setOsrmFoot(f);
        }
      } catch {
        if (!cancelled) {
          setOsrmError('Could not load road route.');
          setOsrmDriving(null);
          setOsrmFoot(null);
        }
      } finally {
        if (!cancelled) setOsrmLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, spot?.lat, spot?.lng, userCoords?.lat, userCoords?.lng]);

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
            tags: [p.ntdp_category].filter(Boolean).slice(0, 6),
            description: p.description || `${p.name} — ${p.address}.`,
            subtitle: p.ntdp_category
              ? `${p.type ?? 'Place'} · ${formatNtdpCategoryTagLabel(p.ntdp_category)}`
              : p.type,
            hours: p.hours,
            fromSupabase: true,
            ntdp_category: p.ntdp_category ?? null,
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

  const reviewBreakdown = [
    { label: 'Five', pct: 72, count: '989' },
    { label: 'Four', pct: 52, count: '4.5K' },
    { label: 'Three', pct: 14, count: '50' },
    { label: 'Two', pct: 7, count: '16' },
    { label: 'One', pct: 4, count: '8' },
  ];
  const recentReviews = useMemo(() => {
    if (!spot) return [];
    return getPreviewReviewEntries(spot.name, spot.ntdp_category ?? null);
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
        title: `Commute toward ${spot.name}`,
        meta:
          'Prefer jeepneys, buses, or UV Express on main roads (many trips pass through Dasmariñas / major Cavite terminals). Ask drivers if they go toward your destination.',
      },
      {
        title: spot.name,
        meta: destAddr,
      },
    ];
  }, [displayRoute, spot, userCoords]);

  const handleDestinationReached = async () => {
    if (!spot?.id || !isUuid(spot.id)) {
      window.alert('Only catalog places can be added to your trip activity.');
      return;
    }
    setDestinationReachedBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) {
        window.alert('Sign in to record a completed trip.');
        return;
      }
      recordDestinationReached(data.user.id, spot.id, {
        name: spot.name,
        image: spot.image || undefined,
      });
      window.alert('Thank You and Enjoy your trip');
    } finally {
      setDestinationReachedBusy(false);
    }
  };

  const openSeeFullMap = () => {
    if (spot?.lat == null || spot?.lng == null) return;
    setFullMapOpen(true);
  };

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

  const setActiveTab = (nextTab) => {
    setTab(nextTab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', nextTab);
    setSearchParams(params, { replace: true });
  };

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
            <div className="mb-3 flex items-center justify-between text-neutral-700">
              <Link to="/search" className="inline-flex items-center gap-1.5 text-2xl font-bold hover:underline">
                <span aria-hidden className="text-3xl leading-none">‹</span>
                {spot.name}
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_230px] mb-4">
              <div className="rounded-2xl overflow-hidden">
                <img src={spot.image} alt={spot.name} className="h-[300px] w-full object-cover sm:h-[420px]" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                {[extras[0], extras[1], spot.image].map((img, i) => (
                  <div key={`${img}-${i}`} className="rounded-xl overflow-hidden">
                    <img src={img} alt="" className="h-28 w-full object-cover sm:h-[132px]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              {spot.tags?.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Establishment</p>
                {spot.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-600"
                  >
                    {formatNtdpCategoryTagLabel(tag)}
                  </span>
                ))}
                </div>
              )}
              <div className="ml-auto flex items-center gap-2">
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

            <div className="mb-3 flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
              {['description', 'reviews', 'route'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize"
                  style={
                    tab === key
                      ? { backgroundColor: olive, color: '#fff' }
                      : { backgroundColor: '#ededed', color: '#5b5b5b' }
                  }
                >
                  {key}
                </button>
              ))}
            </div>

            {tab === 'description' && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
                <div className="rounded-xl bg-white p-3 text-sm leading-relaxed text-neutral-600">
                  <p className="whitespace-pre-line">
                    {getEstablishmentAboutBody({
                      description: sanitizeDescription(spot.description),
                      ntdp_category: spot.ntdp_category,
                      name: spot.name,
                      address: spot.address,
                    })}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Map location</p>
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <iframe
                      title="Map"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${spot.lng - 0.02}%2C${spot.lat - 0.02}%2C${spot.lng + 0.02}%2C${spot.lat + 0.02}&layer=mapnik&marker=${spot.lat}%2C${spot.lng}`}
                      className="h-[190px] w-full border-0"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500">{cleanPlaceAddress(spot.name, spot.address)}</p>
                </div>
              </div>
            )}

            {tab === 'reviews' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:grid-cols-[1.2fr_320px]">
                  <div className="space-y-2.5">
                    {reviewBreakdown.map((row) => (
                      <div key={row.label} className="grid grid-cols-[52px_18px_minmax(0,1fr)_44px] items-center gap-2.5">
                        <p className="text-[11px] font-semibold uppercase text-neutral-600">{row.label}</p>
                        <ReviewStars value={1} size="h-3.5 w-3.5" />
                        <div className="h-2.5 rounded-full bg-neutral-100">
                          <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: olive }} />
                        </div>
                        <p className="text-right text-xs font-semibold text-neutral-600">{row.count}</p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-2xl border border-neutral-200 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                    style={{ background: 'linear-gradient(180deg, rgba(126,160,14,0.12), rgba(126,160,14,0.04))' }}
                  >
                    <p className="text-4xl font-bold" style={{ color: olive }}>4.3</p>
                    <div className="mt-2 flex justify-center">
                      <ReviewStars value={5} size="h-6 w-6" />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-neutral-700">50 ratings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xl font-bold text-neutral-800">Recent feedback</h3>
                    <div className="space-y-3">
                      {recentReviews.map((review) => (
                        <article
                          key={review.name}
                          className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                        >
                          <div className="flex items-start gap-3">
                            <img src={review.image} alt="" className="h-12 w-12 rounded-full object-cover" />
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-neutral-900">{review.name}</p>
                                <ReviewStars value={review.rating} size="h-3.5 w-3.5" />
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-neutral-600">{review.text}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xl font-bold text-neutral-800">Add a Review</h3>
                    <form className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
                      <label className="block text-xs font-semibold text-neutral-500">Add Your Rating *</label>
                      <div className="mt-1">
                        <ReviewStars value={0} size="h-4 w-4" dimmed />
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-neutral-500">Name *</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.18)]"
                      />
                      <label className="mt-3 block text-xs font-semibold text-neutral-500">Email *</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.18)]"
                      />
                      <label className="mt-3 block text-xs font-semibold text-neutral-500">Write Your Review *</label>
                      <textarea
                        rows={4}
                        placeholder="Write here..."
                        className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.18)]"
                      />
                      <button
                        type="button"
                        className="mt-4 h-10 w-full rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: olive }}
                      >
                        Submit
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {tab === 'route' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-[rgba(126,160,14,0.35)] bg-[rgba(126,160,14,0.06)] p-4">
                  <p className="text-sm font-bold text-[#1f4f59]">Route on the map</p>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                    The map draws a <span className="font-semibold text-[#1d4ed8]">blue line</span> on real roads (OSRM)
                    from your location to {spot.name}. <span className="font-semibold">Commute steps</span> and{' '}
                    <span className="font-semibold">Commuter guide</span> use the same OSRM turn data as the mobile app.
                    Boarding hubs are under <span className="font-semibold">Via Terminals</span>.
                  </p>
                </div>

                <div className="rounded-2xl border border-[rgba(31,79,89,0.2)] bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-neutral-900">Finished your trip?</p>
                  <p className="mt-1 text-xs text-neutral-600">
                    Tap below only after you arrive. Your profile “Activity this month” updates only when you confirm
                    destination reached — not when you open the map.
                  </p>
                  <button
                    type="button"
                    disabled={destinationReachedBusy || !isUuid(spot.id)}
                    onClick={handleDestinationReached}
                    className="mt-3 w-full rounded-xl px-4 py-3 text-sm font-bold text-white transition disabled:opacity-50"
                    style={{ backgroundColor: olive }}
                  >
                    {destinationReachedBusy ? 'Saving…' : 'Destination Reached'}
                  </button>
                  <button
                    type="button"
                    onClick={openSeeFullMap}
                    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                  >
                    See full map
                  </button>
                  <p className="mt-2 text-[11px] text-neutral-500">
                    Opens a full-screen OSRM / OpenStreetMap view (same routing as here — not Google Maps).
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
                  {[
                    { id: 'routeSteps', label: 'Commute steps' },
                    { id: 'stepGuide', label: 'Commuter guide' },
                    { id: 'viaTerminals', label: 'Via Terminals' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setRouteSubTab(id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        routeSubTab === id
                          ? 'text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                      style={routeSubTab === id ? { backgroundColor: olive } : undefined}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {routeSubTab === 'routeSteps' && (
                  <div className="rounded-2xl border border-[rgba(31,79,89,0.12)] bg-white p-4 shadow-sm">
                    <span className="inline-block rounded-md bg-[#f4f6ec] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1f4f59]">
                      Commuter-first
                    </span>
                    <p className="mt-3 text-xs leading-relaxed text-neutral-600">{COMMUTER_DISCLAIMER}</p>
                    <p className="mt-2 text-xs text-neutral-500">{COMMUTER_FOOTNOTE}</p>
                    <div className="mt-3 rounded-xl border border-neutral-200 bg-[#f8faf7] px-3 py-2">
                      <p className="text-[11px] font-semibold text-neutral-700">
                        {userCoords ? 'Your current location' : 'Current location'}
                      </p>
                      <p className="text-[11px] text-neutral-600">→ {spot.name}</p>
                    </div>
                    {osrmLoading ? <p className="mt-3 text-sm text-neutral-500">Calculating road route…</p> : null}
                    {osrmError ? <p className="mt-3 text-sm text-red-600">{osrmError}</p> : null}
                    {!userCoords ? (
                      <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Location is off — turn it on to load segments from where you are. You can still open the full map
                        to plan transfers and walking.
                      </p>
                    ) : null}
                    {osrmDriving && osrmDriving.steps?.length > 0 ? (
                      <>
                        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                          Whole corridor (road length)
                        </p>
                        <p className="mt-1 text-sm text-neutral-800">
                          {formatDistanceM(osrmDriving.distanceM)} · {formatDurationS(osrmDriving.durationS)} if driven
                          end-to-end — commute time depends on waits and transfers
                        </p>
                        {osrmFoot ? (
                          <p className="mt-2 text-xs text-neutral-600">
                            Walking-only reference (same endpoints): {formatDistanceM(osrmFoot.distanceM)} ·{' '}
                            {formatDurationS(osrmFoot.durationS)} — use for short links between rides, not as a full
                            commute time
                          </p>
                        ) : null}
                        <div className="mt-4 space-y-4 border-t border-neutral-100 pt-4">
                          {osrmDriving.steps.map((step, index) => {
                            const hint = commuterStepHint(index, osrmDriving.steps.length, step.distanceM);
                            return (
                              <div
                                key={`osrm-step-${index}-${Math.round(step.distanceM)}`}
                                className="flex gap-3 border-b border-neutral-50 pb-4 last:border-b-0 last:pb-0"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: olive }}>
                                  {index + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-neutral-900">
                                    {commuterDirectStepInstruction(step, index, osrmDriving.steps.length, spot.name)}
                                  </p>
                                  <p className="mt-1 text-xs text-neutral-500">
                                    {formatDistanceM(step.distanceM)} · ~{formatDurationS(step.durationS)} driving
                                    reference
                                  </p>
                                    {hint ? <p className="mt-1 text-xs text-[#1f4f59]">{hint}</p> : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                    {!osrmLoading && userCoords && (!osrmDriving?.steps?.length || !osrmDriving) ? (
                      <p className="mt-3 text-sm text-neutral-600">
                        No segments returned for this corridor — try the map or another nearby road.
                      </p>
                    ) : null}
                  </div>
                )}

                {routeSubTab === 'stepGuide' && (
                  <div className="rounded-2xl border border-[rgba(31,79,89,0.12)] bg-white p-4 shadow-sm">
                    <span className="inline-block rounded-md bg-[#f4f6ec] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1f4f59]">
                      Commuter-first
                    </span>
                    <p className="mt-3 text-xs leading-relaxed text-neutral-600">{COMMUTER_DISCLAIMER}</p>
                    <p className="mt-2 text-xs text-neutral-500">{COMMUTER_FOOTNOTE}</p>
                    <div className="mt-4 whitespace-pre-wrap rounded-xl bg-[#fafafa] p-3 text-sm leading-relaxed text-neutral-800">
                      {buildCommuterNarrativeFromOsrmSteps(osrmDriving?.steps ?? [], spot.name)}
                    </div>
                  </div>
                )}

                {routeSubTab === 'viaTerminals' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[rgba(31,79,89,0.12)] bg-white p-4 shadow-sm">
                      <h3 className="font-['Poppins',sans-serif] text-base font-bold text-neutral-900">Via Terminals</h3>
                      <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                        Nearest public terminals and how to use them with this trip. Always confirm routes, signboards,
                        and fares at the terminal or with the driver.
                      </p>
                      {userCoords && terminalTransitPlan ? (
                        <div className="mt-4 space-y-3 text-sm text-neutral-800">
                          {terminalTransitPlan.originTerminal.id === terminalTransitPlan.destinationTerminal.id ? (
                            <>
                              <div className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: olive }}>
                                  1
                                </span>
                                <p>
                                  <span className="font-semibold">{terminalTransitPlan.originTerminal.name}</span> is
                                  the closest major terminal to both your area and {spot.name}. Open it below for
                                  routes, gates, and reminders.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: olive }}>
                                  2
                                </span>
                                <p>
                                  Ride toward {spot.name} (or its municipality), then use{' '}
                                  <span className="font-semibold">Commute steps</span> or a tricycle for the last leg.
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: olive }}>
                                  1
                                </span>
                                <p>
                                  Go to{' '}
                                  <span className="font-semibold">{terminalTransitPlan.originTerminal.name}</span>
                                  {` (~${haversineDistanceKm(userCoords.lat, userCoords.lng, terminalTransitPlan.originTerminal.latitude, terminalTransitPlan.originTerminal.longitude).toFixed(1)} km from your start) `}
                                  to board jeepneys, buses, or vans toward the general direction of {spot.name}.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: olive }}>
                                  2
                                </span>
                                <p>
                                  Stay on lines that serve{' '}
                                  <span className="font-semibold">
                                    {terminalTransitPlan.destinationTerminal.municipality}
                                  </span>{' '}
                                  or corridors leading to {spot.name}. Ask the driver or konduktor before boarding.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: olive }}>
                                  3
                                </span>
                                <p>
                                  Alight near{' '}
                                  <span className="font-semibold">{terminalTransitPlan.destinationTerminal.name}</span>
                                  {` (~${haversineDistanceKm(spot.lat, spot.lng, terminalTransitPlan.destinationTerminal.latitude, terminalTransitPlan.destinationTerminal.longitude).toFixed(1)} km from ${spot.name})`}
                                  , then follow <span className="font-semibold">Commute steps</span> or local rides to
                                  the exact spot.
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      ) : !userCoords ? (
                        <p className="mt-3 text-xs text-amber-900">Turn on location to load terminal suggestions for this trip.</p>
                      ) : terminalTransitLoading ? (
                        <p className="mt-3 text-xs text-neutral-500">Loading terminals…</p>
                      ) : (
                        <p className="mt-3 text-xs text-neutral-600">
                          No terminal match is available yet for this area. Try the Terminals tab or ask locally for the
                          nearest jeepney or bus stop.
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl border border-[rgba(31,79,89,0.15)] bg-[#f5faf8] p-4">
                      <p className="text-sm font-bold text-[#1f4f59]">Terminals for this trip</p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-600">
                        Nearest terminal to you and nearest to {spot.name}.
                      </p>
                      {!userCoords ? (
                        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                          Allow location access to load terminals matched to you and this establishment.
                        </p>
                      ) : terminalTransitLoading ? (
                        <p className="mt-3 text-xs text-neutral-500">Finding nearest terminals…</p>
                      ) : terminalTransitPlan ? (
                        <div
                          className={`mt-3 grid gap-3 ${
                            terminalTransitPlan.originTerminal.id === terminalTransitPlan.destinationTerminal.id
                              ? 'grid-cols-1'
                              : 'sm:grid-cols-2'
                          }`}
                        >
                          {terminalTransitPlan.originTerminal.id === terminalTransitPlan.destinationTerminal.id ? (
                            <Link
                              to={`/terminals/${terminalTransitPlan.originTerminal.id}`}
                              className="block rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-[#7ea00e] hover:shadow-sm"
                            >
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7ea00e]">
                                Nearest terminal (you & destination)
                              </p>
                              <p className="mt-1 text-sm font-semibold text-neutral-900">
                                {terminalTransitPlan.originTerminal.name}
                              </p>
                              <p className="mt-1 text-[11px] text-neutral-600">
                                {terminalTransitPlan.originTerminal.municipality}
                                {' · ~'}
                                {haversineDistanceKm(
                                  userCoords.lat,
                                  userCoords.lng,
                                  terminalTransitPlan.originTerminal.latitude,
                                  terminalTransitPlan.originTerminal.longitude
                                ).toFixed(1)}
                                {' km from you · ~'}
                                {haversineDistanceKm(
                                  spot.lat,
                                  spot.lng,
                                  terminalTransitPlan.originTerminal.latitude,
                                  terminalTransitPlan.originTerminal.longitude
                                ).toFixed(1)}
                                {` km from ${spot.name}`}
                              </p>
                              <p className="mt-2 text-xs font-semibold text-[#1f4f59]">Open terminal →</p>
                            </Link>
                          ) : (
                            <>
                              <Link
                                to={`/terminals/${terminalTransitPlan.originTerminal.id}`}
                                className="block rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-[#7ea00e] hover:shadow-sm"
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7ea00e]">
                                  Board near you
                                </p>
                                <p className="mt-1 text-sm font-semibold text-neutral-900">
                                  {terminalTransitPlan.originTerminal.name}
                                </p>
                                <p className="mt-1 text-[11px] text-neutral-600">
                                  {terminalTransitPlan.originTerminal.municipality}
                                  {' · ~'}
                                  {haversineDistanceKm(
                                    userCoords.lat,
                                    userCoords.lng,
                                    terminalTransitPlan.originTerminal.latitude,
                                    terminalTransitPlan.originTerminal.longitude
                                  ).toFixed(1)}
                                  {' km away'}
                                </p>
                                <p className="mt-2 text-xs font-semibold text-[#1f4f59]">Open terminal →</p>
                              </Link>
                              <Link
                                to={`/terminals/${terminalTransitPlan.destinationTerminal.id}`}
                                className="block rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-[#7ea00e] hover:shadow-sm"
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-[#7ea00e]">
                                  Near {spot.name}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-neutral-900">
                                  {terminalTransitPlan.destinationTerminal.name}
                                </p>
                                <p className="mt-1 text-[11px] text-neutral-600">
                                  {terminalTransitPlan.destinationTerminal.municipality}
                                  {' · ~'}
                                  {haversineDistanceKm(
                                    spot.lat,
                                    spot.lng,
                                    terminalTransitPlan.destinationTerminal.latitude,
                                    terminalTransitPlan.destinationTerminal.longitude
                                  ).toFixed(1)}
                                  {' km from destination'}
                                </p>
                                <p className="mt-2 text-xs font-semibold text-[#1f4f59]">Open terminal →</p>
                              </Link>
                            </>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-neutral-500">No terminal data for this area.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="border-b border-neutral-200 bg-[#f8faf7] p-3.5 lg:border-b-0 lg:border-r">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Route options</p>
                    <div className="mt-2 rounded-xl border border-neutral-200 bg-white px-3 py-2">
                      <p className="text-xs font-semibold text-neutral-700">{userCoords ? 'From your current GPS location' : 'From current location'}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-500">
                        Destination: {cleanPlaceAddress(spot.name, spot.address)}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {displayRoute ? (
                        <article className="rounded-xl border border-neutral-200 bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">{displayRoute.label}</p>
                              <p className="text-[11px] text-neutral-500">{displayRoute.mode}</p>
                            </div>
                            <span className={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full ${displayRoute.accent}`} />
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                            <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                              <p className="text-neutral-400">ETA</p>
                              <p className="font-semibold text-neutral-700">{formatDuration(displayRoute.durationMin)}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                              <p className="text-neutral-400">Distance</p>
                              <p className="font-semibold text-neutral-700">{displayRoute.distanceKm} km</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                              <p className="text-neutral-400">Traffic</p>
                              <p className="font-semibold text-neutral-700">{displayRoute.traffic}</p>
                            </div>
                          </div>
                        </article>
                      ) : null}
                    </div>
                  </aside>

                  <div className="p-3.5">
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">Tracking route to {spot.name}</p>
                          <p className="text-[11px] text-neutral-500">{displayRoute?.distanceKm ?? '--'} km • {formatDuration(displayRoute?.durationMin ?? 0)}</p>
                          <p className="mt-1 text-[10px] text-[#1d4ed8]">
                            Map: road path from your location (driving, then walking if needed).
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: displayRoute?.color ?? '#10b981' }} />
                          Route active
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-neutral-200">
                        <RouteLeafletMap
                          start={userCoords}
                          end={{ lat: spot.lat, lng: spot.lng }}
                          routeId={displayRoute?.id ?? 'main-road'}
                          lineColor={displayRoute?.color ?? '#0ea5e9'}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="rounded-xl border border-neutral-200 bg-white p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Route timeline</p>
                        <div className="space-y-2.5">
                          {routeTimeline.map((step, idx) => (
                            <div key={`route-tl-${idx}-${step.title}`} className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2">
                              <div className="relative mt-0.5">
                                <span className={`block h-2.5 w-2.5 rounded-full ${idx === routeTimeline.length - 1 ? 'bg-neutral-900' : 'bg-sky-500'}`} />
                                {idx < routeTimeline.length - 1 && <span className="absolute left-[4px] top-3 block h-6 w-[1.5px] bg-neutral-200" />}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-neutral-800">{step.title}</p>
                                <p className="text-xs text-neutral-500">{step.meta}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}

          </section>

          <aside className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 lg:sticky lg:top-24 self-start">
            <h2 className="text-xl font-semibold text-neutral-800">Places you may like</h2>
            <div className="mt-4 space-y-3">
              {relatedPlaces.map((place) => (
                <Link
                  key={place.id}
                  to={`/place/${place.id}`}
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:shadow-sm"
                >
                  <img src={place.image} alt="" className="h-[72px] w-[72px] rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{place.name}</p>
                    <p className="line-clamp-1 text-xs text-neutral-500">{place.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </main>

      {fullMapOpen && spot?.lat != null && spot?.lng != null ? (
        <div
          className="fixed inset-0 z-[2000] flex flex-col bg-neutral-950/90 p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Full route map"
        >
          <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
            <p className="text-sm font-semibold text-white">OSRM route — {spot.name}</p>
            <button
              type="button"
              onClick={() => setFullMapOpen(false)}
              className="rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
            >
              Close
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/20 bg-white shadow-lg">
            <RouteLeafletMap
              className="h-full min-h-[280px] w-full flex-1 sm:min-h-[420px]"
              start={userCoords}
              end={{ lat: spot.lat, lng: spot.lng }}
              routeId={displayRoute?.id ?? 'main-road'}
              lineColor={displayRoute?.color ?? '#0ea5e9'}
            />
          </div>
          <p className="mt-3 shrink-0 text-center text-[11px] text-white/80">
            Project OSRM + OpenStreetMap — same in-app routing as mobile (not Google Maps).
          </p>
        </div>
      ) : null}

      {saveModalOpen && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save to list"
        >
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <h3 className="text-base font-semibold text-neutral-900">Save establishment</h3>
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
