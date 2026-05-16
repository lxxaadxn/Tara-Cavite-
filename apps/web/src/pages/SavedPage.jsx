import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { readSavedLists, SAVED_LISTS_UPDATED_EVENT } from '../lib/savedPlaces';

const savedTabs = ['Saved', 'Itineraries'];
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

export function SavedPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Saved');
  const [search, setSearch] = useState('');
  const [savedLists, setSavedLists] = useState([]);
  const [expandedListId, setExpandedListId] = useState(null);

  useEffect(() => {
    const loadSavedLists = () => {
      const lists = readSavedLists().map((list) => ({
        ...list,
        name: list.name || 'My list',
        items: Array.isArray(list.items) ? list.items : [],
      }));
      setSavedLists(lists);
    };

    loadSavedLists();
    window.addEventListener(SAVED_LISTS_UPDATED_EVENT, loadSavedLists);
    window.addEventListener('focus', loadSavedLists);
    return () => {
      window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, loadSavedLists);
      window.removeEventListener('focus', loadSavedLists);
    };
  }, []);

  const visibleFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return savedLists
      .map((list) => {
        const items = list.items
          .map((item) => ({
            ...item,
            image: item.image || PLACEHOLDER_IMG,
            subtitle: item.subtitle || 'Cavite, Philippines',
          }))
          .filter((item) => {
            const isItin = item.kind === 'itinerary' || String(item.id || '').startsWith('itinerary-');
            if (activeTab === 'Saved' && isItin) return false;
            if (activeTab === 'Itineraries' && !isItin) return false;
            return (
              !q ||
              `${item.name} ${item.subtitle} ${item.establishmentTag || ''} ${list.name}`.toLowerCase().includes(q)
            );
          });
        return {
          ...list,
          items,
        };
      })
      .filter((list) => list.items.length > 0);
  }, [activeTab, savedLists, search]);

  const totalSavedResults = useMemo(
    () => visibleFolders.reduce((sum, folder) => sum + folder.items.length, 0),
    [visibleFolders]
  );

  const effectiveExpandedListId = useMemo(() => {
    if (!expandedListId) return null;
    return visibleFolders.some((folder) => (folder.id || folder.name) === expandedListId)
      ? expandedListId
      : null;
  }, [expandedListId, visibleFolders]);

  const cardRating = (seed) => (4.6 + ((seed % 5) * 0.1)).toFixed(1);
  const cardReviewCount = (seed) => 640 + ((seed * 137) % 1800);

  return (
    <div className="min-h-screen bg-[#f3f4f1] font-['Inter',sans-serif]">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-[0_10px_28px_rgba(0,0,0,0.04)] sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-[#f5f6f5] p-1">
              {savedTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className="rounded-xl px-4 py-2 text-sm font-semibold transition"
                  style={
                    activeTab === tab
                      ? { backgroundColor: '#1f2937', color: '#fff', boxShadow: '0 6px 16px rgba(17,24,39,0.16)' }
                      : { backgroundColor: 'transparent', color: '#4b5563' }
                  }
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <p className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500">
              {totalSavedResults} results
            </p>
          </div>

          <div className="mt-3 rounded-xl border border-neutral-200 bg-white px-3 py-2.5">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={activeTab === 'Itineraries' ? 'Search saved itineraries' : 'Search saved places'}
                className="w-full bg-transparent text-sm text-neutral-700 outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {visibleFolders.map((folder) => (
              <section
                key={folder.id || folder.name}
                className="rounded-2xl border border-[#dfe8d3] bg-[#f7faef] p-3.5"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedListId((prev) => (prev === (folder.id || folder.name) ? null : (folder.id || folder.name)))
                  }
                  className="mb-3 flex w-full items-center justify-between gap-2"
                >
                  <div className="inline-flex items-center gap-2.5 rounded-xl border border-[#cddcab] bg-white px-4 py-2">
                    <svg className="h-5 w-5 text-[#6f8718]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-base font-semibold text-[#5d7211]">{folder.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-neutral-500">{folder.items.length} saved</p>
                    <svg
                      className={`h-4 w-4 text-neutral-500 transition-transform ${
                        effectiveExpandedListId === (folder.id || folder.name) ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.51a.75.75 0 01-1.08 0l-4.25-4.51a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>

                {effectiveExpandedListId === (folder.id || folder.name) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {folder.items.map((card, index) => (
                      <article
                        key={`${folder.id || folder.name}-${card.id}`}
                        className="max-w-[240px] overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2.5 shadow-[0_8px_22px_rgba(0,0,0,0.05)] transition hover:shadow-md"
                      >
                        <div className="relative h-32 overflow-hidden rounded-xl bg-neutral-100">
                          <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
                        </div>

                        <div className="px-1 pb-1 pt-2.5">
                          {card.establishmentTag && (
                            <p className="mb-1.5 inline-flex rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-normal text-neutral-600">
                              {card.establishmentTag}
                            </p>
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="line-clamp-2 font-['Poppins',sans-serif] text-[18px]/[1.15] font-semibold text-neutral-900">{card.name}</h3>
                            <button
                              type="button"
                              onClick={() => {
                                const itinId = card.itineraryId || String(card.id || '').replace(/^itinerary-/, '');
                                if (card.kind === 'itinerary' || String(card.id || '').startsWith('itinerary-')) {
                                  navigate(`/itinerary/${itinId}`);
                                } else {
                                  navigate(`/place/${card.id}`);
                                }
                              }}
                              className="shrink-0 rounded-full bg-neutral-900 px-3 py-1 text-[11px] font-semibold text-white"
                            >
                              Explore
                            </button>
                          </div>

                          <p className="mt-1.5 line-clamp-1 text-[12px] text-neutral-400">
                            <svg className="-mt-0.5 mr-1 inline h-3.5 w-3.5 text-neutral-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path
                                fillRule="evenodd"
                                d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            {card.subtitle}
                          </p>

                          <p className="mt-0.5 text-[12px] text-neutral-400">
                            <span className="mr-1" style={{ color: '#f4c430' }}>★</span>
                            {cardRating(index)} ({cardReviewCount(index).toLocaleString()} Reviews)
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {visibleFolders.length === 0 && (
            <p className="py-10 text-center text-sm text-neutral-500">
              {activeTab === 'Itineraries'
                ? 'No saved itineraries yet. Save a curated route from an itinerary page.'
                : 'No saved places yet. Save a place into a list from the place page.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
