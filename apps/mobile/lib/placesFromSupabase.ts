import type { SupabaseClient } from '@supabase/supabase-js';
import type { Place } from '../data/mockData';
import { normalizeNtdpCopy } from './ntdpDisplayLabels';

export type PlaceRow = {
  id: string;
  name: string;
  address: string;
  type: string | null;
  hours: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  image_url: string | null;
  description: string | null;
  ntdp_category: string | null;
};

const PLACES_SELECT =
  'id, name, address, type, hours, latitude, longitude, image_url, description, ntdp_category, created_at';

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

export function rowToPlace(row: PlaceRow): Place | null {
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  if (lat == null || lng == null) return null;
  const p: Place = {
    id: row.id,
    name: row.name,
    address: row.address,
    type: row.type ?? 'Place',
    hours: row.hours ?? '',
    latitude: lat,
    longitude: lng,
  };
  if (row.image_url) {
    p.image = { uri: row.image_url };
  }
  if (row.description) p.description = normalizeNtdpCopy(row.description);
  if (row.ntdp_category) p.ntdp_category = normalizeNtdpCopy(row.ntdp_category);
  return p;
}

/** Strip characters that break PostgREST `ilike` patterns. */
function sanitizeSearchToken(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

/**
 * Search `places` by name or address (case-insensitive). Deduplicates by id;
 * name matches are ordered before address-only matches.
 */
export async function searchPlacesByText(
  client: SupabaseClient,
  rawQuery: string,
  limit = 25
): Promise<Place[]> {
  const safe = sanitizeSearchToken(rawQuery);
  if (!safe) return [];

  const pattern = `%${safe}%`;
  const [nameRes, addrRes] = await Promise.all([
    client
      .from('places')
      .select(PLACES_SELECT)
      .ilike('name', pattern)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(limit),
    client
      .from('places')
      .select(PLACES_SELECT)
      .ilike('address', pattern)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(limit),
  ]);

  if (nameRes.error) throw new Error(nameRes.error.message);
  if (addrRes.error) throw new Error(addrRes.error.message);

  const nameIds = new Set((nameRes.data ?? []).map((r) => r.id));
  const byId = new Map<string, Place>();

  for (const row of nameRes.data ?? []) {
    const p = rowToPlace(row as PlaceRow);
    if (p) byId.set(p.id, p);
  }
  for (const row of addrRes.data ?? []) {
    const p = rowToPlace(row as PlaceRow);
    if (p) byId.set(p.id, p);
  }

  const merged = Array.from(byId.values()).sort((a, b) => {
    const aName = nameIds.has(a.id) ? 0 : 1;
    const bName = nameIds.has(b.id) ? 0 : 1;
    if (aName !== bName) return aName - bName;
    return a.name.localeCompare(b.name);
  });

  return merged.slice(0, limit);
}

/**
 * Dashboard “trending”: places in Supabase with coordinates (for detail / maps).
 * Includes rows with `image_url` null — UI should show a placeholder image.
 */
export async function fetchTrendingPlacesFromSupabase(
  client: SupabaseClient,
  limit = 40
): Promise<Place[]> {
  const { data, error } = await client
    .from('places')
    .select(PLACES_SELECT)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  const out: Place[] = [];
  for (const row of data ?? []) {
    const p = rowToPlace(row as PlaceRow);
    if (p) out.push(p);
  }
  return out;
}

/**
 * Places within `radiusKm` of the user (Haversine), nearest first.
 * Uses a bounding-box prefilter on Supabase, then exact distance in app.
 */
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
    .from('places')
    .select(PLACES_SELECT)
    .gte('latitude', bbox.latMin)
    .lte('latitude', bbox.latMax)
    .gte('longitude', bbox.lngMin)
    .lte('longitude', bbox.lngMax);

  if (error) throw new Error(error.message);

  const scored: { place: Place; km: number }[] = [];
  for (const row of data ?? []) {
    const p = rowToPlace(row as PlaceRow);
    if (!p) continue;
    const km = haversineDistanceKm(userLat, userLng, p.latitude, p.longitude);
    if (km <= radiusKm) scored.push({ place: p, km });
  }

  scored.sort((a, b) => a.km - b.km);
  return scored.slice(0, limit).map(({ place }) => place);
}
