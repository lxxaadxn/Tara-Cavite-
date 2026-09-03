import { CONTENT_PIPELINE } from 'cavitour-shared';
import { fetchPublishedItineraries, matchItinerary } from 'cavitour-shared/itineraries';
import { lookupLocalEstablishmentUrls } from './establishmentLocalImages';
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

function isForeignKeyError(error) {
  if (!error) return false;
  if (error.code === '23503') return true;
  const msg = String(error.message ?? '').toLowerCase();
  return msg.includes('foreign key') || msg.includes('violates foreign key');
}

function pushUniqueId(ids, value) {
  const id = String(value ?? '').trim();
  if (id && !ids.includes(id)) ids.push(id);
}

/**
 * Catalog `establishment_public_id` first (same ID the About page uses), then STA `id`.
 * @param {string} placeRefId
 * @returns {Promise<string[]>}
 */
export async function resolveCanonicalPlaceIds(placeRefId) {
  const ref = String(placeRefId ?? '').trim();
  if (!ref) return [];

  const candidates = [];

  const { data: catalogRows, error: catalogErr } = await supabase
    .from(CONTENT_PIPELINE.establishmentsView)
    .select('establishment_public_id')
    .eq('establishment_public_id', ref)
    .limit(1);
  if (!catalogErr) {
    pushUniqueId(candidates, catalogRows?.[0]?.establishment_public_id);
  }

  const { data: byId, error: byIdError } = await supabase
    .from('sta_v3_cavite_2025')
    .select('id')
    .eq('id', ref)
    .maybeSingle();
  if (!byIdError) {
    pushUniqueId(candidates, byId?.id);
  }

  pushUniqueId(candidates, ref);
  return candidates;
}

/** @param {string} placeRefId */
export async function resolveCanonicalPlaceId(placeRefId) {
  const ids = await resolveCanonicalPlaceIds(placeRefId);
  return ids[0] ?? null;
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
  const galleryFirst = Array.isArray(placeRow.gallery_urls)
    ? placeRow.gallery_urls.map((u) => String(u ?? '').trim()).find(Boolean)
    : '';
  const dbImage = String(placeRow.picture ?? placeRow.image_url ?? galleryFirst ?? '').trim();
  const localImage = lookupLocalEstablishmentUrls(name)?.[0] ?? '';
  const tag = placeRow.ntdp_category
    ? formatNtdpCategoryTagLabel(placeRow.ntdp_category)
    : placeRow.type ?? '';
  return {
    id,
    name: name ?? 'Unnamed place',
    image: dbImage || localImage,
    subtitle: placeRow.address ?? 'Cavite, Philippines',
    establishmentTag: tag,
    savedAt: savedAt ?? placeRow.created_at ?? null,
  };
}

function mapItineraryRefToItem(itineraryRef, savedAt, catalog = []) {
  const detail = matchItinerary(catalog, itineraryRef);
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
  const uid = String(userId ?? '').trim();
  if (!uid) return [];

  let { data: listRows, error: listErr } = await supabase
    .from('saved_lists')
    .select('id, name, created_at, updated_at, type')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false });
  if (listErr && /type/i.test(String(listErr.message ?? ''))) {
    const retry = await supabase
      .from('saved_lists')
      .select('id, name, created_at, updated_at')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false });
    listRows = retry.data;
    listErr = retry.error;
  }
  if (listErr) throw listErr;

  const lists = [];
  let skipItineraryItems = false;
  let published = [];
  try {
    published = await fetchPublishedItineraries(supabase);
  } catch {
    published = [];
  }
  for (const list of listRows ?? []) {
    const placeQuery = supabase
      .from('saved_list_items')
      .select('place_id, created_at')
      .eq('list_id', list.id)
      .order('created_at', { ascending: false });
    const itineraryQuery = skipItineraryItems
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from('saved_list_itinerary_items')
          .select('itinerary_ref, created_at')
          .eq('list_id', list.id)
          .order('created_at', { ascending: false });
    const [placeLinksRes, itineraryLinksRes] = await Promise.all([placeQuery, itineraryQuery]);
    if (placeLinksRes.error) throw placeLinksRes.error;
    if (itineraryLinksRes.error) skipItineraryItems = true;
    const itineraryLinks = itineraryLinksRes.error ? [] : (itineraryLinksRes.data ?? []);

    const items = [];
    const placeIds = (placeLinksRes.data ?? []).map((r) => r.place_id);
    if (placeIds.length > 0) {
      const { data: placeRows, error: placesErr } = await supabase
        .from(CONTENT_PIPELINE.establishmentsView)
        .select(
          'establishment_public_id, ta_name, address, type, picture, gallery_urls, ntdp_category, created_at'
        )
        .in('establishment_public_id', placeIds);
      if (placesErr) throw placesErr;
      const savedAtByPlaceId = new Map(
        (placeLinksRes.data ?? []).map((r) => [r.place_id, r.created_at]),
      );
      const foundIds = new Set();
      for (const row of placeRows ?? []) {
        const pid = row.establishment_public_id;
        if (pid) foundIds.add(pid);
        items.push(mapPlaceRowToItem(row, savedAtByPlaceId.get(pid)));
      }
      for (const pid of placeIds) {
        if (foundIds.has(pid)) continue;
        items.push({
          id: pid,
          name: 'Saved place',
          image: '',
          subtitle: 'Cavite, Philippines',
          establishmentTag: '',
          savedAt: savedAtByPlaceId.get(pid) ?? null,
        });
      }
    }

    for (const link of itineraryLinks) {
      items.push(mapItineraryRefToItem(link.itinerary_ref, link.created_at, published));
    }

    items.sort((a, b) => String(b.savedAt ?? '').localeCompare(String(a.savedAt ?? '')));

    lists.push({
      id: list.id,
      name: list.name,
      privacy: list.type === 'shared' ? 'public' : 'private',
      createdAt: list.created_at,
      updatedAt: list.updated_at,
      items,
    });
  }

  return lists;
}

async function insertPlaceIntoList(listId, placeId) {
  const candidates = await resolveCanonicalPlaceIds(placeId);
  if (candidates.length === 0) {
    return { ok: false, reason: 'place_not_in_catalog' };
  }

  let lastError = null;
  for (const id of candidates) {
    const { error } = await supabase
      .from('saved_list_items')
      .insert({ list_id: listId, place_id: id });
    if (!error) return { ok: true, alreadySaved: false };
    if (isDuplicateError(error)) return { ok: true, alreadySaved: true };
    lastError = error;
    if (isForeignKeyError(error)) continue;
    throw error;
  }
  if (lastError && isForeignKeyError(lastError)) {
    return { ok: false, reason: 'place_not_in_catalog' };
  }
  throw lastError;
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

/**
 * @param {string} userId
 * @param {string} listId
 * @param {string} itemId
 */
export async function removeItemFromListRemote(userId, listId, itemId) {
  const list = await getListForUser(userId, listId);
  if (!list) return { ok: false, reason: 'list_not_found' };

  const iid = String(itemId ?? '').trim();
  if (!iid) return { ok: false, reason: 'invalid_input' };

  if (iid.startsWith('itinerary-')) {
    const itineraryRef = iid.replace(/^itinerary-/, '');
    const { error } = await supabase
      .from('saved_list_itinerary_items')
      .delete()
      .eq('list_id', list.id)
      .eq('itinerary_ref', itineraryRef);
    if (error) throw error;
  } else {
    const idsToTry = new Set([iid]);
    try {
      for (const id of await resolveCanonicalPlaceIds(iid)) idsToTry.add(id);
    } catch {
      /* keep the original id */
    }
    const { error } = await supabase
      .from('saved_list_items')
      .delete()
      .eq('list_id', list.id)
      .in('place_id', [...idsToTry]);
    if (error) throw error;
  }

  dispatchSavedListsUpdated();
  return { ok: true };
}

/**
 * @param {string} userId
 * @param {string} listId
 * @param {{ name?: string, privacy?: 'private' | 'public' }} patch
 */
export async function updateSavedListRemote(userId, listId, patch) {
  const list = await getListForUser(userId, listId);
  if (!list) return { ok: false, reason: 'list_not_found' };

  const nextName = patch.name != null ? String(patch.name).trim() : list.name;
  if (!nextName) return { ok: false, reason: 'invalid_input' };

  if (nextName.toLowerCase() !== String(list.name).toLowerCase()) {
    const { data: others, error: othersErr } = await supabase
      .from('saved_lists')
      .select('id, name')
      .eq('user_id', userId);
    if (othersErr) throw othersErr;
    const duplicate = (others ?? []).some(
      (row) => row.id !== list.id && String(row.name).toLowerCase() === nextName.toLowerCase(),
    );
    if (duplicate) return { ok: false, reason: 'duplicate_name' };
  }

  const next = { name: nextName };
  if (patch.privacy === 'public') next.type = 'shared';
  if (patch.privacy === 'private') next.type = 'private';

  const { error } = await supabase
    .from('saved_lists')
    .update(next)
    .eq('id', list.id)
    .eq('user_id', userId);
  if (error) {
    if (isDuplicateError(error)) return { ok: false, reason: 'duplicate_name' };
    throw error;
  }

  dispatchSavedListsUpdated();
  return { ok: true, listName: nextName };
}
