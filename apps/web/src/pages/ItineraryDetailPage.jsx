import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { publishedItineraries } from '../data/mockItineraries';
import { readSavedLists, saveItineraryToList, saveItineraryToListId } from '../lib/savedPlaces';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';

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
      <div className="min-h-screen bg-[#f4f6ec] font-['Inter',sans-serif] text-neutral-900">
        <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <h2 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">Not found</h2>
          <p className="mt-2 text-sm text-neutral-600">This itinerary is no longer available.</p>
          <Link to="/itinerary" className="mt-6 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: TEAL }}>
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

  return (
    <div className="min-h-screen bg-[#f4f6ec] font-['Inter',sans-serif] text-neutral-900">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Link to="/itinerary" className="rounded-full p-2 text-neutral-700 transition hover:bg-white" aria-label="Go back to itineraries">
            <span aria-hidden>←</span>
          </Link>
          <div className="flex items-center gap-2">
            {saveStatus ? <span className="text-xs font-medium text-emerald-700">{saveStatus}</span> : null}
            <button
              type="button"
              onClick={openSave}
              className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-semibold text-neutral-800 transition hover:bg-neutral-50"
            >
              Save to list
            </button>
          </div>
        </div>
        <section className="overflow-hidden rounded-[20px] border border-[rgba(31,79,89,0.08)] bg-white shadow-[0_8px_24px_rgba(31,79,89,0.10)]">
          <div className="relative h-[240px] sm:h-[280px]">
            <img src={detail.image} alt={detail.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/45 p-4 text-white sm:p-5">
              <div className="flex h-full flex-col justify-end">
                {!!detail.tags?.length && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {detail.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#241D13]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="font-['Poppins',sans-serif] text-[24px] font-bold leading-tight">{detail.title}</h2>
                <p className="mt-1 text-sm text-white/90">{detail.subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!!detail.stops && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">{detail.stops} stops</span>}
                  {!!detail.durationLabel && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">{detail.durationLabel}</span>}
                  {!!detail.bestTime && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">{detail.bestTime}</span>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {!!detail.summary && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Overview</h3>
            <p className="mt-2 text-sm leading-6 text-[#7A7878]">{detail.summary}</p>
            {!!detail.highlights?.length && (
              <div className="mt-4 space-y-2">
                {detail.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-2 text-sm leading-5 text-[#241D13]">
                    <span className="mt-0.5 font-bold text-[#7EA00E]">✓</span>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!!detail.stopList?.length && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Route & stops</h3>
            <div className="mt-3">
              {detail.stopList.map((stop, index) => (
                <div key={`${stop.name}-${index}`} className="pb-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: HEADER_GREEN }}>
                      {index + 1}
                    </span>
                    <p className="font-['Poppins',sans-serif] text-base font-bold text-[#241D13]">{stop.name}</p>
                  </div>
                  <p className="ml-10 mt-2 text-sm leading-5 text-[#7A7878]">{stop.description}</p>
                  {!!stop.leg && (
                    <div className="ml-10 mt-2 rounded-lg bg-[#f4f6ec] p-2.5 text-sm text-[#1F4F59]">
                      <span aria-hidden className="mr-1">➜</span>
                      {stop.leg}
                    </div>
                  )}
                  {!!stop.place && (
                    <div className="ml-10 mt-2 flex items-center gap-3 rounded-xl border border-[rgba(31,79,89,0.1)] bg-[#f4f6ec] p-2.5">
                      {stop.place.image ? (
                        <img src={stop.place.image} alt={stop.place.name} className="h-[52px] w-[52px] rounded-[10px] object-cover" />
                      ) : (
                        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[rgba(31,79,89,0.08)] text-lg">🏢</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#7EA00E]">Featured spot</p>
                        <p className="line-clamp-2 text-sm font-medium text-[#241D13]">{stop.place.name}</p>
                        {!!stop.place.address && <p className="line-clamp-2 text-xs text-[#7A7878]">{stop.place.address}</p>}
                      </div>
                      <span className="text-[#7A7878]">›</span>
                    </div>
                  )}
                  {index < detail.stopList.length - 1 && <div className="ml-10 mt-4 h-px bg-[rgba(31,79,89,0.12)]" />}
                </div>
              ))}
            </div>
          </section>
        )}

        {!!detail.tips?.length && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Tips</h3>
            <div className="mt-2 space-y-1.5">
              {detail.tips.map((tip) => (
                <div key={tip} className="flex items-start gap-2 text-sm text-[#241D13]">
                  <span className="text-base leading-none text-[#7EA00E]">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!!linkedPlaces.length && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Places in this route</h3>
            <p className="mt-1 text-xs text-[#7A7878]">Tap to open details and directions.</p>
            <div className="mt-2">
              {linkedPlaces.map((place) => (
                <div key={`${place.name}-${place.address}`} className="flex items-center gap-3 border-t border-[rgba(31,79,89,0.12)] py-3">
                  <span className="text-lg text-[#1F4F59]">🏢</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-[#241D13]">{place.name}</p>
                    {!!place.address && <p className="line-clamp-2 text-xs text-[#7A7878]">{place.address}</p>}
                  </div>
                  <span className="text-[#7A7878]">›</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {saveOpen ? (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
            <p className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">Save itinerary to list</p>
            <p className="mt-1 text-sm text-neutral-600">Pick an existing list or create a new one.</p>
            {existingLists.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold text-neutral-600">Your lists</p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-neutral-100 bg-neutral-50 p-2">
                  {existingLists.map((l) => (
                    <li key={l.id || l.name}>
                      <button
                        type="button"
                        onClick={() => saveToExistingList(l.id)}
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
            <label className="mt-4 block text-xs font-semibold text-neutral-600" htmlFor="itin-list-name">
              New list name
            </label>
            <input
              id="itin-list-name"
              value={listNameDraft}
              onChange={(e) => setListNameDraft(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="rounded-xl border border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSave}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
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
