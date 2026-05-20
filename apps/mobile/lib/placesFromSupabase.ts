import type { SupabaseClient } from '@supabase/supabase-js';
import { getDemoEstablishmentById } from 'cavitour-shared/demoPlaces';
import type { Place } from '../data/mockData';
import { enrichPlaceWithLocalEstablishmentMedia } from './establishmentLocalImages';
import { normalizeNtdpCopy } from './ntdpDisplayLabels';

/** Log PostgREST errors (missing table, RLS, column mismatch). */
export function logPlacesFetchError(context: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown');
  if (__DEV__) {
    console.warn(`[placesFromSupabase] ${context}:`, message);
  }
}

export type PlacesCatalogRow = {
  id: string;
  name: string;
  address: string;
  type: string | null;
  hours: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  description: string | null;
  ntdp_category: string | null;
  type_code: string | null;
  city_mun: string | null;
  barangay: string | null;
  searchable_text: string | null;
  source_slug: string | null;
  lgu_slug: string | null;
  created_at?: string | null;
};

/** Alias for screens that still import `PlaceRow`. */
export type PlaceRow = PlacesCatalogRow;
/** @deprecated Use PlacesCatalogRow */
export type CavitePlaceRow = PlacesCatalogRow;

const PLACES_SELECT_CORE =
  'id, name, address, type, hours, latitude, longitude, image_url, description, ntdp_category, type_code, city_mun, barangay, source_slug, created_at';

const PLACES_SELECT_VARIANTS = [
  PLACES_SELECT_CORE,
  `${PLACES_SELECT_CORE}, gallery_urls`,
  `${PLACES_SELECT_CORE}, searchable_text, lgu_slug`,
  `${PLACES_SELECT_CORE}, searchable_text, lgu_slug, gallery_urls`,
];

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

function normalizeGalleryUrls(raw: string[] | null | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => u?.trim()).filter(Boolean) as string[];
}

function galleryToImageSources(urls: string[]): Array<{ uri: string }> {
  return urls.map((uri) => ({ uri }));
}

function applyCatalogMedia(place: Place): Place {
  const hasImage =
    (typeof place.image === 'string' && place.image.trim()) ||
    (typeof place.image === 'number') ||
    (typeof place.image === 'object' && place.image != null);
  const hasGallery = Boolean(place.gallery?.length);
  if (hasImage || hasGallery) return place;
  return enrichPlaceWithLocalEstablishmentMedia(place);
}

function publishedPlacesQuery(client: SupabaseClient, selectCols = PLACES_SELECT_CORE) {
  return client
    .from('places')
    .select(selectCols)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
}

async function queryPublishedPlaces<T>(
  client: SupabaseClient,
  builder: (q: ReturnType<typeof publishedPlacesQuery>) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  let lastError: { message: string } | null = null;
  for (const selectCols of PLACES_SELECT_VARIANTS) {
    const base = publishedPlacesQuery(client, selectCols);
    const attempts = [() => builder(base), () => builder(base.or('is_published.is.null,is_published.eq.true'))];
    for (const run of attempts) {
      const { data, error } = await run();
      if (!error) return (data ?? []) as T[];
      lastError = error;
      const msg = String(error.message ?? '');
      if (/column.*does not exist/i.test(msg) && msg.includes('is_published')) continue;
      break;
    }
  }
  throw new Error(lastError?.message ?? 'places query failed');
}

/** Map public.places row → Place (mockData shape). */
export function rowToPlace(row: PlacesCatalogRow): Place | null {
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  if (lat == null || lng == null) return null;

  const galleryUrls = normalizeGalleryUrls(row.gallery_urls);
  const imageUrl = row.image_url?.trim() || galleryUrls[0] || '';
  const taCategory = row.type?.trim() || null;

  const p: Place = {
    id: row.id,
    name: row.name,
    address: row.address,
    type: taCategory || row.type_code || 'Place',
    hours: row.hours ?? '',
    latitude: lat,
    longitude: lng,
  };

  if (imageUrl) p.image = imageUrl;
  if (galleryUrls.length) p.gallery = galleryToImageSources(galleryUrls);
  else if (imageUrl) p.gallery = galleryToImageSources([imageUrl]);

  if (row.description) p.description = normalizeNtdpCopy(row.description);
  if (row.ntdp_category) p.ntdp_category = normalizeNtdpCopy(row.ntdp_category);
  if (row.city_mun) p.city_mun = row.city_mun;
  if (row.created_at) p.created_at = row.created_at;
  if (row.searchable_text) p.searchable_text = row.searchable_text;
  if (row.type_code) p.type_code = row.type_code;
  if (taCategory) p.ta_category = taCategory;
  if (row.lgu_slug) p.lgu_slug = row.lgu_slug;

  return applyCatalogMedia(p);
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
  const data = await queryPublishedPlaces(client, (q) => q.limit(fetchCap));

  const qTokens = foldSearchText(safe).split(' ').filter(Boolean);

  const scored: { place: Place; score: number }[] = [];
  for (const row of data as PlacesCatalogRow[]) {
    const p = rowToPlace(row);
    if (!p) continue;
    const searchable = foldSearchText(
      [
        row.name,
        row.address,
        row.city_mun ?? '',
        row.searchable_text ?? '',
        row.type ?? '',
        row.ntdp_category ?? '',
        row.type_code ?? '',
        row.description ?? '',
      ]
        .filter(Boolean)
        .join(' ')
    );
    if (!qTokens.every((tok) => searchable.includes(tok))) continue;
    scored.push({ place: p, score: scoreMatch(p, safe) });
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
  const data = await queryPublishedPlaces(client, (q) =>
    q.order('created_at', { ascending: false }).limit(limit)
  );

  const out: Place[] = [];
  for (const row of data) {
    const p = rowToPlace(row as PlacesCatalogRow);
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

  const data = await queryPublishedPlaces(client, (q) =>
    q
      .gte('latitude', bbox.latMin)
      .lte('latitude', bbox.latMax)
      .gte('longitude', bbox.lngMin)
      .lte('longitude', bbox.lngMax)
  );

  const scored: { place: Place; km: number }[] = [];
  for (const row of data) {
    const p = rowToPlace(row as PlacesCatalogRow);
    if (!p) continue;
    const km = haversineDistanceKm(userLat, userLng, p.latitude, p.longitude);
    if (km <= radiusKm) scored.push({ place: p, km });
  }

  scored.sort((a, b) => a.km - b.km);
  return scored.slice(0, limit).map(({ place }) => place);
}

export async function fetchDashboardPlacesPool(client: SupabaseClient, limit = 1500): Promise<Place[]> {
  const cap = Math.min(Math.max(limit, 1), 3000);
  const data = await queryPublishedPlaces(client, (q) =>
    q.order('created_at', { ascending: false }).limit(cap)
  );

  const out: Place[] = [];
  for (const row of data) {
    const p = rowToPlace(row as PlacesCatalogRow);
    if (p) out.push(p);
  }
  return out;
}

/** Full published catalog (paginated) — use for demo browse / about every establishment. */
export async function fetchAllPlacesFromSupabase(
  client: SupabaseClient,
  pageSize = 1000
): Promise<Place[]> {
  const size = Math.min(Math.max(pageSize, 100), 1000);
  const seen = new Map<string, Place>();
  let from = 0;

  while (true) {
    const to = from + size - 1;
    const data = await queryPublishedPlaces(client, (q) =>
      q.order('name', { ascending: true }).range(from, to)
    );
    for (const row of data as PlacesCatalogRow[]) {
      const p = rowToPlace(row);
      if (p && !seen.has(p.id)) seen.set(p.id, p);
    }
    if (data.length < size) break;
    from += size;
  }

  return Array.from(seen.values());
}

export async function fetchPlaceById(client: SupabaseClient, id: string): Promise<Place | null> {
  const key = String(id ?? '').trim();
  if (!key) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  if (isUuid) {
    try {
      const data = await queryPublishedPlaces(client, (q) => q.eq('id', key).limit(1));
      if (data[0]) return rowToPlace(data[0] as PlacesCatalogRow);
    } catch {
      /* demo fallback below */
    }
  }

  const demoRow = getDemoEstablishmentById(key);
  if (!demoRow) return null;
  return rowToPlace(demoRow as PlacesCatalogRow);
}
