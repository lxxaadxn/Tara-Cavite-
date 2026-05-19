import type { SupabaseClient } from '@supabase/supabase-js';
import type { Place } from '../data/mockData';
import { enrichPlaceWithLocalEstablishmentMedia } from './establishmentLocalImages';
import { normalizeNtdpCopy } from './ntdpDisplayLabels';
import {
  CAVITE_ESTABLISHMENTS_SELECT,
  ESTABLISHMENTS_VIEW,
  collectRemoteMediaUrls,
  isAdminCuratedRow,
  type CaviteEstablishmentRow,
} from './cavitePlaceRow';

/** Alias for screens that still import `PlaceRow`. */
export type PlaceRow = CaviteEstablishmentRow;
export type CavitePlaceRow = CaviteEstablishmentRow;

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

/** Map Cavite view row → Place (mockData shape). Admin CMS rows use remote image URLs. */
export function rowToPlace(row: CavitePlaceRow): Place | null {
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  if (lat == null || lng == null) return null;

  const adminCurated = isAdminCuratedRow(row);
  const remoteUrls = collectRemoteMediaUrls(row);

  const p: Place = {
    id: row.id,
    name: row.name ?? row.ta_name,
    address: row.address,
    type: row.ta_category || row.type_code || 'Place',
    hours: row.hours?.trim() || '',
    latitude: lat,
    longitude: lng,
  };

  if (row.description) p.description = normalizeNtdpCopy(row.description);
  if (row.ntdp_category) p.ntdp_category = normalizeNtdpCopy(row.ntdp_category);
  if (row.city_mun) p.city_mun = row.city_mun;
  if (row.created_at) p.created_at = row.created_at;
  if (row.searchable_text) p.searchable_text = row.searchable_text;
  if (row.type_code) p.type_code = row.type_code;
  if (row.ta_category) p.ta_category = row.ta_category;
  if (row.lgu_slug) p.lgu_slug = row.lgu_slug;
  if (row.source_slug) p.source_slug = row.source_slug;
  if (row.phone?.trim()) p.phone = row.phone.trim();
  if (row.email?.trim()) p.email = row.email.trim();
  if (row.website?.trim()) p.website = row.website.trim();
  if (row.social_facebook?.trim()) p.social_facebook = row.social_facebook.trim();
  if (row.social_instagram?.trim()) p.social_instagram = row.social_instagram.trim();
  if (row.social_twitter?.trim()) p.social_twitter = row.social_twitter.trim();

  if (remoteUrls.length) {
    p.image = { uri: remoteUrls[0] };
    p.gallery = remoteUrls.map((uri) => ({ uri }));
  }

  if (adminCurated || remoteUrls.length) {
    return p;
  }
  return enrichPlaceWithLocalEstablishmentMedia(p);
}

function sanitizeSearchToken(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,()]/g, ' ')
    .replace(/['"`]/g, ' ')
    .replace(/\./g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 120);
}

function foldSearchText(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

function scoreMatch(place: Place, query: string): number {
  const q = foldSearchText(query);
  const name = foldSearchText(place.name);
  const addr = foldSearchText(place.address);
  const city = foldSearchText(place.city_mun ?? '');
  const haystack = `${name} ${addr} ${city}`;
  if (!q || !haystack.includes(q)) return Number.MAX_SAFE_INTEGER;
  const inName = name.indexOf(q);
  if (inName >= 0) return inName;
  const inAddr = addr.indexOf(q);
  if (inAddr >= 0) return 100 + inAddr;
  const inCity = city.indexOf(q);
  if (inCity >= 0) return 200 + inCity;
  return 300;
}

export async function searchPlacesByText(
  client: SupabaseClient,
  rawQuery: string,
  limit = 25
): Promise<Place[]> {
  const safe = sanitizeSearchToken(rawQuery);
  if (!safe) return [];

  const fetchCap = 3000;
  const { data, error } = await client
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(fetchCap);
  if (error) throw new Error(error.message);

  const q = foldSearchText(safe);
  const qTokens = q.split(' ').filter(Boolean);

  const scored: { place: Place; score: number }[] = [];
  for (const row of (data ?? []) as CavitePlaceRow[]) {
    const p = rowToPlace(row);
    if (!p) continue;
    const searchable = foldSearchText(
      [
        row.name,
        row.ta_name,
        row.address,
        row.city_mun ?? '',
        row.searchable_text ?? '',
        row.ta_category ?? '',
        row.ntdp_category ?? '',
        row.type_code ?? '',
        row.description ?? '',
      ]
        .filter(Boolean)
        .join(' ')
    );
    if (!qTokens.every((tok) => searchable.includes(tok))) continue;
    const score = scoreMatch(p, safe);
    scored.push({ place: p, score });
  }

  return scored
    .sort((a, b) => a.score - b.score || a.place.name.localeCompare(b.place.name))
    .slice(0, limit)
    .map((x) => x.place);
}

export async function fetchTrendingPlacesFromSupabase(
  client: SupabaseClient,
  limit = 40
): Promise<Place[]> {
  const { data, error } = await client
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
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
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
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

/** Large pool for dashboard filtering (client-side city/category toggles). */
export async function fetchDashboardPlacesPool(client: SupabaseClient, limit = 1500): Promise<Place[]> {
  const cap = Math.min(Math.max(limit, 1), 3000);
  const { data, error } = await client
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('created_at', { ascending: false })
    .limit(cap);

  if (error) throw new Error(error.message);

  const out: Place[] = [];
  for (const row of data ?? []) {
    const p = rowToPlace(row as CavitePlaceRow);
    if (p) out.push(p);
  }
  return out;
}

export async function fetchPlaceById(client: SupabaseClient, id: string): Promise<Place | null> {
  const { data, error } = await client
    .from(ESTABLISHMENTS_VIEW)
    .select(CAVITE_ESTABLISHMENTS_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToPlace(data as CavitePlaceRow) : null;
}
