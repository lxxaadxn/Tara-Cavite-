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

export function isItinerarySavedItem(item) {
  return item?.kind === 'itinerary' || String(item?.id ?? '').startsWith('itinerary-');
}

/** Lists eligible when saving an itinerary (itinerary-only or empty itinerary lists). */
export function readItinerarySavedLists() {
  return readSavedLists()
    .filter((list) => {
      const items = Array.isArray(list.items) ? list.items : [];
      if (items.length === 0) return list.listKind === 'itinerary';
      return items.every(isItinerarySavedItem);
    })
    .map((list) => {
      const items = Array.isArray(list.items) ? list.items : [];
      return {
        ...list,
        items: items.filter(isItinerarySavedItem),
      };
    });
}

/** Lists the user marked public (shown on profile). */
export function readPublicSavedLists() {
  return readSavedLists()
    .map((list) => ({
      ...list,
      name: list.name || 'My list',
      privacy: list.privacy === 'public' ? 'public' : 'private',
      items: Array.isArray(list.items) ? list.items : [],
    }))
    .filter((list) => list.privacy === 'public' && list.items.length > 0);
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
    const alreadySaved = currentItems.some((item) => item.id === nextPlace.id);
    if (alreadySaved) {
      return { ok: true, alreadySaved: true, listName: cleanName };
    }
    currentItems.unshift(nextPlace);
    lists[listIndex] = { ...existingList, name: cleanName, items: currentItems, updatedAt: nowIso };
  } else {
    lists.unshift({
      id: `list-${Date.now()}`,
      name: cleanName,
      privacy: 'private',
      createdAt: nowIso,
      updatedAt: nowIso,
      items: [nextPlace],
    });
  }

  writeSavedLists(lists);
  return { ok: true, alreadySaved: false, listName: cleanName };
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
    const alreadySaved = currentItems.some((item) => item.id === nextItem.id);
    if (alreadySaved) {
      return { ok: true, alreadySaved: true, listName: cleanName };
    }
    currentItems.unshift(nextItem);
    lists[listIndex] = {
      ...existingList,
      name: cleanName,
      listKind: existingList.listKind || 'itinerary',
      items: currentItems,
      updatedAt: nowIso,
    };
  } else {
    lists.unshift({
      id: `list-${Date.now()}`,
      name: cleanName,
      listKind: 'itinerary',
      privacy: 'private',
      createdAt: nowIso,
      updatedAt: nowIso,
      items: [nextItem],
    });
  }

  writeSavedLists(lists);
  return { ok: true, alreadySaved: false, listName: cleanName };
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
  const alreadySaved = currentItems.some((item) => item.id === nextPlace.id);
  if (alreadySaved) {
    return { ok: true, alreadySaved: true, listName: existingList.name };
  }
  currentItems.unshift(nextPlace);
  lists[listIndex] = { ...existingList, items: currentItems, updatedAt: nowIso };
  writeSavedLists(lists);
  return { ok: true, alreadySaved: false, listName: existingList.name };
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
  const alreadySaved = currentItems.some((item) => item.id === nextItem.id);
  if (alreadySaved) {
    return { ok: true, alreadySaved: true, listName: existingList.name };
  }
  currentItems.unshift(nextItem);
  lists[listIndex] = {
    ...existingList,
    listKind: existingList.listKind || 'itinerary',
    items: currentItems,
    updatedAt: nowIso,
  };
  writeSavedLists(lists);
  return { ok: true, alreadySaved: false, listName: existingList.name };
}

/** Remove one saved item from a list by list id and item id. */
export function removeItemFromList(listId, itemId) {
  const lid = String(listId ?? '').trim();
  const iid = String(itemId ?? '').trim();
  if (!lid || !iid) return { ok: false, reason: 'invalid_input' };

  const lists = readSavedLists();
  const listIndex = lists.findIndex((l) => String(l.id) === lid || String(l.name) === lid);
  if (listIndex < 0) return { ok: false, reason: 'list_not_found' };

  const existingList = lists[listIndex];
  const currentItems = Array.isArray(existingList.items) ? existingList.items : [];
  const nextItems = currentItems.filter((item) => String(item.id) !== iid);
  if (nextItems.length === currentItems.length) return { ok: false, reason: 'item_not_found' };

  if (nextItems.length === 0) {
    lists.splice(listIndex, 1);
  } else {
    lists[listIndex] = {
      ...existingList,
      items: nextItems,
      updatedAt: new Date().toISOString(),
    };
  }

  writeSavedLists(lists);
  return { ok: true };
}

/** @param {string} listId @param {{ name?: string, privacy?: 'private' | 'public' }} patch */
export function updateSavedList(listId, patch) {
  const lid = String(listId ?? '').trim();
  if (!lid) return { ok: false, reason: 'invalid_input' };

  const lists = readSavedLists();
  const listIndex = lists.findIndex((l) => String(l.id) === lid || String(l.name) === lid);
  if (listIndex < 0) return { ok: false, reason: 'list_not_found' };

  const existing = lists[listIndex];
  const nextName = patch.name != null ? String(patch.name).trim() : existing.name;
  if (!nextName) return { ok: false, reason: 'invalid_input' };

  const duplicate = lists.some(
    (l, i) => i !== listIndex && String(l.name).toLowerCase() === nextName.toLowerCase(),
  );
  if (duplicate) return { ok: false, reason: 'duplicate_name' };

  const privacy =
    patch.privacy === 'public' || patch.privacy === 'private'
      ? patch.privacy
      : existing.privacy === 'public'
        ? 'public'
        : 'private';

  lists[listIndex] = {
    ...existing,
    name: nextName,
    privacy,
    updatedAt: new Date().toISOString(),
  };
  writeSavedLists(lists);
  return { ok: true, listName: nextName, privacy };
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
