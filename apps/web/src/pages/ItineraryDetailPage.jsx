import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { PlacesLeafletMap } from '../components/PlacesLeafletMap';
import { SaveSuccessToast } from '../components/SaveSuccessToast';
import { SaveToListModal } from '../components/SaveToListModal';
import { fetchItineraryByIdOrSlug, subscribeItineraries } from 'cavitour-shared/itineraries';
import {
  buildEnrichedItinerary,
  itineraryMapPlaces,
  itineraryStopsDurationLine,
  stopMapPoint,
  stopMapsQuery,
  stopVenueName,
} from '../lib/itineraryPlaces';
import { googleMapsItineraryUrl, googleMapsPlaceUrl } from '../lib/osmUrls';
import { recordItineraryStart } from '../lib/itineraryStartsActivity';
import { fetchAllPlacesFromSupabase, logPlacesFetchError } from '../lib/placesFromSupabase';
import {
  fetchSavedListsForUser,
  saveItineraryToListIdRemote,
  saveItineraryToListRemote,
} from '../lib/savedPlacesSupabase';
import { supabase } from '../lib/supabase';
import { useSaveSuccessToast } from '../lib/useSaveSuccessToast';

const HEADER_GREEN = '#10A37F';
const TEAL = '#1B8A70';

function formatRouteLine(route, subtitle) {
  const raw = route || subtitle || '';
  return String(raw)
    .replace(/\s*->\s*/g, ' → ')
    .replace(/\s+-\s+/g, ' → ');
}

function IconChevronLeft(props) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBookmark(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path d="M6 4h12v16l-6-4-6 4V4z" strokeLinejoin="round" />
    </svg>
  );
}

export function ItineraryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [enriched, setEnriched] = useState(null);
  const [authUser, setAuthUser] = useState(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);
  const [saveListError, setSaveListError] = useState('');
  const { showSaveSuccess, toastProps } = useSaveSuccessToast();

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
    let cancelled = false;
    setLoadState('loading');
    setTemplate(null);
    setEnriched(null);
    const load = () =>
      fetchItineraryByIdOrSlug(supabase, id, { publishedOnly: true })
        .then((row) => {
          if (cancelled) return;
          setTemplate(row);
          setLoadState(row ? 'ready' : 'missing');
        })
        .catch(() => {
          if (!cancelled) {
            setTemplate(null);
            setLoadState('missing');
          }
        });
    load();
    const unsub = subscribeItineraries(supabase, () => {
      fetchItineraryByIdOrSlug(supabase, id, { publishedOnly: true })
        .then((row) => {
          if (cancelled) return;
          setTemplate(row);
          setLoadState(row ? 'ready' : 'missing');
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [id]);

  useEffect(() => {
    if (!template) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const catalog = await fetchAllPlacesFromSupabase(supabase, 2000);
        if (cancelled) return;
        setEnriched(buildEnrichedItinerary(template, catalog));
      } catch (err) {
        if (!cancelled) {
          logPlacesFetchError('ItineraryDetailPage.fetchCatalog', err);
          setEnriched(buildEnrichedItinerary(template, []));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [template]);

  const detail = enriched ?? template;

  const itinerarySavePayload = detail
    ? {
        id: String(detail.uuid || detail.id || id || '').trim(),
        title: detail.title,
        image: detail.image,
        subtitle: detail.subtitle,
      }
    : null;

  const openSave = async () => {
    if (!authUser) {
      const next = encodeURIComponent(`/itinerary/${id}`);
      navigate(`/login?next=${next}`);
      return;
    }
    setListNameDraft(detail?.tags?.[0] || 'My list');
    setExistingLists([]);
    setSaveListError('');
    setSaveOpen(true);
    try {
      const lists = await fetchSavedListsForUser(authUser.id);
      setExistingLists(lists);
    } catch {
      setExistingLists([]);
    }
  };

  const saveFailureMessage = (reason) => {
    if (reason === 'list_not_found') return 'That list is no longer available.';
    if (reason === 'invalid_input') return 'Enter a list name to save this itinerary.';
    return 'Could not save this itinerary. Try again.';
  };

  const confirmSave = async () => {
    const trimmed = String(listNameDraft ?? '').trim();
    if (!trimmed || !itinerarySavePayload || !authUser) {
      setSaveListError(saveFailureMessage('invalid_input'));
      return;
    }
    setSaveListError('');
    try {
      const result = await saveItineraryToListRemote(authUser.id, trimmed, itinerarySavePayload);
      if (result.ok) {
        showSaveSuccess(result.listName ?? trimmed, {
          variant: result.alreadySaved ? 'already' : 'saved',
        });
        setSaveOpen(false);
        return;
      }
      setSaveListError(saveFailureMessage(result.reason));
    } catch (err) {
      setSaveListError(String(err?.message ?? '').trim() || saveFailureMessage());
    }
  };

  const saveToExistingList = async (listId) => {
    if (!itinerarySavePayload || !authUser) return;
    setSaveListError('');
    try {
      const result = await saveItineraryToListIdRemote(authUser.id, listId, itinerarySavePayload);
      if (result.ok) {
        showSaveSuccess(result.listName || 'list', {
          variant: result.alreadySaved ? 'already' : 'saved',
        });
        setSaveOpen(false);
        return;
      }
      setSaveListError(saveFailureMessage(result.reason));
    } catch (err) {
      setSaveListError(String(err?.message ?? '').trim() || saveFailureMessage());
    }
  };

  if (loadState === 'loading' || (!template && loadState !== 'missing')) {
    return (
      <div className="min-h-screen bg-[#f0f2ec] font-['Poppins',sans-serif] text-neutral-900">
        <AppHeader />
        <main className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6" aria-busy="true" aria-label="Loading itinerary">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="h-10 w-28 animate-pulse rounded-full bg-neutral-200/80" />
            <div className="h-10 w-32 animate-pulse rounded-full bg-neutral-200/80" />
          </div>
          <section className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_32px_rgba(27,138,112,0.08)]">
            <div className="grid min-h-0 lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.15fr)]">
              <div className="aspect-[16/10] min-h-[200px] animate-pulse bg-neutral-200/80 lg:aspect-auto lg:min-h-[300px]" />
              <div className="flex flex-col justify-center gap-3 p-6 sm:p-8 lg:p-10">
                <div className="h-6 w-28 animate-pulse rounded-full bg-neutral-200/80" />
                <div className="h-9 w-72 max-w-full animate-pulse rounded-lg bg-neutral-200/80" />
                <div className="h-5 w-48 animate-pulse rounded-lg bg-neutral-200/80" />
                <div className="mt-2 flex gap-1.5">
                  <div className="h-6 w-16 animate-pulse rounded-full bg-neutral-200/80" />
                  <div className="h-6 w-20 animate-pulse rounded-full bg-neutral-200/80" />
                </div>
              </div>
            </div>
          </section>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200/80" />
            <div className="h-64 animate-pulse rounded-2xl bg-white ring-1 ring-neutral-200/80" />
          </div>
        </main>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[#f0f2ec] font-['Poppins',sans-serif] text-neutral-900">
        <AppHeader />
        <main className="mx-auto flex max-w-[1440px] flex-col items-center px-4 py-20 text-center sm:px-8">
          <h2 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">Not found</h2>
          <p className="mt-2 max-w-md text-sm text-neutral-600">This itinerary is no longer available.</p>
          <Link
            to="/itinerary"
            className="mt-8 rounded-full px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-95"
            style={{ backgroundColor: TEAL }}
          >
            Back to itineraries
          </Link>
        </main>
      </div>
    );
  }

  const stops = detail.stopList || [];
  const mapPlaces = itineraryMapPlaces(stops);
  const startItineraryUrl = googleMapsItineraryUrl(mapPlaces);
  const metaLine = itineraryStopsDurationLine(detail);

  const onStartItinerary = () => {
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data?.user?.id;
        const itinId = String(detail.id || template?.id || id || '').trim();
        if (uid && itinId) {
          recordItineraryStart(uid, { id: itinId, title: detail.title });
        }
      } catch {
        /* best-effort local tracking */
      }
    })();
  };

  return (
    <div className="min-h-screen bg-[#f0f2ec] font-['Poppins',sans-serif] text-neutral-900">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/itinerary"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200/90 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
            aria-label="Back to itineraries"
          >
            <IconChevronLeft className="text-neutral-500" />
            Itineraries
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => void openSave()}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(27, 138, 112,0.25)] transition hover:shadow-[0_8px_24px_rgba(27, 138, 112,0.32)]"
              style={{ backgroundColor: TEAL }}
            >
              <IconBookmark className="opacity-90" />
              Save to list
            </button>
          </div>
        </div>

        {/* Split hero — image + copy side by side on large screens */}
        <section className="overflow-hidden rounded-3xl bg-white shadow-[0_8px_32px_rgba(27,138,112,0.08)]">
          <div className="grid min-h-0 lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.15fr)]">
            <div className="relative aspect-[16/10] min-h-[200px] lg:aspect-auto lg:min-h-[300px]">
              <img src={detail.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/20" aria-hidden />
            </div>
            <div className="flex flex-col justify-center bg-gradient-to-br from-[#F1F7F6] via-[#F1F7F6] to-[#AACBC4] p-6 sm:p-8 lg:p-10 xl:p-12">
              {!!metaLine && (
                <span className="mb-3 w-fit rounded-full bg-[#1B8A70] px-3 py-1.5 text-xs font-semibold text-white">
                  {metaLine}
                </span>
              )}
              <h1 className="font-['Poppins',sans-serif] text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl lg:text-4xl">
                {detail.title}
              </h1>
              <p className="mt-3 text-base font-medium text-neutral-600 sm:text-lg">
                {formatRouteLine(detail.route, detail.subtitle)}
              </p>
              {!!detail.tags?.length && (
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {detail.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[color-mix(in_srgb,#10A37F_16%,white)] px-2.5 py-0.5 text-[11px] font-semibold text-[#10A37F]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-12 lg:gap-8">
          <div className="order-2 lg:order-1 lg:col-span-8">
            {!!stops.length && (
              <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                <div className="mb-6 border-b border-neutral-100 pb-4">
                  <h2 className="font-['Poppins',sans-serif] text-xl font-bold text-neutral-900 sm:text-2xl">Route & stops</h2>
                  <p className="mt-1 text-sm text-neutral-500">Follow in order — each stop builds on the last.</p>
                </div>
                <div className="relative">
                  <div
                    className="absolute left-[13px] top-4 bottom-4 w-px bg-gradient-to-b from-[#AACBC4] via-[#10A37F]/40 to-[#AACBC4] sm:left-[15px]"
                    aria-hidden
                  />
                  <ol className="relative space-y-0">
                    {stops.map((stop, index) => (
                      <li key={`${stop.name}-${index}`} className="relative pb-8 last:pb-0">
                        <div className="flex gap-4 sm:gap-5">
                          <div className="relative z-[1] flex shrink-0 flex-col items-center pt-0.5">
                            <span
                              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ring-4 ring-white sm:h-9 sm:w-9"
                              style={{ backgroundColor: HEADER_GREEN }}
                            >
                              {index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <h3 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
                              {stopVenueName(stop) || stop.name || 'Stop'}
                            </h3>
                            {(stop.timeWindow || stop.durationHint) && (
                              <p className="mt-1.5 text-sm font-medium text-neutral-600">
                                {[stop.timeWindow, stop.durationHint].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            {(stop.costType || stop.expectTag) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {stop.costType ? (
                                  <span className="rounded-full bg-[var(--ct-pale-green)] px-2.5 py-0.5 text-[11px] font-medium text-[#10A37F]">
                                    {stop.costType}
                                  </span>
                                ) : null}
                                {stop.expectTag ? (
                                  <span className="rounded-full bg-[var(--ct-pale-green)] px-2.5 py-0.5 text-[11px] font-medium text-[#10A37F]">
                                    {stop.expectTag}
                                  </span>
                                ) : null}
                              </div>
                            )}
                            {(() => {
                              const point = stopMapPoint(stop, index);
                              const mapsUrl = googleMapsPlaceUrl(
                                point?.lat,
                                point?.lng,
                                stopMapsQuery(stop)
                              );
                              return (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {mapsUrl ? (
                                    <a
                                      href={mapsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center justify-center rounded-full bg-[#10A37F] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#168F7A]"
                                    >
                                      Open in Google Maps
                                    </a>
                                  ) : null}
                                  {stop.place?.id ? (
                                    <Link
                                      to={`/place/${stop.place.id}`}
                                      className="inline-flex items-center justify-center rounded-full border border-[#AACBC4] bg-white px-4 py-2 text-xs font-semibold text-[#1B8A70] transition hover:bg-[#F1F7F6]"
                                    >
                                      View in app
                                    </Link>
                                  ) : null}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}
          </div>

          <aside className="order-1 lg:order-2 lg:col-span-4 lg:self-start xl:sticky xl:top-24">
            {mapPlaces.length ? (
              <div className="relative min-h-[480px] overflow-hidden rounded-3xl bg-white shadow-sm">
                <PlacesLeafletMap
                  places={mapPlaces}
                  userLocation={null}
                  onMarkerClick={(place) => {
                    if (place?.id && !String(place.id).startsWith('stop-')) {
                      navigate(`/place/${place.id}`);
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-3xl bg-white px-6 py-10 text-center shadow-sm">
                <p className="text-sm text-neutral-500">Map loads when locations are available</p>
              </div>
            )}
            {startItineraryUrl ? (
              <a
                href={startItineraryUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onStartItinerary}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-bold text-white shadow-[0_6px_20px_rgba(27,138,112,0.25)] transition hover:opacity-95 hover:shadow-[0_8px_24px_rgba(27,138,112,0.32)]"
                style={{ backgroundColor: TEAL }}
              >
                Start itinerary
              </a>
            ) : null}
          </aside>
        </div>
      </main>

      <SaveToListModal
        open={saveOpen}
        onClose={() => {
          setSaveOpen(false);
          setSaveListError('');
        }}
        title="Save itinerary"
        itemLabel={detail.title}
        lists={existingLists}
        listNameDraft={listNameDraft}
        onListNameChange={(value) => {
          setListNameDraft(value);
          setSaveListError('');
        }}
        onSelectList={(listId) => void saveToExistingList(listId)}
        onCreateList={() => void confirmSave()}
        primaryColor={TEAL}
        countLabel="items"
      />
      {saveListError ? (
        <div className="fixed bottom-4 left-1/2 z-[1300] max-w-md -translate-x-1/2 rounded-xl bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg">
          {saveListError}
        </div>
      ) : null}
      <SaveSuccessToast {...toastProps} />
    </div>
  );
}
