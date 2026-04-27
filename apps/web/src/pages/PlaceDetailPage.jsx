import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase, fetchPlaceById } from '../lib/placesFromSupabase';
import { AppHeader } from '../components/AppHeader';
import { RouteLeafletMap } from '../components/RouteLeafletMap';
import { savePlaceToList } from '../lib/savedPlaces';
import { planTerminalTransit } from '../lib/terminalTransitPlanner';

const olive = '#7ea00e';
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
    subtitle: sourcePlace.ntdp_category ? `${sourcePlace.type ?? 'Place'} · ${sourcePlace.ntdp_category}` : sourcePlace.type || DEFAULT_FALLBACK_SPOT.subtitle,
    hours: sourcePlace.hours || DEFAULT_FALLBACK_SPOT.hours,
    fromSupabase: false,
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
  const [terminalTransitPlan, setTerminalTransitPlan] = useState(null);

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
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const plan = await planTerminalTransit(supabase, userCoords, { lat: spot.lat, lng: spot.lng });
        if (!cancelled) setTerminalTransitPlan(plan);
      } catch {
        if (!cancelled) setTerminalTransitPlan(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userCoords, spot?.lat, spot?.lng]);

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
            subtitle: p.ntdp_category ? `${p.type ?? 'Place'} · ${p.ntdp_category}` : p.type,
            hours: p.hours,
            fromSupabase: true,
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
  const recentReviews = [
    {
      name: 'Robert Karmazov',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
      text: 'Great ambiance, practical parking, and smooth check-in. Perfect place for quick Cavite stopovers.',
      rating: 4,
    },
    {
      name: 'Alyssa M.',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
      text: 'Clean area and easy to find. Staff were approachable and gave helpful local recommendations.',
      rating: 5,
    },
    {
      name: 'Marco D.',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&q=80',
      text: 'Solid destination for family day tours. Better to arrive early for less crowd.',
      rating: 4,
    },
  ];
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
  const selectedRoute = routeOptions[0] ?? null;

  const routeTimeline = useMemo(() => {
    if (!selectedRoute) return [];
    return [
      {
        title: userCoords ? 'Your location' : 'Starting point',
        meta: userCoords ? 'Detected via GPS' : 'Set your current location',
      },
      {
        title: 'Main junction',
        meta: selectedRoute.mode,
      },
      {
        title: spot.name,
        meta: cleanPlaceAddress(spot.name, spot.address),
      },
    ];
  }, [selectedRoute, spot, userCoords]);

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
    const suggestedName = spot?.ntdp_category || 'My list';
    setListNameDraft(suggestedName);
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
      establishmentTag: spot.tags?.[0] ?? '',
    });
    if (result.ok) {
      setSaveStatus(`Saved to "${trimmed}"`);
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
                    {tag}
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
                  <p>{sanitizeDescription(spot.description) || 'No additional description available yet.'}</p>
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
                {userCoords && (
                  <div className="overflow-hidden rounded-2xl border border-[#cddcab] bg-[#f7faef] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#5d7211]">Cavite terminal transfers</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-neutral-600">
                      Nearest terminals to you and this place, connected via the same route graph as the mobile commute screen (
                      <code className="rounded bg-white/80 px-1 text-[10px]">cavitour_terminal_routes</code>
                      ).
                    </p>
                    {!terminalTransitPlan ? (
                      <p className="mt-2 text-xs text-neutral-500">No linked path in the dataset, or still loading…</p>
                    ) : (
                      <div className="mt-3 rounded-xl border border-neutral-200 bg-white p-3">
                        <p className="text-[11px] text-neutral-600">
                          <span className="font-semibold text-neutral-900">{terminalTransitPlan.originTerminal.name}</span>
                          <span className="mx-1">→</span>
                          <span className="font-semibold text-neutral-900">{terminalTransitPlan.destinationTerminal.name}</span>
                        </p>
                        {terminalTransitPlan.legs.length === 0 ? (
                          <p className="mt-2 text-xs text-neutral-500">Same nearest terminal — ride the corridor on the map below.</p>
                        ) : (
                          <ol className="mt-2 list-decimal space-y-2 pl-4 text-xs text-neutral-800">
                            {terminalTransitPlan.legs.map((leg, idx) => (
                              <li key={`${leg.fromTerminalId}-${leg.toTerminalId}-${idx}`}>
                                Route: {leg.routeName} · {leg.transportName}
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {!userCoords && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Allow location to see Cavite terminal-to-terminal legs (same as mobile directions).
                  </p>
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
                      {routeOptions.map((route) => (
                        <article
                          key={route.id}
                          className="rounded-xl border border-neutral-200 bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">{route.label}</p>
                              <p className="text-[11px] text-neutral-500">{route.mode}</p>
                            </div>
                            <span className={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full ${route.accent}`} />
                          </div>
                          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                            <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                              <p className="text-neutral-400">ETA</p>
                              <p className="font-semibold text-neutral-700">{formatDuration(route.durationMin)}</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                              <p className="text-neutral-400">Distance</p>
                              <p className="font-semibold text-neutral-700">{route.distanceKm} km</p>
                            </div>
                            <div className="rounded-lg bg-neutral-50 px-2 py-1.5">
                              <p className="text-neutral-400">Traffic</p>
                              <p className="font-semibold text-neutral-700">{route.traffic}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </aside>

                  <div className="p-3.5">
                    <div className="rounded-xl border border-neutral-200 bg-white p-3">
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">Tracking route to {spot.name}</p>
                          <p className="text-[11px] text-neutral-500">{selectedRoute?.distanceKm ?? '--'} km • {formatDuration(selectedRoute?.durationMin ?? 0)}</p>
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600">
                          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selectedRoute?.color ?? '#10b981' }} />
                          Route active
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-xl border border-neutral-200">
                        <RouteLeafletMap
                          start={userCoords}
                          end={{ lat: spot.lat, lng: spot.lng }}
                          routeId={selectedRoute?.id ?? 'main-road'}
                          lineColor={selectedRoute?.color ?? '#0ea5e9'}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="rounded-xl border border-neutral-200 bg-white p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">Route timeline</p>
                        <div className="space-y-2.5">
                          {routeTimeline.map((step, idx) => (
                            <div key={step.title} className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-2">
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

      {saveModalOpen && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Save to list"
        >
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
            <h3 className="text-base font-semibold text-neutral-900">Save establishment</h3>
            <p className="mt-1 text-sm text-neutral-500">Create a list name and this place will be saved there.</p>
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-neutral-400">List name</label>
            <input
              type="text"
              value={listNameDraft}
              onChange={(e) => setListNameDraft(e.target.value)}
              placeholder="My list"
              className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
              autoFocus
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
                Save to list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
