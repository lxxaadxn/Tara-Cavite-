import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveAvatarUrl } from 'cavitour-shared/defaultAvatar';
import { supabase } from '../lib/supabase';
import { fetchPlaceReviews } from '../lib/placeReviews';
import { formatNtdpCategoryTagLabel, getEstablishmentAboutBody } from '../lib/ntdpDisplayLabels';
import { googleMapsDirectionsUrl } from '../lib/osmUrls';
import { PlacesLeafletMap } from './PlacesLeafletMap';

/**
 * What a traveler sees on the place detail page, rendered from the owner's own
 * draft state so edits show up before they are saved. The markup mirrors
 * PlaceDetailPage section by section, minus the parts an owner cannot act on.
 */

const olive = '#10A37F';

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

function spotCategoryTypeFromDb(spot) {
  const raw = String(spot?.ntdp_category ?? '').trim();
  if (raw) return formatNtdpCategoryTagLabel(raw);
  const ta = typeof spot?.ta_category === 'string' ? spot.ta_category.trim() : '';
  if (ta) return ta;
  const tc = typeof spot?.type_code === 'string' ? spot.type_code.trim() : '';
  if (tc) return tc;
  return '—';
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

function formatReviewTime(ts) {
  const ms = Date.now() - Number(ts);
  if (!Number.isFinite(ms) || ms < 0) return '';
  if (ms < 60_000) return 'Just now';
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
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
    case 'municipality':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.2" />
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

/** The owner's saved catalog row plus their unsaved edits, in traveler shape. */
function toSpot(listing, draft) {
  const opening = String(draft?.openingHours ?? '').trim();
  const closing = String(draft?.closingHours ?? '').trim();
  const hours = opening && closing ? `${opening} – ${closing}` : opening || closing;
  return {
    id: listing?.id ?? '',
    name: listing?.name ?? '',
    address: draft?.address ?? listing?.address ?? '',
    city_mun: listing?.cityMun ?? '',
    ta_category: listing?.taCategory ?? '',
    ntdp_category: listing?.ntdpCategory ?? '',
    type_code: listing?.typeCode ?? '',
    lat: draft?.latitude ?? listing?.latitude ?? null,
    lng: draft?.longitude ?? listing?.longitude ?? null,
    description: draft?.description ?? '',
    hours,
    phone: draft?.phone ?? '',
    email: draft?.email ?? '',
    website: draft?.website ?? '',
  };
}

export function EstablishmentPreview({ listing, draft, blockers = [] }) {
  const [heroIndex, setHeroIndex] = useState(0);
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [reviews, setReviews] = useState([]);

  const spot = useMemo(() => toSpot(listing, draft), [listing, draft]);
  const placeId = listing?.id ?? '';

  const galleryImages = useMemo(() => {
    const urls = [];
    for (const raw of draft?.gallery ?? []) {
      const url = String(raw ?? '').trim();
      if (url && !urls.includes(url)) urls.push(url);
    }
    return urls;
  }, [draft?.gallery]);

  useEffect(() => {
    if (heroIndex >= galleryImages.length) setHeroIndex(0);
  }, [galleryImages.length, heroIndex]);

  useEffect(() => {
    if (!placeId) {
      setReviews([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchPlaceReviews(supabase, placeId);
        if (!cancelled) setReviews(rows);
      } catch {
        if (!cancelled) setReviews([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  const heroImage = galleryImages[Math.min(heroIndex, galleryImages.length - 1)] || '';

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

  const visitorReviews = useMemo(() => [...reviews].sort((a, b) => b.at - a.at), [reviews]);

  const reviewStats = useMemo(
    () => buildReviewStatsFromRatings(visitorReviews.map((r) => r.rating)),
    [visitorReviews]
  );

  const overview = useMemo(() => getEstablishmentAboutBody(spot), [spot]);
  const category = useMemo(() => spotCategoryTypeFromDb(spot), [spot]);
  const municipalityProvince = useMemo(
    () => formatMunicipalityProvince(spot.city_mun, spot.address),
    [spot]
  );

  const highlightCards = useMemo(() => {
    const typeValue = String(spot.ta_category || spot.type_code || '').trim();
    const categoryValue = category !== '—' ? category : '';
    const municipalityValue = String(spot.city_mun || '').trim();
    return [
      { key: 'type', label: 'Type', value: typeValue || '—' },
      { key: 'category', label: 'Category', value: categoryValue || '—' },
      { key: 'municipality', label: 'Municipality', value: municipalityValue || '—' },
    ];
  }, [spot, category]);

  const hasContact = Boolean(String(spot.hours || '').trim() || spot.phone || spot.email || spot.website);

  const overviewNeedsToggle = overview.length > 220;
  const overviewText =
    overviewNeedsToggle && !overviewExpanded ? `${overview.slice(0, 220).trim()}…` : overview;

  const cycleHero = useCallback(
    (delta) => {
      setHeroIndex((prev) => {
        const len = galleryImages.length || 1;
        return (prev + delta + len) % len;
      });
    },
    [galleryImages.length]
  );

  const openGoogleDirections = () => {
    if (spot.lat == null || spot.lng == null) return;
    const url = googleMapsDirectionsUrl(spot.lat, spot.lng, 'driving', null);
    if (url && url !== '#') window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="font-['Poppins',sans-serif]">
      {blockers.length > 0 ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
          Not visible to travelers yet. Your listing still needs {blockers.join(', ')}.
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-['Poppins',sans-serif] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              {spot.name || 'Your establishment'}
            </h1>
          </div>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-neutral-500">
            <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11Z" />
              <circle cx="12" cy="10" r="2.2" />
            </svg>
            <span>{spot.address?.trim() || municipalityProvince || 'Cavite, Philippines'}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v14" />
            </svg>
            Share
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Save
          </button>
        </div>
      </div>

      <div className="mt-6 grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,28vw)] lg:gap-8">
        <section className="min-w-0">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1.15fr)_minmax(150px,0.55fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(170px,0.5fr)] lg:gap-3">
            <div className="relative h-[320px] overflow-hidden rounded-2xl bg-neutral-100 sm:h-[420px] lg:h-[min(64vh,680px)]">
              {heroImage ? (
                <img src={heroImage} alt={spot.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                  No photo yet
                </div>
              )}
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
              {galleryThumbs.length > 0
                ? galleryThumbs.map((thumb, i) => {
                    const isLast = i === galleryThumbs.length - 1 && extraPhotoCount > 0;
                    return (
                      <button
                        key={`${thumb.url}-${thumb.index}-${i}`}
                        type="button"
                        onClick={() => setHeroIndex(thumb.index)}
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
                  })
                : [0, 1, 2].map((i) => (
                    <div key={i} className="min-h-0 overflow-hidden rounded-xl bg-neutral-100" />
                  ))}
            </div>
          </div>

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
        </section>

        {/* Sticks to the top of the preview dialog's scroll area, and scrolls
            on its own once the review list outgrows it. */}
        <aside className="self-start space-y-5 lg:sticky lg:top-0 lg:max-h-[calc(92vh-7rem)] lg:overflow-y-auto lg:[scrollbar-width:none] lg:[&::-webkit-scrollbar]:hidden">
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
                {spot.website ? (
                  <div className="space-y-2.5">
                    <div>
                      <span className="block text-xs font-medium text-neutral-400">Social Media</span>
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
                    </div>
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
                      {reviewStats.total > 0 ? reviewStats.avgRating.toFixed(1) : '—'}
                    </p>
                    <div className="mt-2 flex justify-center">
                      {reviewStats.total > 0 ? (
                        <ReviewStars value={reviewStats.displayStarCount} size="h-4 w-4" />
                      ) : (
                        <ReviewStars value={0} size="h-4 w-4" dimmed />
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-neutral-700">
                      {reviewStats.total > 0 ? `${formatReviewCount(reviewStats.total)} reviews` : 'No reviews yet'}
                    </p>
                  </div>
                  {reviewStats.total > 0 ? (
                    <div className="space-y-2">
                      {reviewStats.breakdown.map((row) => (
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

              {visitorReviews.length > 0 ? (
                <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-100 bg-white">
                  {visitorReviews.map((r) => {
                    const displayNickname =
                      typeof r.nickname === 'string' && r.nickname.trim() ? r.nickname.trim() : 'Traveler';
                    return (
                      <li key={r.id} className="px-3 py-3">
                        <div className="flex items-start gap-2.5">
                          <img
                            src={r.avatarUrl || resolveAvatarUrl(null)}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-neutral-200"
                          />
                          <div className="min-w-0 flex-1">
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
                                {r.photoUrls.map((url) => (
                                  <span
                                    key={`${r.id}-${url}`}
                                    className="h-14 w-14 overflow-hidden rounded-lg border border-neutral-200"
                                  >
                                    <img src={url} alt="" className="h-full w-full object-cover" />
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
                  No reviews yet. Be the first to share your visit.
                </p>
              )}

              <p className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-4 text-sm text-neutral-600">
                <span className="font-semibold text-neutral-800">Visit to leave a review.</span>{' '}
                Scan the establishment QR code in the Tara, Cavite! app to unlock reviews.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
