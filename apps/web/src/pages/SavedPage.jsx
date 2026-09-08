import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { SavedListEditModal } from '../components/SavedListEditModal';
import { lookupLocalEstablishmentUrls } from '../lib/establishmentLocalImages';
import { fetchPlaceReviewStats } from '../lib/placeReviews';
import { SAVED_LISTS_UPDATED_EVENT } from '../lib/savedPlaces';
import {
  createSavedListRemote,
  deleteSavedListRemote,
  fetchSavedListsForUser,
  removeItemFromListRemote,
  updateSavedListRemote,
} from '../lib/savedPlacesSupabase';
import { supabase } from '../lib/supabase';

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

function isItineraryItem(item) {
  return item?.kind === 'itinerary' || String(item?.id || '').startsWith('itinerary-');
}

function SavedEmptyState({ variant = 'global' }) {
  const isList = variant === 'list';
  const title = isList ? 'Nothing in this list yet' : 'No saved lists yet';
  const description = isList
    ? 'Save places from Search or itineraries from a route page into this collection.'
    : 'Create a list, then save places and itineraries into it.';

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-white/70 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200">
        <svg className="h-7 w-7 text-[#10A37F]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
          />
        </svg>
      </div>
      <p className="mt-4 font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm text-neutral-600">{description}</p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Link
          to="/search"
          className="inline-flex items-center justify-center rounded-xl bg-[#1B8A70] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#167a63]"
        >
          Explore spots
        </Link>
        <Link
          to="/itinerary"
          className="inline-flex items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50"
        >
          Browse itineraries
        </Link>
      </div>
    </div>
  );
}

function Skel({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

function SavedPageSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6" aria-busy="true" aria-label="Loading saved lists">
      <div className="hidden shrink-0 flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/80 lg:flex lg:w-[260px]">
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl px-3 py-2.5">
              <Skel className="h-4 w-28" />
              <Skel className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>
        <Skel className="mt-3 h-10 w-full rounded-xl" />
      </div>
      <div className="min-w-0 flex-1">
        <Skel className="mb-3 h-6 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl bg-white ring-1 ring-neutral-200/80">
              <Skel className="aspect-[4/3] w-full rounded-none" />
              <div className="space-y-2 px-3 py-2.5">
                <Skel className="h-4 w-full" />
                <Skel className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrivacyTag({ privacy }) {
  const isPublic = normalizePrivacy(privacy) === 'public';
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none ${
        isPublic
          ? 'bg-[#e8f4fc] text-[#1B8A70] ring-1 ring-[#1B8A70]/15'
          : 'bg-neutral-100 text-neutral-600 ring-1 ring-neutral-200/80'
      }`}
    >
      {privacyLabel(privacy)}
    </span>
  );
}

function IconMore(props) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden {...props}>
      <circle cx="12" cy="5" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="12" cy="19" r="1.6" />
    </svg>
  );
}

function ListMenu({ folder, onEdit, onDelete, open, onToggle, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-white hover:text-neutral-700"
        aria-label={`List actions for ${folder.name}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <IconMore />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-neutral-200"
        >
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={() => {
              onClose();
              onEdit(folder);
            }}
          >
            Rename / visibility
          </button>
          <button
            type="button"
            role="menuitem"
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            onClick={() => {
              onClose();
              onDelete(folder);
            }}
          >
            Delete list
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SavedListNav({
  folders,
  selectedKey,
  onSelect,
  onEditList,
  onDeleteList,
  onCreateList,
  menuKey,
  setMenuKey,
}) {
  return (
    <>
      <nav
        className="hidden shrink-0 flex-col overflow-hidden rounded-2xl bg-white p-3 shadow-[0_1px_0_rgba(0,0,0,0.04)] ring-1 ring-neutral-200/80 lg:flex lg:w-[260px] lg:self-stretch"
        aria-label="Collections"
      >
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto [scrollbar-width:thin]">
          {folders.map((folder) => {
            const key = folderKey(folder);
            const isActive = key === selectedKey;
            const count = folder.items.length;
            return (
              <li key={key}>
                <div
                  className={`flex items-center rounded-xl transition ${
                    isActive ? 'bg-[#10A37F]/12' : 'hover:bg-neutral-50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(key)}
                    className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span
                      className={`block truncate text-sm font-semibold ${
                        isActive ? 'text-[#146B57]' : 'text-neutral-900'
                      }`}
                    >
                      {folder.name}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-neutral-500">
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                      <PrivacyTag privacy={folder.privacy} />
                    </span>
                  </button>
                  <ListMenu
                    folder={folder}
                    open={menuKey === key}
                    onToggle={() => setMenuKey(menuKey === key ? null : key)}
                    onClose={() => setMenuKey(null)}
                    onEdit={onEditList}
                    onDelete={onDeleteList}
                  />
                </div>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={onCreateList}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#1B8A70]/35 bg-[#F7FBFA] px-3 py-2 text-sm font-semibold text-[#1B8A70] transition hover:bg-[#E7F6F1]"
        >
          <span aria-hidden>+</span> Create new list
        </button>
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
                isActive ? 'bg-[#10A37F] text-white' : 'bg-white text-neutral-700 ring-1 ring-neutral-200'
              }`}
            >
              {folder.name}
              <span className={`ml-1.5 font-normal ${isActive ? 'text-white/85' : 'text-neutral-500'}`}>
                {folder.items.length}
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onCreateList}
          className="shrink-0 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-[#1B8A70] ring-1 ring-[#1B8A70]/30"
        >
          + List
        </button>
      </div>
    </>
  );
}

function SavedItemCard({ card, onOpen, onRemove, reviewStats }) {
  const isItin = isItineraryItem(card);
  const stats = reviewStats?.[String(card.id)];
  const reviewCount = stats?.reviewCount ?? 0;
  const avgRating = stats?.avgRating;

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl bg-white text-left shadow-[0_4px_14px_rgba(22,53,46,0.05)] ring-1 ring-[#16352E]/[0.06] transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(22,53,46,0.09)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
        <img
          src={card.image}
          alt=""
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-[#E76365] shadow-sm ring-1 ring-neutral-200/80 transition hover:bg-red-50 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100"
          aria-label={`Unsave ${card.name}`}
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#16352E]">{card.name}</p>
        <p className="mt-1.5 flex items-start gap-1.5 text-xs leading-snug text-neutral-600">
          <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#39A98F]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path
              fillRule="evenodd"
              d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
              clipRule="evenodd"
            />
          </svg>
          <span className="line-clamp-1">{card.subtitle}</span>
        </p>
        {isItin ? (
          <p className="mt-1.5 text-xs font-medium text-[#1B8A70]">Itinerary</p>
        ) : reviewCount > 0 ? (
          <p className="mt-1.5 text-xs text-neutral-600">
            <span className="mr-1 text-[#f4c430]">★</span>
            {avgRating} ({reviewCount.toLocaleString()})
          </p>
        ) : null}
      </div>
    </article>
  );
}

export function SavedPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listFromUrl = searchParams.get('list');
  const [authUserId, setAuthUserId] = useState(undefined);
  const [savedLists, setSavedLists] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [selectedListKey, setSelectedListKey] = useState(null);
  const [editList, setEditList] = useState(null);
  const [editMode, setEditMode] = useState('edit');
  const [editError, setEditError] = useState('');
  const [menuKey, setMenuKey] = useState(null);
  const [reviewStats, setReviewStats] = useState({});

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setAuthUserId(data?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setAuthUserId(session?.user?.id ?? null);
    });
    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const loadSavedLists = useCallback(async () => {
    if (authUserId === undefined) return;
    if (!authUserId) {
      setSavedLists([]);
      setListsLoading(false);
      return;
    }
    setListsLoading(true);
    try {
      const lists = await fetchSavedListsForUser(authUserId);
      setSavedLists(
        lists.map((list) => ({
          ...list,
          name: list.name || 'My list',
          privacy: normalizePrivacy(list.privacy),
          items: Array.isArray(list.items) ? list.items : [],
        })),
      );
    } catch {
      setSavedLists([]);
    } finally {
      setListsLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void loadSavedLists();
    window.addEventListener(SAVED_LISTS_UPDATED_EVENT, loadSavedLists);
    window.addEventListener('focus', loadSavedLists);
    return () => {
      window.removeEventListener(SAVED_LISTS_UPDATED_EVENT, loadSavedLists);
      window.removeEventListener('focus', loadSavedLists);
    };
  }, [loadSavedLists]);

  useEffect(() => {
    let cancelled = false;
    void fetchPlaceReviewStats(supabase)
      .then((stats) => {
        if (!cancelled) setReviewStats(stats);
      })
      .catch(() => {
        if (!cancelled) setReviewStats({});
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleFolders = useMemo(() => {
    return savedLists.map((list) => {
      const items = list.items.map((item) => ({
        ...item,
        image: item.image || lookupLocalEstablishmentUrls(item.name)?.[0] || PLACEHOLDER_IMG,
        subtitle: item.subtitle || 'Cavite, Philippines',
      }));
      return { ...list, items };
    });
  }, [savedLists]);

  useEffect(() => {
    if (visibleFolders.length === 0) {
      setSelectedListKey(null);
      return;
    }
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

  const openCard = (card) => {
    const itinId = card.itineraryId || String(card.id || '').replace(/^itinerary-/, '');
    if (isItineraryItem(card)) {
      navigate(`/itinerary/${itinId}`);
    } else {
      navigate(`/place/${card.id}`);
    }
  };

  const handleRemove = (listId, card) => {
    if (!authUserId) return;
    setSavedLists((prev) =>
      prev.map((list) => {
        if (String(list.id || list.name) !== String(listId)) return list;
        return {
          ...list,
          items: (list.items ?? []).filter((item) => String(item.id) !== String(card.id)),
        };
      }),
    );
    void removeItemFromListRemote(authUserId, listId, card.id).catch(() => {
      void loadSavedLists();
    });
  };

  const handleEditList = (folder) => {
    setEditError('');
    setEditMode('edit');
    setEditList({
      id: folder.id || folder.name,
      name: folder.name,
      privacy: normalizePrivacy(folder.privacy),
    });
  };

  const handleCreateList = () => {
    setEditError('');
    setEditMode('create');
    setEditList({ name: '', privacy: 'private' });
  };

  const handleDeleteList = async (folder) => {
    if (!authUserId) return;
    const ok = window.confirm(`Delete “${folder.name}”? Saved items in this list will be removed.`);
    if (!ok) return;
    try {
      await deleteSavedListRemote(authUserId, folder.id || folder.name);
      await loadSavedLists();
    } catch {
      /* ignore */
    }
  };

  const handleSaveListModal = async (patch) => {
    if (!authUserId) return;
    try {
      if (editMode === 'create') {
        const result = await createSavedListRemote(authUserId, patch.name, patch.privacy);
        if (!result.ok) {
          setEditError(
            result.reason === 'duplicate_name'
              ? 'A list with that name already exists.'
              : 'Could not create this list. Try again.',
          );
          return;
        }
        setEditList(null);
        setEditError('');
        await loadSavedLists();
        if (result.listId) setSelectedListKey(String(result.listId));
        return;
      }
      if (!editList?.id) return;
      const result = await updateSavedListRemote(authUserId, editList.id, patch);
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
      await loadSavedLists();
    } catch {
      setEditError(
        editMode === 'create' ? 'Could not create this list. Try again.' : 'Could not update this list. Try again.',
      );
    }
  };

  const hasAnyLists = savedLists.length > 0;
  const itemCount = gridItems.length;
  const showSkeleton = authUserId === undefined || listsLoading;

  return (
    <div className="min-h-screen bg-[#F1F7F6] font-['Poppins',sans-serif] text-neutral-900">
      <AppHeader />

      <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:min-h-[calc(100dvh-72px)] lg:px-8">
        {showSkeleton ? (
          <SavedPageSkeleton />
        ) : !hasAnyLists ? (
          <div className="flex-1">
            <SavedEmptyState />
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={handleCreateList}
                className="inline-flex items-center justify-center rounded-xl border border-dashed border-[#1B8A70]/40 bg-white px-4 py-2.5 text-sm font-semibold text-[#1B8A70] transition hover:bg-[#E7F6F1]"
              >
                + Create new list
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-6">
            <SavedListNav
              folders={visibleFolders}
              selectedKey={selectedListKey}
              onSelect={setSelectedListKey}
              onEditList={handleEditList}
              onDeleteList={(folder) => void handleDeleteList(folder)}
              onCreateList={handleCreateList}
              menuKey={menuKey}
              setMenuKey={setMenuKey}
            />

            <div className="min-w-0 flex-1">
              {selectedFolder ? (
                <h2 className="mb-3 text-base font-semibold text-[#16352E] sm:text-lg">
                  {selectedFolder.name}{' '}
                  <span className="font-medium text-neutral-500">
                    ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                  </span>
                </h2>
              ) : null}

              {itemCount === 0 ? (
                <SavedEmptyState variant="list" />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {gridItems.map((card) => (
                    <SavedItemCard
                      key={`${card._listKey}-${card.id}`}
                      card={card}
                      reviewStats={reviewStats}
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
        mode={editMode}
        list={editList}
        error={editError}
        onClose={() => {
          setEditList(null);
          setEditError('');
        }}
        onSave={(patch) => void handleSaveListModal(patch)}
      />
    </div>
  );
}
