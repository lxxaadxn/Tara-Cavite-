import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchPlaceById, logPlacesFetchError } from '../lib/placesFromSupabase';
import { AppHeader } from '../components/AppHeader';
import { DirectionsPanel } from '../components/DirectionsPanel';
import { SaveToListModal } from '../components/SaveToListModal';
import { SaveSuccessToast } from '../components/SaveSuccessToast';
import { readSavedLists, savePlaceToList, savePlaceToListId } from '../lib/savedPlaces';
import { useSaveSuccessToast } from '../lib/useSaveSuccessToast';
import { formatNtdpCategoryTagLabel, getEstablishmentAboutBody } from '../lib/ntdpDisplayLabels';

const GREEN = '#7ea00e';
const TEAL = '#1f4f59';
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

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

function spotCategoryLabel(spot) {
  const raw = String(spot?.ntdp_category ?? '').trim();
  if (raw) return formatNtdpCategoryTagLabel(raw);
  const tag = spot?.tags?.find((t) => t && String(t).trim());
  if (tag) return formatNtdpCategoryTagLabel(String(tag).trim());
  return 'Cavite tourism';
}

function collectPhotoUrls(spot) {
  const seen = new Set();
  const out = [];
  const add = (url) => {
    const u = typeof url === 'string' ? url.trim() : '';
    if (!u || seen.has(u)) return;
    seen.add(u);
    out.push(u);
  };
  add(spot?.image);
  (spot?.galleryUrls ?? []).forEach(add);
  return out.length ? out : [PLACEHOLDER_IMG];
}

function normalizeExternalUrl(url) {
  const t = url.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function EstablishmentPhotoCarousel({ slides, placeName }) {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || slides.length < 2) return;
    const w = el.clientWidth || 1;
    const idx = Math.round(el.scrollLeft / w);
    setActiveIndex(Math.max(0, Math.min(idx, slides.length - 1)));
  };

  return (
    <div className="relative mt-1 mb-5 overflow-hidden rounded-[18px] bg-[#e8e8e8]">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={`Photos of ${placeName}`}
      >
        {slides.map((src, index) => (
          <div key={`${src}-${index}`} className="w-full shrink-0 snap-center snap-always">
            <img
              src={src}
              alt={`${placeName} photo ${index + 1}`}
              className="aspect-[4/3] w-full object-cover"
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>
      {slides.length > 1 ? (
        <div
          className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center gap-1.5"
          aria-label={`Photo ${activeIndex + 1} of ${slides.length}`}
        >
          {slides.map((_, i) => (
            <span
              key={`dot-${i}`}
              className={`h-1.5 rounded-full transition-all ${
                i === activeIndex ? 'w-[18px] bg-white' : 'w-1.5 bg-white/45'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PlaceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [spot, setSpot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placeNotFound, setPlaceNotFound] = useState(false);
  const [userCoords, setUserCoords] = useState(null);
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const { showSaveSuccess, toastProps } = useSaveSuccessToast();
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);

  useEffect(() => {
    setDirectionsOpen(false);
  }, [id]);

  useEffect(() => {
    const q = searchParams.get('tab');
    if (q === 'route' || q === 'description' || q === 'reviews') {
      const p = new URLSearchParams(searchParams);
      p.delete('tab');
      setSearchParams(p, { replace: true });
      if (q === 'route') setDirectionsOpen(true);
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPlaceNotFound(false);
      try {
        if (!id) {
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
            hours: p.hours,
            ntdp_category: p.ntdp_category ?? null,
            city_mun: p.city_mun ?? null,
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
  }, [id]);

  const photoSlides = useMemo(() => (spot ? collectPhotoUrls(spot) : []), [spot]);

  const establishmentAboutBody = useMemo(() => {
    if (!spot) return '';
    const body = getEstablishmentAboutBody(spot);
    const cleaned = sanitizeDescription(body);
    return cleaned || body;
  }, [spot]);

  const categoryLabel = useMemo(() => (spot ? spotCategoryLabel(spot) : ''), [spot]);

  const addressLine = useMemo(() => {
    if (!spot) return '';
    const addr = spot.address?.trim();
    if (addr) return addr;
    return spot.city_mun?.trim() ?? '';
  }, [spot]);

  const hasContact = Boolean(
    spot?.phone ||
      spot?.email ||
      spot?.website ||
      spot?.social_facebook ||
      spot?.social_instagram ||
      spot?.social_twitter
  );

  const cleanDestAddress = useMemo(() => {
    if (!spot) return '';
    const addr = spot.address?.trim();
    if (addr) return addr;
    return spot.city_mun?.trim() ?? 'Cavite, Philippines';
  }, [spot]);

  const handleSaveToList = useCallback(() => {
    const suggestedName = spot?.ntdp_category ? formatNtdpCategoryTagLabel(spot.ntdp_category) : 'My list';
    setListNameDraft(suggestedName);
    setExistingLists(readSavedLists());
    setSaveModalOpen(true);
  }, [spot?.ntdp_category]);

  const handleConfirmSaveToList = useCallback(() => {
    const trimmed = String(listNameDraft ?? '').trim();
    if (!trimmed || !spot) return;
    const result = savePlaceToList(trimmed, {
      id: spot.id,
      name: spot.name,
      image: spot.image,
      subtitle: addressLine || 'Cavite',
      establishmentTag: spot.ntdp_category ? formatNtdpCategoryTagLabel(spot.ntdp_category) : spot.tags?.[0] ?? '',
    });
    if (result.ok) {
      showSaveSuccess(result.listName ?? trimmed, {
        variant: result.alreadySaved ? 'already' : 'saved',
      });
      setSaveModalOpen(false);
    }
  }, [listNameDraft, spot, addressLine, showSaveSuccess]);

  const handleSaveToExistingList = useCallback(
    (listId) => {
      if (!spot) return;
      const result = savePlaceToListId(listId, {
        id: spot.id,
        name: spot.name,
        image: spot.image,
        subtitle: addressLine || 'Cavite',
        establishmentTag: spot.ntdp_category
          ? formatNtdpCategoryTagLabel(spot.ntdp_category)
          : spot.tags?.[0] ?? '',
      });
      if (result.ok) {
        showSaveSuccess(result.listName || 'list', {
          variant: result.alreadySaved ? 'already' : 'saved',
        });
        setSaveModalOpen(false);
      }
    },
    [spot, addressLine, showSaveSuccess]
  );

  const openDirections = useCallback(() => {
    if (spot?.lat == null || spot?.lng == null) {
      window.alert('This place does not have map coordinates yet.');
      return;
    }
    setDirectionsOpen(true);
  }, [spot?.lat, spot?.lng]);

  if (loading || !spot) {
    return (
      <div className="flex min-h-screen flex-col bg-white font-['Inter',sans-serif]">
        <AppHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-3 px-[18px] py-12 text-center text-neutral-600">
          {loading ? (
            <>
              <div
                className="h-8 w-8 animate-spin rounded-full border-2 border-[#7ea00e] border-t-transparent"
                aria-hidden
              />
              <p>Loading establishment…</p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-[#241d13]">Establishment unavailable</p>
              <p className="max-w-sm text-sm text-neutral-500">
                {placeNotFound && id
                  ? 'Establishment not found in the catalog.'
                  : 'Missing place data.'}
              </p>
              <Link to="/search" className="mt-2 text-sm font-semibold text-[#1f4f59] hover:underline">
                Go back
              </Link>
            </>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-lg flex-1 px-[18px] pb-8 pt-2 sm:pb-10">
        <div className="mb-2.5 pt-2.5">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex min-h-11 items-center gap-2.5 rounded-full pr-3 text-left transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
            aria-label="Go back"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200/80 bg-[#f3f4f6]">
              <svg
                className="h-[22px] w-[22px] text-[#241d13]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </span>
            <span className="font-['Poppins',sans-serif] text-base font-semibold text-[#241d13]">Back</span>
          </button>
        </div>

        <EstablishmentPhotoCarousel slides={photoSlides} placeName={spot.name} />

        <div className="mb-[18px] flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7ea00e]">
              About establishment
            </p>
            <h1 className="font-['Poppins',sans-serif] text-xl font-medium leading-[26px] tracking-[-0.2px] text-[#241d13]">
              {spot.name}
            </h1>
            {addressLine ? (
              <p className="mt-2 text-sm leading-5 text-[#737373]">{addressLine}</p>
            ) : null}
            <p className="mt-3">
              <span
                className="inline-block max-w-full rounded-full px-3 py-1.5 text-[11px] leading-4 text-[#3d4a06]"
                style={{ backgroundColor: 'rgba(126, 160, 14, 0.22)' }}
              >
                {categoryLabel}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveToList}
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-300 bg-white text-[#7ea00e] transition hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
            aria-label="Save place"
            title="Save place"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {!directionsOpen ? (
          <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.05)]">
            <div className="border-b border-neutral-100 bg-[#fafafa] px-5 py-6 sm:px-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">
                About this establishment
              </p>
              <p className="mt-4 whitespace-pre-line text-sm leading-[22px] tracking-[0.1px] text-[#404040]">
                {establishmentAboutBody}
              </p>
              {spot.hours?.trim() ? (
                <p className="mt-4 text-sm leading-[22px] text-[#404040]">
                  <span className="font-semibold text-[#241d13]">Hours: </span>
                  {spot.hours.trim()}
                </p>
              ) : null}
              {hasContact ? (
                <div className="mt-4 rounded-xl border border-neutral-200/90 bg-white px-4 py-3.5 text-sm text-[#404040]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#737373]">Contact</p>
                  <ul className="mt-2 space-y-2">
                    {spot.phone ? (
                      <li>
                        <span className="font-semibold text-[#241d13]">Phone: </span>
                        {spot.phone}
                      </li>
                    ) : null}
                    {spot.email ? (
                      <li>
                        <span className="font-semibold text-[#241d13]">Email: </span>
                        {spot.email}
                      </li>
                    ) : null}
                    {spot.website ? (
                      <li>
                        <span className="font-semibold text-[#241d13]">Website: </span>
                        <a
                          href={normalizeExternalUrl(spot.website)}
                          className="break-all text-[#6b8e23] underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {spot.website}
                        </a>
                      </li>
                    ) : null}
                    {spot.social_facebook ? (
                      <li>
                        <span className="font-semibold text-[#241d13]">Facebook: </span>
                        <a
                          href={normalizeExternalUrl(spot.social_facebook)}
                          className="break-all text-[#6b8e23] underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {spot.social_facebook}
                        </a>
                      </li>
                    ) : null}
                    {spot.social_instagram ? (
                      <li>
                        <span className="font-semibold text-[#241d13]">Instagram: </span>
                        <a
                          href={normalizeExternalUrl(spot.social_instagram)}
                          className="break-all text-[#6b8e23] underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {spot.social_instagram}
                        </a>
                      </li>
                    ) : null}
                    {spot.social_twitter ? (
                      <li>
                        <span className="font-semibold text-[#241d13]">X: </span>
                        <a
                          href={normalizeExternalUrl(spot.social_twitter)}
                          className="break-all text-[#6b8e23] underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {spot.social_twitter}
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          {!directionsOpen ? (
            <button
              type="button"
              onClick={openDirections}
              className="flex min-h-[54px] w-full items-center justify-center rounded-[14px] border-2 px-7 py-4 font-['Poppins',sans-serif] text-[15px] font-bold tracking-[0.08em] text-white transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ea00e] focus-visible:ring-offset-2"
              style={{ backgroundColor: TEAL, borderColor: TEAL }}
            >
              GO HERE?
            </button>
          ) : (
            <DirectionsPanel
              onClose={() => setDirectionsOpen(false)}
              destinationName={spot.name}
              destinationAddress={cleanDestAddress}
              destinationLat={spot.lat}
              destinationLng={spot.lng}
              destMunicipality={spot.city_mun}
              userCoords={userCoords}
              seedId={spot.id}
            />
          )}
        </div>
      </main>

      <SaveToListModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        itemLabel={spot.name}
        lists={existingLists}
        listNameDraft={listNameDraft}
        onListNameChange={setListNameDraft}
        onSelectList={handleSaveToExistingList}
        onCreateList={handleConfirmSaveToList}
        primaryColor={GREEN}
      />

      <SaveSuccessToast {...toastProps} />
    </div>
  );
}
