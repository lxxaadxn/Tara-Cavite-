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
