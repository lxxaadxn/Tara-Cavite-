/**
 * Cavite establishments via unified view `v_cavite_establishments`
 * (includes admin CMS rows from public.places with source_slug admin:*).
 */
import { enrichPlaceWithLocalEstablishmentMedia } from './establishmentLocalImages';
import {
  CAVITE_ESTABLISHMENTS_SELECT,
  ESTABLISHMENTS_VIEW,
  collectRemoteMediaUrls,
  isAdminCuratedRow,
} from './cavitePlaceRow';

/** Great-circle distance in kilometers (WGS84 approximate). */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function parseCoord(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Normalize Supabase row → UI place */
export function rowToPlace(row) {
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  if (lat == null || lng == null) return null;

  const remoteUrls = collectRemoteMediaUrls(row);
  const adminCurated = isAdminCuratedRow(row);

  const base = {
    id: row.id,
    name: row.name ?? row.ta_name,
    address: row.address ?? '',
    type: row.ta_category || row.type_code || 'Place',
    hours: row.hours?.trim() || '',
    lat,
    lng,
    imageUrl: remoteUrls[0] ?? null,
    galleryUrls: remoteUrls.length ? remoteUrls : undefined,
    description: row.description,
    ntdp_category: row.ntdp_category,
    city_mun: row.city_mun ?? null,
    lgu_slug: row.lgu_slug,
    source_slug: row.source_slug ?? null,
    ta_category: row.ta_category ?? null,
    type_code: row.type_code ?? null,
    created_at: row.created_at ?? null,
    searchable_text: row.searchable_text ?? null,
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    website: row.website?.trim() || null,
    social_facebook: row.social_facebook?.trim() || null,
    social_instagram: row.social_instagram?.trim() || null,
    social_twitter: row.social_twitter?.trim() || null,
    fromAdminCms: adminCurated,
  };

  if (adminCurated || remoteUrls.length) {
    return base;
  }
  return enrichPlaceWithLocalEstablishmentMedia(base);
}

function sanitizeSearchToken(raw) {
  return raw
    .trim()
    .replace(/[%_,()]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export async function searchPlacesByText(client, rawQuery, limit = 40) {
  const safe = sanitizeSearchToken(rawQuery);
  if (!safe) return [];

  const pattern = `%${safe}%`;
  const fetchCap = Math.min(Math.max(limit * 4, 80), 500);

  const orFilter = [
    `name.ilike.${pattern}`,
    `searchable_text.ilike.${pattern}`,
    `ta_category.ilike.${pattern}`,
    `address.ilike.${pattern}`,
    `city_mun.ilike.${pattern}`,
    `ntdp_category.ilike.${pattern}`,
    `type_code.ilike.${pattern}`,
  ].join(',');

  const { data, error } = await client
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
    .or(orFilter)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(fetchCap);

  if (error) throw new Error(error.message);

  const seen = new Map();
  for (const row of data ?? []) {
    const p = rowToPlace(row);
    if (!p) continue;
    if (!seen.has(p.id)) seen.set(p.id, p);
  }

  return Array.from(seen.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export async function fetchTrendingPlacesFromSupabase(client, limit = 120) {
  const { data, error } = await client
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const out = [];
  for (const row of data ?? []) {
    const p = rowToPlace(row);
    if (p) out.push(p);
  }
  return out;
}

export async function fetchAllPlacesFromSupabase(client, pageSize = 1000) {
  const size = Math.min(Math.max(pageSize, 100), 1000);
  const seen = new Map();
  let from = 0;

  while (true) {
    const to = from + size - 1;
    const { data, error } = await client
      .from(ESTABLISHMENTS_VIEW)
      .select(CAVITE_ESTABLISHMENTS_SELECT)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw new Error(error.message);

    const rows = data ?? [];
    for (const row of rows) {
      const p = rowToPlace(row);
      if (p && !seen.has(p.id)) seen.set(p.id, p);
    }

    if (rows.length < size) break;
    from += size;
  }

  return Array.from(seen.values());
}

export async function fetchPlaceById(client, id) {
  const { data, error } = await client
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToPlace(data) : null;
}
