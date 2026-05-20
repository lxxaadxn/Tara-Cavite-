import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { SavedListEditModal } from '../components/SavedListEditModal';
import {
  readSavedLists,
  removeItemFromList,
  updateSavedList,
  SAVED_LISTS_UPDATED_EVENT,
} from '../lib/savedPlaces';

const savedTabs = ['Saved', 'Itineraries'];
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

function folderKey(folder) {
  return String(folder.id || folder.name);
}

function normalizePrivacy(value) {
  return value === 'public' ? 'public' : 'private';
}

function privacyLabel(value) {
  return normalizePrivacy(value) === 'public' ? 'Public' : 'Private';
}

function savedCardSeed(id) {
  let h = 0;
  const s = String(id ?? '');
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function cardRating(seed) {
  return (4.6 + ((seed % 5) * 0.1)).toFixed(1);
}

function cardReviewCount(seed) {
  return 640 + ((seed * 137) % 1800);
}

function SavedEmptyState({ activeTab, variant = 'global' }) {
  const isItineraries = activeTab === 'Itineraries';
  const isList = variant === 'list';

  let title = isItineraries ? 'No saved itineraries' : 'No saved places yet';
  let description = isItineraries
    ? 'Save a curated route from an itinerary page to see it here.'
    : 'Browse Search and tap the heart on any place to add it to a list.';

  if (isList) {
    title = isItineraries ? 'No itineraries in this list' : 'No places in this list';
    description = isItineraries
      ? 'This collection has no saved routes for the Itineraries tab.'
      : 'This collection has no saved places for the Saved tab.';
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/60 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <svg className="h-7 w-7 text-[#7EA00E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </div>
      <p className="mt-4 font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-neutral-600">{description}</p>
    </div>
  );
}

function PrivacyTag({ privacy }) {
  const isPublic = normalizePrivacy(privacy) === 'public';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
        isPublic ? 'bg-[#e8f4fc] text-[#1f4f59] ring-1 ring-[#1f4f59]/15' : 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200/80'
      }`}
    >
      {privacyLabel(privacy)}
    </span>
  );
}

function IconPencil(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function SavedListNav({ folders, selectedKey, onSelect, onEditList }) {
  return (
    <>
      <nav className="hidden shrink-0 lg:block lg:w-[300px]" aria-label="Collections">
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">Your lists</p>
        <ul className="max-h-[min(70vh,640px)] space-y-0.5 overflow-y-auto rounded-xl border border-neutral-200/80 bg-white p-1.5 shadow-sm">
          {folders.map((folder) => {
            const key = folderKey(folder);
            const isActive = key === selectedKey;
            const count = folder.items.length;
            return (
              <li key={key}>
                <div
                  className={`flex items-center rounded-lg transition ${
                    isActive ? 'bg-[#7EA00E]/10' : 'hover:bg-neutral-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(key)}
                    className="min-w-0 flex-1 px-3 py-3 text-left"
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span
                      className={`block truncate text-sm font-semibold ${
                        isActive ? 'text-[#3d5210]' : 'text-neutral-900'
                      }`}
                    >
                      {folder.name}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-neutral-500">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                      <PrivacyTag privacy={folder.privacy} />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onEditList(folder)}
                    className="shrink-0 px-2.5 py-3 text-neutral-400 transition hover:text-neutral-700"
                    aria-label={`Edit ${folder.name}`}
                  >
                    <IconPencil />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden" role="tablist" aria-label="Collections">
        {folders.map((folder) => {
          const key = folderKey(folder);
          const isActive = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onSelect(key)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-[#7EA00E] text-white' : 'bg-white text-neutral-700 ring-1 ring-neutral-200'
              }`}
            >
              {folder.name}
              <span className={`ml-1.5 font-normal ${isActive ? 'text-white/85' : 'text-neutral-500'}`}>
                {folder.items.length}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function SavedItemCard({ card, onOpen, onRemove }) {
  const isItin = card.kind === 'itinerary' || String(card.id || '').startsWith('itinerary-');
  const seed = savedCardSeed(card.id);
  const rating = cardRating(seed);
  const reviewCount = cardReviewCount(seed);
  const tagLabel = isItin ? 'Itinerary' : card.establishmentTag || '';

  return (
    <article className="group flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 sm:min-h-[280px] sm:p-2.5">
      <div className="relative overflow-hidden rounded-xl bg-neutral-100">
        <img src={card.image} alt="" className="h-36 w-full object-cover sm:h-40" />
        {tagLabel ? (
          <span
            className={`absolute bottom-2 left-2 max-w-[85%] truncate rounded-full px-2.5 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-sm ${
              isItin
                ? 'bg-[#7EA00E]/90 font-semibold uppercase tracking-wide text-white'
                : 'bg-white/95 text-neutral-700'
            }`}
          >
            {tagLabel}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-neutral-500 opacity-0 shadow-sm ring-1 ring-neutral-200/80 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
          aria-label={`Remove ${card.name}`}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-2">
        <p className="line-clamp-2 font-['Poppins',sans-serif] text-sm font-semibold text-neutral-900">{card.name}</p>

        <div className="mt-auto space-y-2 pt-3">
          <p className="line-clamp-2 text-[11px] text-neutral-500">
            <svg className="-mt-0.5 mr-1 inline h-3.5 w-3.5 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path
                fillRule="evenodd"
                d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
            {card.subtitle}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-0.5 text-[11px] text-neutral-400">
              <svg className="h-3 w-3 shrink-0 text-[#f4c430]" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {rating} ({reviewCount.toLocaleString()} Reviews)
            </p>
            <button
              type="button"
              onClick={onOpen}
              className="shrink-0 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
            >
              See more
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function SavedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listFromUrl = searchParams.get('list');
  const [activeTab, setActiveTab] = useState('Saved');
  const [savedLists, setSavedLists] = useState([]);
  const [selectedListKey, setSelectedListKey] = useState(null);
  const [editList, setEditList] = useState(null);
  const [editError, setEditError] = useState('');

  const loadSavedLists = useCallback(() => {
    const lists = readSavedLists().map((list) => ({
      ...list,
      name: list.name || 'My list',
      privacy: normalizePrivacy(list.privacy),
      items: Array.isArray(list.items) ? list.items : [],
    }));
    setSavedLists(lists);
  }, []);

  useEffect(() => {
    loadSavedLists();
    window.addEventListener(SAVED_LISTS_UPDATED_EVENT, loadSavedLists);
    window.addEventListener('focus', loadSavedLists);
    return () => {
      window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, loadSavedLists);
      window.removeEventListener('focus', loadSavedLists);
    };
  }, [loadSavedLists]);

  const visibleFolders = useMemo(() => {
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
            return true;
          });
        return { ...list, items };
      })
      .filter((list) => list.items.length > 0);
  }, [activeTab, savedLists]);

  useEffect(() => {
    if (visibleFolders.length === 0) return;
    const keys = visibleFolders.map(folderKey);
    if (listFromUrl) {
      const match = visibleFolders.find(
        (f) => String(f.id) === listFromUrl || String(f.name) === listFromUrl,
      );
      if (match) {
        const key = folderKey(match);
        if (keys.includes(key)) {
          setSelectedListKey(key);
          return;
        }
      }
    }
    if (!selectedListKey || !keys.includes(selectedListKey)) {
      setSelectedListKey(keys[0]);
    }
  }, [visibleFolders, selectedListKey, listFromUrl]);

  const selectedFolder = useMemo(
    () => visibleFolders.find((f) => folderKey(f) === selectedListKey) ?? null,
    [visibleFolders, selectedListKey],
  );

  const gridItems = useMemo(() => {
    if (!selectedFolder) return [];
    return selectedFolder.items.map((item) => ({
      ...item,
      _listKey: folderKey(selectedFolder),
      _listId: selectedFolder.id || selectedFolder.name,
      _listName: selectedFolder.name,
    }));
  }, [selectedFolder]);

  const totalSavedResults = useMemo(
    () => visibleFolders.reduce((sum, folder) => sum + folder.items.length, 0),
    [visibleFolders],
  );

  const openCard = (card) => {
    const itinId = card.itineraryId || String(card.id || '').replace(/^itinerary-/, '');
    if (card.kind === 'itinerary' || String(card.id || '').startsWith('itinerary-')) {
      navigate(`/itinerary/${itinId}`);
    } else {
      navigate(`/place/${card.id}`);
    }
  };

  const handleRemove = (listId, card) => {
    removeItemFromList(listId, card.id);
  };

  const handleEditList = (folder) => {
    setEditError('');
    setEditList({
      id: folder.id || folder.name,
      name: folder.name,
      privacy: normalizePrivacy(folder.privacy),
    });
  };

  const handleSaveListEdit = (patch) => {
    if (!editList?.id) return;
    const result = updateSavedList(editList.id, patch);
    if (!result.ok) {
      setEditError(
        result.reason === 'duplicate_name'
          ? 'A list with that name already exists.'
          : 'Could not update this list. Try again.',
      );
      return;
    }
    setEditList(null);
    setEditError('');
    loadSavedLists();
  };

  return (
    <div className="min-h-screen bg-[#efefec] font-['Inter',sans-serif] text-neutral-900">
      <AppHeader />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/80 p-1 ring-1 ring-neutral-200/80">
            {savedTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? 'bg-neutral-900 text-white shadow-[0_6px_16px_rgba(17,24,39,0.16)]'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-neutral-500">
            {totalSavedResults} {totalSavedResults === 1 ? 'result' : 'results'}
          </p>
        </div>

        {visibleFolders.length === 0 ? (
          <div className="mt-6">
            <SavedEmptyState activeTab={activeTab} />
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:gap-6">
            <SavedListNav
              folders={visibleFolders}
              selectedKey={selectedListKey}
              onSelect={setSelectedListKey}
              onEditList={handleEditList}
            />

            <div className="min-w-0 flex-1">
              {gridItems.length === 0 ? (
                <SavedEmptyState activeTab={activeTab} variant="list" />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {gridItems.map((card) => (
                    <SavedItemCard
                      key={`${card._listKey}-${card.id}`}
                      card={card}
                      onOpen={() => openCard(card)}
                      onRemove={() => handleRemove(card._listId, card)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <SavedListEditModal
        open={Boolean(editList)}
        list={editList}
        error={editError}
        onClose={() => {
          setEditList(null);
          setEditError('');
        }}
        onSave={handleSaveListEdit}
      />
    </div>
  );
}



