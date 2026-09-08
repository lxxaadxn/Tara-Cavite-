import { CONTENT_PIPELINE } from 'cavitour-shared';
import { isCheckinVisitSource } from 'cavitour-shared/travelAchievements';
import { fetchPublishedItineraries, matchItinerary } from 'cavitour-shared/itineraries';
import type { SupabaseClient } from '@supabase/supabase-js';

const REVIEW_LIMIT = 6;
const VISIT_LIMIT = 100;

export type ProfileVisit = {
  id: string;
  placeId: string;
  placeName: string;
  cityMun: string;
  source: string;
  checkedIn: boolean;
  createdAt: string;
};

export type ProfileReview = {
  id: string;
  placeId: string;
  placeName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type ProfileActivity = {
  reviews: ProfileReview[];
  reviewCount: number;
  checkinCount: number;
  visits: ProfileVisit[];
};

export type SavedPlacePreview = {
  id: string;
  name: string;
  image: string;
  savedAt: string | null;
};

export type SavedItineraryPreview = {
  id: string;
  itineraryId: string;
  name: string;
  image: string;
  subtitle?: string;
  savedAt: string | null;
};

const EMPTY_ACTIVITY: ProfileActivity = {
  reviews: [],
  reviewCount: 0,
  checkinCount: 0,
  visits: [],
};

type PlaceMeta = { name: string; cityMun: string; image?: string };

async function placeMetaById(client: SupabaseClient, ids: string[]): Promise<Map<string, PlaceMeta>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, PlaceMeta>();
  if (!unique.length) return map;

  const { data: sta } = await client
    .from('sta_v3_cavite_2025')
    .select('id, ta_name, city_mun')
    .in('id', unique);
  for (const row of sta ?? []) {
    map.set(String(row.id), {
      name: String(row.ta_name ?? '').trim() || 'Place',
      cityMun: String(row.city_mun ?? '').trim(),
    });
  }

  const { data: catalog } = await client
    .from(CONTENT_PIPELINE.establishmentsView)
    .select('establishment_public_id, ta_name, city_mun, picture')
    .in('establishment_public_id', unique);
  for (const row of catalog ?? []) {
    const id = String((row as { establishment_public_id: string }).establishment_public_id);
    const prev = map.get(id);
    const image = String((row as { picture?: string }).picture ?? '').trim();
    map.set(id, {
      name: prev?.name || String((row as { ta_name?: string }).ta_name ?? '').trim() || 'Place',
      cityMun: prev?.cityMun || String((row as { city_mun?: string }).city_mun ?? '').trim(),
      image: image || prev?.image || '',
    });
  }

  const stillMissing = unique.filter((id) => !map.has(id));
  if (!stillMissing.length) return map;

  const { data: places } = await client.from('places').select('id, name, city_mun').in('id', stillMissing);
  for (const row of places ?? []) {
    map.set(String(row.id), {
      name: String((row as { name?: string }).name ?? '').trim() || 'Place',
      cityMun: String((row as { city_mun?: string }).city_mun ?? '').trim(),
    });
  }
  return map;
}

/**
 * Reviews, check-ins, and recent visits for the signed-in traveler profile.
 */
export async function fetchProfileActivity(
  client: SupabaseClient,
  userId: string
): Promise<ProfileActivity> {
  const uid = String(userId ?? '').trim();
  if (!uid) return { ...EMPTY_ACTIVITY };

  const [reviewsRes, reviewCountRes, checkinCountRes, visitsRes] = await Promise.all([
    client
      .from('place_reviews')
      .select('id, place_id, rating, body, created_at')
      .eq('user_id', uid)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(REVIEW_LIMIT),
    client
      .from('place_reviews')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_published', true),
    client.from('place_visits').select('id', { count: 'exact', head: true }).eq('user_id', uid),
    client
      .from('place_visits')
      .select('id, place_id, source, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(VISIT_LIMIT),
  ]);

  const reviewRows = reviewsRes.error ? [] : reviewsRes.data ?? [];
  const visitRows = visitsRes.error ? [] : visitsRes.data ?? [];
  const meta = await placeMetaById(client, [
    ...reviewRows.map((r) => String(r.place_id ?? '')),
    ...visitRows.map((r) => String(r.place_id ?? '')),
  ]);

  return {
    reviews: reviewRows.map((r) => {
      const placeId = String(r.place_id ?? '');
      const info = meta.get(placeId);
      return {
        id: String(r.id),
        placeId,
        placeName: info?.name || 'Place',
        rating: Number(r.rating) || 0,
        body: String(r.body ?? '').trim(),
        createdAt: String(r.created_at ?? ''),
      };
    }),
    reviewCount: reviewCountRes.error ? reviewRows.length : reviewCountRes.count ?? reviewRows.length,
    checkinCount: checkinCountRes.error ? 0 : checkinCountRes.count ?? 0,
    visits: visitRows.map((r) => {
      const placeId = String(r.place_id ?? '');
      const info = meta.get(placeId);
      const source = String(r.source ?? '');
      return {
        id: String(r.id),
        placeId,
        placeName: info?.name || 'Place',
        cityMun: info?.cityMun || '',
        source,
        checkedIn: isCheckinVisitSource(source),
        createdAt: String(r.created_at ?? ''),
      };
    }),
  };
}

export type PublicListPreview = {
  id: string;
  name: string;
  description: string;
  iconName: string;
  itemCount: number;
  placeCount: number;
  itineraryCount: number;
  cover: string;
};

/**
 * Lists the traveler has marked shared — the "Public lists" card on the profile.
 * `saved_lists.type = 'shared'` is the mobile spelling of web's `privacy: 'public'`.
 * The cover is the first saved place that has a catalog picture.
 */
export async function fetchPublicListsPreview(
  client: SupabaseClient,
  userId: string
): Promise<PublicListPreview[]> {
  const uid = String(userId ?? '').trim();
  if (!uid) return [];

  const { data: listRows, error: listErr } = await client
    .from('saved_lists')
    .select('id, name, description, icon_name, updated_at, created_at')
    .eq('user_id', uid)
    .eq('type', 'shared')
    .order('updated_at', { ascending: false })
    .limit(12);
  if (listErr || !listRows?.length) return [];

  const listIds = listRows.map((l) => String(l.id));
  const [placeLinksRes, itinLinksRes] = await Promise.all([
    client.from('saved_list_items').select('list_id, place_id, created_at').in('list_id', listIds),
    client.from('saved_list_itinerary_items').select('list_id').in('list_id', listIds),
  ]);

  const placeLinks = placeLinksRes.error
    ? []
    : ((placeLinksRes.data ?? []) as Array<{ list_id: string; place_id: string; created_at?: string }>);
  const itinLinks = itinLinksRes.error
    ? []
    : ((itinLinksRes.data ?? []) as Array<{ list_id: string }>);

  const meta = await placeMetaById(
    client,
    placeLinks.map((l) => String(l.place_id ?? ''))
  );

  const placeCounts = new Map<string, number>();
  const itineraryCounts = new Map<string, number>();
  const covers = new Map<string, string>();
  for (const link of placeLinks) {
    const listId = String(link.list_id);
    placeCounts.set(listId, (placeCounts.get(listId) ?? 0) + 1);
    if (!covers.get(listId)) {
      const image = meta.get(String(link.place_id ?? ''))?.image ?? '';
      if (image) covers.set(listId, image);
    }
  }
  for (const link of itinLinks) {
    const listId = String(link.list_id);
    itineraryCounts.set(listId, (itineraryCounts.get(listId) ?? 0) + 1);
  }

  return listRows.map((row) => {
    const id = String(row.id);
    const placeCount = placeCounts.get(id) ?? 0;
    const itineraryCount = itineraryCounts.get(id) ?? 0;
    return {
      id,
      name: String(row.name ?? '').trim() || 'Saved list',
      description: String(row.description ?? '').trim(),
      iconName: String(row.icon_name ?? 'bookmark-outline'),
      itemCount: placeCount + itineraryCount,
      placeCount,
      itineraryCount,
      cover: covers.get(id) ?? '',
    };
  });
}

export async function fetchProfileSavedPreview(
  client: SupabaseClient,
  userId: string
): Promise<{ places: SavedPlacePreview[]; itineraries: SavedItineraryPreview[] }> {
  const uid = String(userId ?? '').trim();
  if (!uid) return { places: [], itineraries: [] };

  const { data: lists, error: listErr } = await client.from('saved_lists').select('id').eq('user_id', uid);
  if (listErr || !lists?.length) return { places: [], itineraries: [] };
  const listIds = lists.map((l) => String(l.id));

  const [placeLinksRes, itinLinksRes] = await Promise.all([
    client
      .from('saved_list_items')
      .select('place_id, created_at')
      .in('list_id', listIds)
      .order('created_at', { ascending: false })
      .limit(24),
    client
      .from('saved_list_itinerary_items')
      .select('itinerary_ref, created_at')
      .in('list_id', listIds)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const placeLinks = placeLinksRes.error ? [] : placeLinksRes.data ?? [];
  const itinLinks = itinLinksRes.error ? [] : itinLinksRes.data ?? [];
  const placeIds = [...new Set(placeLinks.map((r) => String(r.place_id ?? '')).filter(Boolean))];
  const meta = await placeMetaById(client, placeIds);

  const seenPlace = new Set<string>();
  const places: SavedPlacePreview[] = [];
  for (const link of placeLinks) {
    const id = String(link.place_id ?? '');
    if (!id || seenPlace.has(id)) continue;
    seenPlace.add(id);
    const info = meta.get(id);
    places.push({
      id,
      name: info?.name || 'Place',
      image: info?.image || '',
      savedAt: link.created_at ? String(link.created_at) : null,
    });
  }

  const seenItin = new Set<string>();
  const itineraries: SavedItineraryPreview[] = [];
  let published: Awaited<ReturnType<typeof fetchPublishedItineraries>> = [];
  try {
    published = await fetchPublishedItineraries(client);
  } catch {
    published = [];
  }
  for (const link of itinLinks) {
    const itineraryId = String(link.itinerary_ref ?? '').trim();
    if (!itineraryId || seenItin.has(itineraryId)) continue;
    seenItin.add(itineraryId);
    const publishedRow = matchItinerary(published, itineraryId) as {
      title?: unknown;
      image?: unknown;
      subtitle?: unknown;
    } | null;
    itineraries.push({
      id: `itinerary-${itineraryId}`,
      itineraryId,
      name: String(publishedRow?.title ?? '') || 'Itinerary',
      image: String(publishedRow?.image ?? ''),
      subtitle: String(publishedRow?.subtitle ?? '') || 'Saved itinerary',
      savedAt: link.created_at ? String(link.created_at) : null,
    });
  }

  return { places, itineraries };
}
