import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSupabasePlaceId(id: string): boolean {
  return UUID_RE.test(String(id).trim());
}

async function resolveCanonicalPlaceId(
  client: SupabaseClient,
  placeRefId: string
): Promise<string | null> {
  const { data: byId, error: byIdError } = await client
    .from('places')
    .select('id')
    .eq('id', placeRefId)
    .maybeSingle();
  if (byIdError) throw byIdError;
  if (byId?.id) return byId.id as string;

  const { data: bySlug, error: bySlugError } = await client
    .from('places')
    .select('id')
    .eq('source_slug', placeRefId)
    .maybeSingle();
  if (bySlugError) throw bySlugError;
  if (bySlug?.id) return bySlug.id as string;
  return null;
}

function bump(counts: Record<string, number>, listId: string) {
  counts[listId] = (counts[listId] ?? 0) + 1;
}

/** Places-only counts (establishments in DB). */
export async function fetchPlaceCountByListId(
  client: SupabaseClient,
  listIds: string[]
): Promise<Record<string, number>> {
  if (listIds.length === 0) return {};
  const { data, error } = await client.from('saved_list_items').select('list_id').in('list_id', listIds);
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const id of listIds) counts[id] = 0;
  for (const row of data ?? []) {
    bump(counts, (row as { list_id: string }).list_id);
  }
  return counts;
}

/** Total saved rows per list: places + terminals + itineraries. */
export async function fetchSavedItemCountsByListId(
  client: SupabaseClient,
  listIds: string[]
): Promise<Record<string, number>> {
  if (listIds.length === 0) return {};
  const counts: Record<string, number> = {};
  for (const id of listIds) counts[id] = 0;

  const merge = (rows: { list_id: string }[] | null | undefined) => {
    for (const row of rows ?? []) bump(counts, row.list_id);
  };

  const [p, t, i] = await Promise.all([
    client.from('saved_list_items').select('list_id').in('list_id', listIds),
    client.from('saved_list_terminal_items').select('list_id').in('list_id', listIds),
    client.from('saved_list_itinerary_items').select('list_id').in('list_id', listIds),
  ]);
  if (p.error) throw p.error;
  merge((p.data ?? []) as { list_id: string }[]);
  if (!t.error) merge((t.data ?? []) as { list_id: string }[]);
  if (!i.error) merge((i.data ?? []) as { list_id: string }[]);
  return counts;
}

export async function fetchSavedListIdsForUser(
  client: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data, error } = await client.from('saved_lists').select('id').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.id as string);
}

export async function isPlaceSavedByUser(
  client: SupabaseClient,
  userId: string,
  placeId: string
): Promise<boolean> {
  const canonicalPlaceId = await resolveCanonicalPlaceId(client, placeId);
  if (!canonicalPlaceId) return false;
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return false;
  const { count, error } = await client
    .from('saved_list_items')
    .select('*', { count: 'exact', head: true })
    .eq('place_id', canonicalPlaceId)
    .in('list_id', listIds);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function isTerminalSavedByUser(
  client: SupabaseClient,
  userId: string,
  terminalRef: string
): Promise<boolean> {
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return false;
  const { count, error } = await client
    .from('saved_list_terminal_items')
    .select('*', { count: 'exact', head: true })
    .eq('terminal_ref', terminalRef)
    .in('list_id', listIds);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function isItinerarySavedByUser(
  client: SupabaseClient,
  userId: string,
  itineraryRef: string
): Promise<boolean> {
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return false;
  const { count, error } = await client
    .from('saved_list_itinerary_items')
    .select('*', { count: 'exact', head: true })
    .eq('itinerary_ref', itineraryRef)
    .in('list_id', listIds);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function removePlaceFromAllUserLists(
  client: SupabaseClient,
  userId: string,
  placeId: string
): Promise<void> {
  const canonicalPlaceId = await resolveCanonicalPlaceId(client, placeId);
  if (!canonicalPlaceId) return;
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return;
  const { error } = await client
    .from('saved_list_items')
    .delete()
    .eq('place_id', canonicalPlaceId)
    .in('list_id', listIds);
  if (error) throw error;
}

export async function removeTerminalFromAllUserLists(
  client: SupabaseClient,
  userId: string,
  terminalRef: string
): Promise<void> {
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return;
  const { error } = await client
    .from('saved_list_terminal_items')
    .delete()
    .eq('terminal_ref', terminalRef)
    .in('list_id', listIds);
  if (error) throw error;
}

export async function removeItineraryFromAllUserLists(
  client: SupabaseClient,
  userId: string,
  itineraryRef: string
): Promise<void> {
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return;
  const { error } = await client
    .from('saved_list_itinerary_items')
    .delete()
    .eq('itinerary_ref', itineraryRef)
    .in('list_id', listIds);
  if (error) throw error;
}

export async function addPlaceToSavedList(
  client: SupabaseClient,
  listId: string,
  placeId: string
): Promise<{ ok: true } | { ok: false; duplicate: boolean; message?: string }> {
  const canonicalPlaceId = await resolveCanonicalPlaceId(client, placeId);
  if (!canonicalPlaceId) {
    return {
      ok: false,
      duplicate: false,
      message:
        'This establishment is not in public.places yet. Add or publish it in the admin catalog, then try saving again.',
    };
  }
  const { error } = await client
    .from('saved_list_items')
    .insert({ list_id: listId, place_id: canonicalPlaceId });
  if (!error) return { ok: true };
  if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique'))
    return { ok: false, duplicate: true };
  return { ok: false, duplicate: false, message: error.message };
}

export async function addTerminalToSavedList(
  client: SupabaseClient,
  listId: string,
  terminalRef: string
): Promise<{ ok: true } | { ok: false; duplicate: boolean; message?: string }> {
  const { error } = await client
    .from('saved_list_terminal_items')
    .insert({ list_id: listId, terminal_ref: terminalRef });
  if (!error) return { ok: true };
  if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique'))
    return { ok: false, duplicate: true };
  return { ok: false, duplicate: false, message: error.message };
}

export async function addItineraryToSavedList(
  client: SupabaseClient,
  listId: string,
  itineraryRef: string
): Promise<{ ok: true } | { ok: false; duplicate: boolean; message?: string }> {
  const { error } = await client
    .from('saved_list_itinerary_items')
    .insert({ list_id: listId, itinerary_ref: itineraryRef });
  if (!error) return { ok: true };
  if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique'))
    return { ok: false, duplicate: true };
  return { ok: false, duplicate: false, message: error.message };
}

export async function placeRowExists(client: SupabaseClient, placeId: string): Promise<boolean> {
  const canonical = await resolveCanonicalPlaceId(client, placeId);
  return canonical != null;
}

export type SaveToListPickerRow = {
  id: string;
  name: string;
  type: string;
  itemCount: number;
};

export async function fetchUserListsForPicker(
  client: SupabaseClient,
  userId: string
): Promise<{ id: string; name: string; type: string }[]> {
  const { data, error } = await client
    .from('saved_lists')
    .select('id, name, type')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as { id: string; name: string; type: string }[];
}

/** Lists for the save modal — same shape as web `SaveToListModal` (`items.length`). */
export async function fetchUserListsForPickerWithCounts(
  client: SupabaseClient,
  userId: string
): Promise<SaveToListPickerRow[]> {
  const lists = await fetchUserListsForPicker(client, userId);
  if (lists.length === 0) return [];
  const counts = await fetchSavedItemCountsByListId(
    client,
    lists.map((l) => l.id)
  );
  return lists.map((l) => ({
    ...l,
    itemCount: counts[l.id] ?? 0,
  }));
}

/** Match web `findOrCreateListByName` (Supabase). */
export async function findOrCreateListByName(
  client: SupabaseClient,
  userId: string,
  listName: string
): Promise<{ id: string; name: string } | null> {
  const cleanName = String(listName ?? '').trim();
  if (!cleanName) return null;

  const { data: lists, error } = await client
    .from('saved_lists')
    .select('id, name')
    .eq('user_id', userId);
  if (error) throw error;

  const match = (lists ?? []).find(
    (l) => String(l.name).toLowerCase() === cleanName.toLowerCase()
  );
  if (match) return { id: match.id as string, name: match.name as string };

  const { data: created, error: insertErr } = await client
    .from('saved_lists')
    .insert({
      user_id: userId,
      name: cleanName,
      type: 'private',
      icon_name: 'bookmark',
    })
    .select('id, name')
    .single();
  if (insertErr) throw insertErr;
  return { id: created.id as string, name: created.name as string };
}
