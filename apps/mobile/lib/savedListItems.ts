import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSupabasePlaceId(id: string): boolean {
  return UUID_RE.test(String(id).trim());
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
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return false;
  const { count, error } = await client
    .from('saved_list_items')
    .select('*', { count: 'exact', head: true })
    .eq('place_id', placeId)
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
  const listIds = await fetchSavedListIdsForUser(client, userId);
  if (listIds.length === 0) return;
  const { error } = await client.from('saved_list_items').delete().eq('place_id', placeId).in('list_id', listIds);
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
  const { error } = await client.from('saved_list_items').insert({ list_id: listId, place_id: placeId });
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
  const { data, error } = await client.from('places').select('id').eq('id', placeId).maybeSingle();
  if (error) throw error;
  return data != null;
}

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
