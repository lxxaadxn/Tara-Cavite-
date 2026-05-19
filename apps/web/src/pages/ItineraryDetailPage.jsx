import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { publishedItineraries } from '../data/mockItineraries';
import { readSavedLists, saveItineraryToList, saveItineraryToListId } from '../lib/savedPlaces';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';

function formatSubtitle(s) {
  return String(s ?? '')
    .replace(/\s*->\s*/g, ' → ')
    .replace(/\s*-\s*/g, ' → ');
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

function IconCheck(props) {
  return (
    <svg
      className="text-[#7EA00E]"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      aria-hidden
      {...props}
    >
      <path d="M5 12l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconPin(props) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[#1f4f59]/50" aria-hidden {...props}>
      <path d="M12 21s7-4.35 7-11a7 7 0 10-14 0c0 6.65 7 11 7 11z" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ItineraryDetailPage() {
  const { id } = useParams();
  const detail = publishedItineraries.find((itinerary) => itinerary.id === id);
  const [saveOpen, setSaveOpen] = useState(false);
  const [listNameDraft, setListNameDraft] = useState('');
  const [existingLists, setExistingLists] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');

  const openSave = () => {
    setListNameDraft(detail?.tags?.[0] || 'My list');
    setExistingLists(readSavedLists());
    setSaveOpen(true);
  };

  const confirmSave = () => {
    if (!detail) return;
    const trimmed = String(listNameDraft ?? '').trim();
    if (!trimmed) return;
    const result = saveItineraryToList(trimmed, {
      id: detail.id,
      title: detail.title,
      image: detail.image,
      subtitle: detail.subtitle,
    });
    if (result.ok) {
      setSaveStatus(`Saved to “${trimmed}”`);
      window.setTimeout(() => setSaveStatus(''), 2800);
      setSaveOpen(false);
    }
  };

  const saveToExistingList = (listId) => {
    if (!detail) return;
    const result = saveItineraryToListId(listId, {
      id: detail.id,
      title: detail.title,
      image: detail.image,
      subtitle: detail.subtitle,
    });
    if (result.ok) {
      const label = result.listName || 'list';
      setSaveStatus(`Saved to “${label}”`);
      window.setTimeout(() => setSaveStatus(''), 2800);
      setSaveOpen(false);
    }
  };

  if (!detail) {
    return (
      <div className="min-h-screen bg-[#f0f2ec] font-['Inter',sans-serif] text-neutral-900">
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

  const linkedPlaces = (detail.stopList || [])
    .map((stop) => stop.place)
    .filter(Boolean)
    .filter((place, index, list) => list.findIndex((x) => x.name === place.name && x.address === place.address) === index);

  const stops = detail.stopList || [];

  return (
    <div className="min-h-screen bg-[#f0f2ec] font-['Inter',sans-serif] text-neutral-900">
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
            {saveStatus ? (
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80">
                {saveStatus}
              </span>
            ) : null}
            <button
              type="button"
              onClick={openSave}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-[0_6px_20px_rgba(31,79,89,0.25)] transition hover:shadow-[0_8px_24px_rgba(31,79,89,0.32)]"
              style={{ backgroundColor: TEAL }}
            >
              <IconBookmark className="opacity-90" />
              Save to list
            </button>
          </div>
        </div>

        {/* Split hero — uses width; image + copy side by side on large screens */}
        <section className="overflow-hidden rounded-3xl border border-[#dfe8d3] bg-white shadow-[0_8px_32px_rgba(31,79,89,0.08)]">
          <div className="grid min-h-0 lg:grid-cols-[minmax(260px,1fr)_minmax(0,1.15fr)]">
            <div className="relative aspect-[16/10] min-h-[200px] lg:aspect-auto lg:min-h-[300px]">
              <img src={detail.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-black/20" aria-hidden />
            </div>
            <div className="flex flex-col justify-center bg-gradient-to-br from-[#fbfcf7] via-[#f7faef] to-[#e8efd8] p-6 sm:p-8 lg:p-10 xl:p-12">
              {!!detail.tags?.length && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {detail.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[#cfe0b0] bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#3d5210]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="font-['Poppins',sans-serif] text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl lg:text-4xl">
                {detail.title}
              </h1>
              <p className="mt-3 text-base text-neutral-600 sm:text-lg">{formatSubtitle(detail.subtitle)}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {!!detail.stops && (
                  <span className="rounded-full bg-[#1f4f59] px-3 py-1.5 text-xs font-semibold text-white">
                    {detail.stops} stops
                  </span>
                )}
                {!!detail.durationLabel && (
                  <span className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700">
                    {detail.durationLabel}
                  </span>
                )}
                {!!detail.bestTime && (
                  <span className="rounded-full border border-neutral-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-600">
                    {detail.bestTime}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-12 lg:gap-8">
          {/* Main column: route timeline */}
          <div className="order-2 lg:order-1 lg:col-span-8">
            {!!stops.length && (
              <section className="rounded-3xl border border-[rgba(31,79,89,0.1)] bg-white p-5 shadow-sm sm:p-6 lg:p-8">
                <div className="mb-6 border-b border-neutral-100 pb-4">
                  <h2 className="font-['Poppins',sans-serif] text-xl font-bold text-neutral-900 sm:text-2xl">Route & stops</h2>
                  <p className="mt-1 text-sm text-neutral-500">Follow in order — each stop builds on the last.</p>
                </div>
                <div className="relative">
                  <div
                    className="absolute left-[13px] top-4 bottom-4 w-px bg-gradient-to-b from-[#cfe8a8] via-[#7ea00e]/40 to-[#dfe8d3] sm:left-[15px]"
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
                            <h3 className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">{stop.name}</h3>
                            <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">{stop.description}</p>
                            {!!stop.leg && (
                              <div className="mt-3 flex gap-2 rounded-xl border border-[#dfe8d3] bg-[#f7faef] px-3 py-2.5 text-sm text-[#1F4F59]">
                                <span className="shrink-0 font-semibold text-[#7EA00E]" aria-hidden>
                                  ↳
                                </span>
                                <span>{stop.leg}</span>
                              </div>
                            )}
                            {!!stop.place && (
                              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50/80 p-3 transition hover:border-[#cfe0b0] hover:bg-[#fbfcf7]">
                                {stop.place.image ? (
                                  <img
                                    src={stop.place.image}
                                    alt=""
                                    className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-16 sm:w-16"
                                  />
                                ) : (
                                  <div
                                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl sm:h-16 sm:w-16"
                                    style={{ backgroundColor: 'rgba(31,79,89,0.08)' }}
                                    aria-hidden
                                  >
                                    <IconPin />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: HEADER_GREEN }}>
                                    Featured spot
                                  </p>
                                  <p className="line-clamp-2 font-medium text-neutral-900">{stop.place.name}</p>
                                  {!!stop.place.address && (
                                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{stop.place.address}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar: overview, tips, places */}
          <aside className="order-1 space-y-4 lg:order-2 lg:col-span-4 lg:space-y-5 lg:self-start xl:sticky xl:top-24">
            {!!detail.summary && (
              <section className="rounded-3xl border border-[rgba(31,79,89,0.1)] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-['Poppins',sans-serif] text-lg font-bold text-neutral-900">Overview</h2>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{detail.summary}</p>
                {!!detail.highlights?.length && (
                  <ul className="mt-5 space-y-3 border-t border-neutral-100 pt-5">
                    {detail.highlights.map((highlight) => (
                      <li key={highlight} className="flex gap-3 text-sm leading-snug text-neutral-800">
                        <span className="mt-0.5 shrink-0">
                          <IconCheck />
                        </span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {!!detail.tips?.length && (
              <section className="rounded-3xl border border-[rgba(31,79,89,0.1)] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-['Poppins',sans-serif] text-lg font-bold text-neutral-900">Tips</h2>
                <ul className="mt-4 space-y-2.5">
                  {detail.tips.map((tip) => (
                    <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-neutral-700">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: HEADER_GREEN }} aria-hidden />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!!linkedPlaces.length && (
              <section className="rounded-3xl border border-[rgba(31,79,89,0.1)] bg-white p-5 shadow-sm sm:p-6">
                <h2 className="font-['Poppins',sans-serif] text-lg font-bold text-neutral-900">Places on this route</h2>
                <p className="mt-1 text-xs text-neutral-500">Quick list of named stops with addresses.</p>
                <ul className="mt-4 divide-y divide-neutral-100">
                  {linkedPlaces.map((place) => (
                    <li key={`${place.name}-${place.address}`} className="flex items-start gap-3 py-3 first:pt-0">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#7ea00e]/70" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-900">{place.name}</p>
                        {!!place.address && <p className="mt-0.5 text-xs text-neutral-500">{place.address}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </main>

      {saveOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-2xl">
            <p className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Save itinerary to list</p>
            <p className="mt-1 text-sm text-neutral-600">Pick an existing list or create a new one.</p>
            {existingLists.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Your lists</p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-neutral-100 bg-neutral-50 p-2">
                  {existingLists.map((l) => (
                    <li key={l.id || l.name}>
                      <button
                        type="button"
                        onClick={() => saveToExistingList(l.id)}
                        className="w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-neutral-800 transition hover:bg-white"
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
            <label className="mt-5 block text-xs font-semibold text-neutral-600" htmlFor="itin-list-name">
              New list name
            </label>
            <input
              id="itin-list-name"
              value={listNameDraft}
              onChange={(e) => setListNameDraft(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
            />
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSave}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: TEAL }}
              >
                Save to new list
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
