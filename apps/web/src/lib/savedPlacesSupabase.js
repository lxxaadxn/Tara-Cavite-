import { publishedItineraries } from '../data/mockItineraries';
import { formatNtdpCategoryTagLabel } from './ntdpDisplayLabels';
import { SAVED_LISTS_UPDATED_EVENT } from './savedPlaces';
import { supabase } from './supabase';

function dispatchSavedListsUpdated() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SAVED_LISTS_UPDATED_EVENT));
  }
}

function isDuplicateError(error) {
  if (!error) return false;
  if (error.code === '23505') return true;
  const msg = String(error.message ?? '').toLowerCase();
  return msg.includes('duplicate') || msg.includes('unique');
}

/** @param {string} placeRefId */
export async function resolveCanonicalPlaceId(placeRefId) {
  const ref = String(placeRefId ?? '').trim();
  if (!ref) return null;

  const { data: byId, error: byIdError } = await supabase
    .from('places')
    .select('id')
    .eq('id', ref)
    .maybeSingle();
  if (byIdError) throw byIdError;
  if (byId?.id) return byId.id;
  return null;
}

async function findOrCreateListByName(userId, listName) {
  const cleanName = String(listName ?? '').trim();
  const { data: lists, error } = await supabase
    .from('saved_lists')
    .select('id, name')
    .eq('user_id', userId);
  if (error) throw error;

  const match = (lists ?? []).find((l) => String(l.name).toLowerCase() === cleanName.toLowerCase());
  if (match) return { id: match.id, name: match.name };

  const { data: created, error: insertErr } = await supabase
    .from('saved_lists')
    .insert({ user_id: userId, name: cleanName })
    .select('id, name')
    .single();
  if (insertErr) throw insertErr;
  return { id: created.id, name: created.name };
}

async function getListForUser(userId, listId) {
  const id = String(listId ?? '').trim();
  if (!id) return null;
  const { data, error } = await supabase
    .from('saved_lists')
    .select('id, name')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function mapPlaceRowToItem(placeRow, savedAt) {
  const id = placeRow.establishment_public_id ?? placeRow.id;
  const name = placeRow.ta_name ?? placeRow.name;
  const image = placeRow.picture ?? placeRow.image_url ?? '';
  const tag = placeRow.ntdp_category
    ? formatNtdpCategoryTagLabel(placeRow.ntdp_category)
    : placeRow.type ?? '';
  return {
    id,
    name: name ?? 'Unnamed place',
    image,
    subtitle: placeRow.address ?? 'Cavite, Philippines',
    establishmentTag: tag,
    savedAt: savedAt ?? placeRow.created_at ?? null,
  };
}

function mapItineraryRefToItem(itineraryRef, savedAt) {
  const detail = publishedItineraries.find((it) => it.id === itineraryRef);
  return {
    id: `itinerary-${itineraryRef}`,
    name: detail?.title ?? 'Itinerary',
    image: detail?.image ?? '',
    subtitle: detail?.subtitle ?? 'Cavite, Philippines',
    establishmentTag: 'Itinerary',
    kind: 'itinerary',
    itineraryId: String(itineraryRef),
    savedAt: savedAt ?? null,
  };
}

/**
 * Load saved lists for a user in the same shape as localStorage `readSavedLists()`.
 * @param {string} userId
 */
export async function fetchSavedListsForUser(userId) {
  const { data: listRows, error: listErr } = await supabase
    .from('saved_lists')
    .select('id, name, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (listErr) throw listErr;

  const lists = [];
  for (const list of listRows ?? []) {
    const [placeLinksRes, itineraryLinksRes] = await Promise.all([
      supabase
        .from('saved_list_items')
        .select('place_id, created_at')
        .eq('list_id', list.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('saved_list_itinerary_items')
        .select('itinerary_ref, created_at')
        .eq('list_id', list.id)
        .order('created_at', { ascending: false }),
    ]);
    if (placeLinksRes.error) throw placeLinksRes.error;
    if (itineraryLinksRes.error) throw itineraryLinksRes.error;

    const items = [];
    const placeIds = (placeLinksRes.data ?? []).map((r) => r.place_id);
    if (placeIds.length > 0) {
      const { data: placeRows, error: placesErr } = await supabase
        .from('places')
        .select('id, name, address, type, image_url, ntdp_category, created_at')
        .in('id', placeIds);
      if (placesErr) throw placesErr;
      const savedAtByPlaceId = new Map(
        (placeLinksRes.data ?? []).map((r) => [r.place_id, r.created_at]),
      );
      for (const row of placeRows ?? []) {
        items.push(
          mapPlaceRowToItem(row, savedAtByPlaceId.get(row.id))
        );
      }
    }

    for (const link of itineraryLinksRes.data ?? []) {
      items.push(mapItineraryRefToItem(link.itinerary_ref, link.created_at));
    }

    items.sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')));

    lists.push({
      id: list.id,
      name: list.name,
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      items,
    });
  }

  return lists;
}

async function insertPlaceIntoList(listId, placeId) {
  const canonicalPlaceId = await resolveCanonicalPlaceId(placeId);
  if (!canonicalPlaceId) {
    return { ok: false, reason: 'place_not_in_catalog' };
  }

  const { error } = await supabase
    .from('saved_list_items')
    .insert({ list_id: listId, place_id: canonicalPlaceId });
  if (!error) return { ok: true, alreadySaved: false };
  if (isDuplicateError(error)) return { ok: true, alreadySaved: true };
  throw error;
}

async function insertItineraryIntoList(listId, itineraryId) {
  const itineraryRef = String(itineraryId ?? '').trim();
  if (!itineraryRef) return { ok: false, reason: 'invalid_input' };

  const { error } = await supabase
    .from('saved_list_itinerary_items')
    .insert({ list_id: listId, itinerary_ref: itineraryRef });
  if (!error) return { ok: true, alreadySaved: false };
  if (isDuplicateError(error)) return { ok: true, alreadySaved: true };
  throw error;
}

/**
 * @param {string} userId
 * @param {string} listName
 * @param {{ id: string }} place
 */
export async function savePlaceToListRemote(userId, listName, place) {
  const cleanName = String(listName ?? '').trim();
  if (!cleanName || !place?.id) return { ok: false, reason: 'invalid_input' };

  const list = await findOrCreateListByName(userId, cleanName);
  const result = await insertPlaceIntoList(list.id, place.id);
  if (!result.ok) return result;
  dispatchSavedListsUpdated();
  return { ok: true, alreadySaved: result.alreadySaved, listName: list.name };
}

/**
 * @param {string} userId
 * @param {string} listId
 * @param {{ id: string }} place
 */
export async function savePlaceToListIdRemote(userId, listId, place) {
  if (!place?.id) return { ok: false, reason: 'invalid_input' };
  const list = await getListForUser(userId, listId);
  if (!list) return { ok: false, reason: 'list_not_found' };

  const result = await insertPlaceIntoList(list.id, place.id);
  if (!result.ok) return result;
  dispatchSavedListsUpdated();
  return { ok: true, alreadySaved: result.alreadySaved, listName: list.name };
}

/**
 * @param {string} userId
 * @param {string} listName
 * @param {{ id: string }} itinerary
 */
export async function saveItineraryToListRemote(userId, listName, itinerary) {
  const cleanName = String(listName ?? '').trim();
  if (!cleanName || !itinerary?.id) return { ok: false, reason: 'invalid_input' };

  const list = await findOrCreateListByName(userId, cleanName);
  const result = await insertItineraryIntoList(list.id, itinerary.id);
  if (!result.ok) return result;
  dispatchSavedListsUpdated();
  return { ok: true, alreadySaved: result.alreadySaved, listName: list.name };
}

/**
 * @param {string} userId
 * @param {string} listId
 * @param {{ id: string }} itinerary
 */
export async function saveItineraryToListIdRemote(userId, listId, itinerary) {
  if (!itinerary?.id) return { ok: false, reason: 'invalid_input' };
  const list = await getListForUser(userId, listId);
  if (!list) return { ok: false, reason: 'list_not_found' };

  const result = await insertItineraryIntoList(list.id, itinerary.id);
  if (!result.ok) return result;
  dispatchSavedListsUpdated();
  return { ok: true, alreadySaved: result.alreadySaved, listName: list.name };
}
