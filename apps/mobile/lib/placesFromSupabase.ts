import type { SupabaseClient } from '@supabase/supabase-js';
import type { Place } from '../data/mockData';
import { normalizeNtdpCopy } from './ntdpDisplayLabels';

export type CavitePlaceRow = {
  id: string;
  name: string;
  ta_name: string;
  type_code: string | null;
  ta_category: string | null;
  ntdp_category: string | null;
  city_mun: string | null;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  description: string | null;
  searchable_text: string | null;
  lgu_slug: string | null;
};

/** Alias for screens that still import `PlaceRow`. */
export type PlaceRow = CavitePlaceRow;

const CAVITE_SELECT =
  'id, name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, lgu_slug';

const KM_PER_DEG_LAT = 111;

/** Great-circle distance in kilometers (WGS84 approximate). */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function boundingBoxForRadiusKm(centerLat: number, centerLng: number, radiusKm: number) {
  const latDelta = radiusKm / KM_PER_DEG_LAT;
  const lngDelta =
    radiusKm / (KM_PER_DEG_LAT * Math.max(0.2, Math.cos((centerLat * Math.PI) / 180)));
  return {
    latMin: centerLat - latDelta,
    latMax: centerLat + latDelta,
    lngMin: centerLng - lngDelta,
    lngMax: centerLng + lngDelta,
  };
}

export function parseCoord(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

/** Map Cavite view row → Place (mockData shape). */
export function rowToPlace(row: CavitePlaceRow): Place | null {
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  if (lat == null || lng == null) return null;
  const p: Place = {
    id: row.id,
    name: row.name ?? row.ta_name,
    address: row.address,
    type: row.ta_category || row.type_code || 'Place',
    hours: '',
    latitude: lat,
    longitude: lng,
  };
  if (row.description) p.description = normalizeNtdpCopy(row.description);
  if (row.ntdp_category) p.ntdp_category = normalizeNtdpCopy(row.ntdp_category);
  if (row.city_mun) p.city_mun = row.city_mun;
  return p;
}

function sanitizeSearchToken(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,()]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

export async function searchPlacesByText(
  client: SupabaseClient,
  rawQuery: string,
  limit = 25
): Promise<Place[]> {
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
    .from('v_cavite_establishments')
    .select(CAVITE_SELECT)
    .or(orFilter)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(fetchCap);

  if (error) throw new Error(error.message);

  const seen = new Map<string, Place>();
  for (const row of data ?? []) {
    const p = rowToPlace(row as CavitePlaceRow);
    if (p && !seen.has(p.id)) seen.set(p.id, p);
  }

  return Array.from(seen.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export async function fetchTrendingPlacesFromSupabase(
  client: SupabaseClient,
  limit = 40
): Promise<Place[]> {
  const { data, error } = await client
    .from('v_cavite_establishments')
    .select(CAVITE_SELECT)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const out: Place[] = [];
  for (const row of data ?? []) {
    const p = rowToPlace(row as CavitePlaceRow);
    if (p) out.push(p);
  }
  return out;
}

export async function fetchNearbyPlacesFromSupabase(
  client: SupabaseClient,
  userLat: number,
  userLng: number,
  radiusKm = 3,
  limit = 40
): Promise<Place[]> {
  const padKm = radiusKm * 1.12;
  const bbox = boundingBoxForRadiusKm(userLat, userLng, padKm);

  const { data, error } = await client
    .from('v_cavite_establishments')
    .select(CAVITE_SELECT)
    .gte('latitude', bbox.latMin)
    .lte('latitude', bbox.latMax)
    .gte('longitude', bbox.lngMin)
    .lte('longitude', bbox.lngMax);

  if (error) throw new Error(error.message);

  const scored: { place: Place; km: number }[] = [];
  for (const row of data ?? []) {
    const p = rowToPlace(row as CavitePlaceRow);
    if (!p) continue;
    const km = haversineDistanceKm(userLat, userLng, p.latitude, p.longitude);
    if (km <= radiusKm) scored.push({ place: p, km });
  }

  scored.sort((a, b) => a.km - b.km);
  return scored.slice(0, limit).map(({ place }) => place);
}
