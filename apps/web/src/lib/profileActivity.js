import { CONTENT_PIPELINE } from 'cavitour-shared';
import { isCheckinVisitSource } from 'cavitour-shared/travelAchievements';

const REVIEW_LIMIT = 6;
const VISIT_LIMIT = 100;

const EMPTY_ACTIVITY = { reviews: [], reviewCount: 0, checkinCount: 0, visits: [] };

async function placeMetaById(client, ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map();
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

  const missing = unique.filter((id) => !map.has(id));
  if (!missing.length) return map;

  const { data: catalog } = await client
    .from(CONTENT_PIPELINE.establishmentsView)
    .select('establishment_public_id, ta_name, city_mun')
    .in('establishment_public_id', missing);
  for (const row of catalog ?? []) {
    map.set(String(row.establishment_public_id), {
      name: String(row.ta_name ?? '').trim() || 'Place',
      cityMun: String(row.city_mun ?? '').trim(),
    });
  }

  const stillMissing = unique.filter((id) => !map.has(id));
  if (!stillMissing.length) return map;

  const { data: places } = await client
    .from('places')
    .select('id, name, city_mun')
    .in('id', stillMissing);
  for (const row of places ?? []) {
    map.set(String(row.id), {
      name: String(row.name ?? '').trim() || 'Place',
      cityMun: String(row.city_mun ?? '').trim(),
    });
  }
  return map;
}

function mapVisit(row, meta) {
  const placeId = String(row.place_id ?? '');
  const info = meta.get(placeId);
  const source = String(row.source ?? '');
  return {
    id: String(row.id),
    placeId,
    placeName: info?.name || 'Place',
    cityMun: info?.cityMun || '',
    source,
    checkedIn: isCheckinVisitSource(source),
    createdAt: String(row.created_at ?? ''),
  };
}

function mapReview(row, meta) {
  const placeId = String(row.place_id ?? '');
  const info = meta.get(placeId);
  return {
    id: String(row.id),
    placeId,
    placeName: info?.name || 'Place',
    rating: Number(row.rating) || 0,
    body: String(row.body ?? '').trim(),
    createdAt: String(row.created_at ?? ''),
  };
}

/**
 * Reviews, check-ins, and recent visits for the signed-in traveler profile.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} userId
 */
export async function fetchProfileActivity(client, userId) {
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
    reviews: reviewRows.map((r) => mapReview(r, meta)),
    reviewCount: reviewCountRes.error ? reviewRows.length : reviewCountRes.count ?? reviewRows.length,
    checkinCount: checkinCountRes.error ? 0 : checkinCountRes.count ?? 0,
    visits: visitRows.map((r) => mapVisit(r, meta)),
  };
}
