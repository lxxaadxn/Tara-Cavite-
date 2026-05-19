const SAVED_LISTS_KEY = 'cavitour:saved-place-lists:v1';
const SAVED_LISTS_UPDATED_EVENT = 'cavitour:saved-lists-updated';

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readSavedLists() {
  if (typeof window === 'undefined') return [];
  return safeParse(window.localStorage.getItem(SAVED_LISTS_KEY));
}

function writeSavedLists(lists) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SAVED_LISTS_KEY, JSON.stringify(lists));
  window.dispatchEvent(new CustomEvent(SAVED_LISTS_UPDATED_EVENT));
}

export function savePlaceToList(listName, place) {
  const cleanName = String(listName ?? '').trim();
  if (!cleanName || !place?.id) return { ok: false, reason: 'invalid_input' };

  const lists = readSavedLists();
  const nowIso = new Date().toISOString();
  const listIndex = lists.findIndex((l) => String(l.name).toLowerCase() === cleanName.toLowerCase());
  const nextPlace = {
    id: place.id,
    name: place.name ?? 'Unnamed place',
    image: place.image ?? place.imageUrl ?? '',
    subtitle: place.subtitle ?? place.address ?? 'Cavite, Philippines',
    establishmentTag: place.establishmentTag ?? '',
    savedAt: nowIso,
  };

  if (listIndex >= 0) {
    const existingList = lists[listIndex];
    const currentItems = Array.isArray(existingList.items) ? existingList.items : [];
    const existingItemIdx = currentItems.findIndex((item) => item.id === nextPlace.id);
    if (existingItemIdx >= 0) {
      currentItems[existingItemIdx] = { ...currentItems[existingItemIdx], ...nextPlace };
    } else {
      currentItems.unshift(nextPlace);
    }
    lists[listIndex] = { ...existingList, name: cleanName, items: currentItems, updatedAt: nowIso };
  } else {
    lists.unshift({
      id: `list-${Date.now()}`,
      name: cleanName,
      createdAt: nowIso,
      updatedAt: nowIso,
      items: [nextPlace],
    });
  }

  writeSavedLists(lists);
  return { ok: true };
}

/** @param {{ id: string; title?: string; image?: string; subtitle?: string }} itinerary */
export function saveItineraryToList(listName, itinerary) {
  const cleanName = String(listName ?? '').trim();
  if (!cleanName || !itinerary?.id) return { ok: false, reason: 'invalid_input' };

  const lists = readSavedLists();
  const nowIso = new Date().toISOString();
  const itemId = `itinerary-${itinerary.id}`;
  const nextItem = {
    id: itemId,
    name: itinerary.title ?? 'Itinerary',
    image: itinerary.image ?? '',
    subtitle: itinerary.subtitle ?? 'Cavite, Philippines',
    establishmentTag: 'Itinerary',
    kind: 'itinerary',
    itineraryId: String(itinerary.id),
    savedAt: nowIso,
  };

  const listIndex = lists.findIndex((l) => String(l.name).toLowerCase() === cleanName.toLowerCase());
  if (listIndex >= 0) {
    const existingList = lists[listIndex];
    const currentItems = Array.isArray(existingList.items) ? existingList.items : [];
    const existingItemIdx = currentItems.findIndex((item) => item.id === nextItem.id);
    if (existingItemIdx >= 0) {
      currentItems[existingItemIdx] = { ...currentItems[existingItemIdx], ...nextItem };
    } else {
      currentItems.unshift(nextItem);
    }
    lists[listIndex] = { ...existingList, name: cleanName, items: currentItems, updatedAt: nowIso };
  } else {
    lists.unshift({
      id: `list-${Date.now()}`,
      name: cleanName,
      createdAt: nowIso,
      updatedAt: nowIso,
      items: [nextItem],
    });
  }

  writeSavedLists(lists);
  return { ok: true };
}

/** Save a place into an existing list by id (from readSavedLists). */
export function savePlaceToListId(listId, place) {
  const id = String(listId ?? '').trim();
  if (!id || !place?.id) return { ok: false, reason: 'invalid_input' };

  const lists = readSavedLists();
  const listIndex = lists.findIndex((l) => String(l.id) === id);
  if (listIndex < 0) return { ok: false, reason: 'list_not_found' };

  const nowIso = new Date().toISOString();
  const nextPlace = {
    id: place.id,
    name: place.name ?? 'Unnamed place',
    image: place.image ?? place.imageUrl ?? '',
    subtitle: place.subtitle ?? place.address ?? 'Cavite, Philippines',
    establishmentTag: place.establishmentTag ?? '',
    savedAt: nowIso,
  };

  const existingList = lists[listIndex];
  const currentItems = Array.isArray(existingList.items) ? existingList.items : [];
  const existingItemIdx = currentItems.findIndex((item) => item.id === nextPlace.id);
  if (existingItemIdx >= 0) {
    currentItems[existingItemIdx] = { ...currentItems[existingItemIdx], ...nextPlace };
  } else {
    currentItems.unshift(nextPlace);
  }
  lists[listIndex] = { ...existingList, items: currentItems, updatedAt: nowIso };
  writeSavedLists(lists);
  return { ok: true, listName: existingList.name };
}

/** Save an itinerary into an existing list by id. */
export function saveItineraryToListId(listId, itinerary) {
  const id = String(listId ?? '').trim();
  if (!id || !itinerary?.id) return { ok: false, reason: 'invalid_input' };

  const lists = readSavedLists();
  const listIndex = lists.findIndex((l) => String(l.id) === id);
  if (listIndex < 0) return { ok: false, reason: 'list_not_found' };

  const nowIso = new Date().toISOString();
  const itemId = `itinerary-${itinerary.id}`;
  const nextItem = {
    id: itemId,
    name: itinerary.title ?? 'Itinerary',
    image: itinerary.image ?? '',
    subtitle: itinerary.subtitle ?? 'Cavite, Philippines',
    establishmentTag: 'Itinerary',
    kind: 'itinerary',
    itineraryId: String(itinerary.id),
    savedAt: nowIso,
  };

  const existingList = lists[listIndex];
  const currentItems = Array.isArray(existingList.items) ? existingList.items : [];
  const existingItemIdx = currentItems.findIndex((item) => item.id === nextItem.id);
  if (existingItemIdx >= 0) {
    currentItems[existingItemIdx] = { ...currentItems[existingItemIdx], ...nextItem };
  } else {
    currentItems.unshift(nextItem);
  }
  lists[listIndex] = { ...existingList, items: currentItems, updatedAt: nowIso };
  writeSavedLists(lists);
  return { ok: true, listName: existingList.name };
}

export function flattenSavedListsToCards(lists) {
  const cards = [];
  for (const list of lists) {
    const items = Array.isArray(list.items) ? list.items : [];
    for (const item of items) {
      cards.push({
        id: item.id,
        key: `${list.id || list.name}-${item.id}`,
        name: item.name,
        image: item.image,
        subtitle: item.subtitle,
        establishmentTag: item.establishmentTag ?? '',
        listName: list.name,
        savedAt: item.savedAt || list.updatedAt || list.createdAt || null,
        type: 'Saved',
        hasDetailPage: true,
      });
    }
  }
  cards.sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')));
  return cards;
}

export { SAVED_LISTS_UPDATED_EVENT };
