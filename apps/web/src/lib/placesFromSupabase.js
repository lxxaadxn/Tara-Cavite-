/**
 * Cavite establishments via public.places (synced from STA inventory + admin destinations).
 */
import { enrichPlaceWithLocalEstablishmentMedia } from './establishmentLocalImages';

/** Log PostgREST errors in dev (missing table, RLS, column mismatch). */
export function logPlacesFetchError(context, error) {
  const message = error instanceof Error ? error.message : String(error ?? 'unknown');
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(`[placesFromSupabase] ${context}:`, message);
  }
}

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

/** Columns present on all deployed `places` tables (live DB may lack searchable_text, lgu_slug, gallery_urls). */
const PLACES_SELECT_CORE =
  'id, name, address, type, hours, latitude, longitude, image_url, description, ntdp_category, type_code, city_mun, barangay, source_slug, created_at';

const PLACES_SELECT_VARIANTS = [
  PLACES_SELECT_CORE,
  `${PLACES_SELECT_CORE}, gallery_urls`,
  `${PLACES_SELECT_CORE}, searchable_text, lgu_slug`,
  `${PLACES_SELECT_CORE}, searchable_text, lgu_slug, gallery_urls`,
];

function parseCoord(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function normalizeGalleryUrls(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => (u == null ? '' : String(u).trim())).filter(Boolean);
}

function applyCatalogMedia(place) {
  const hasDbImage = Boolean(place.imageUrl?.trim());
  const hasDbGallery = Boolean(place.galleryUrls?.length);
  if (hasDbImage || hasDbGallery) return place;
  return enrichPlaceWithLocalEstablishmentMedia(place);
}

/** Published catalog rows with coordinates. */
function publishedPlacesQuery(client, selectCols = PLACES_SELECT_CORE) {
  return client
    .from('places')
    .select(selectCols)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
}

async function queryPublishedPlaces(client, builder) {
  let lastError = null;
  for (const selectCols of PLACES_SELECT_VARIANTS) {
    const base = publishedPlacesQuery(client, selectCols);
    const attempts = [
      () => builder(base),
      () => builder(base.or('is_published.is.null,is_published.eq.true')),
    ];
    for (const run of attempts) {
      const { data, error } = await run();
      if (!error) return data ?? [];
      lastError = error;
      const msg = String(error.message ?? '');
      if (/column.*does not exist/i.test(msg) && msg.includes('is_published')) continue;
      break;
    }
  }
  throw new Error(lastError?.message ?? 'places query failed');
}

/** Normalize Supabase places row → UI place */
export function rowToPlace(row) {
  const lat = parseCoord(row.latitude);
  const lng = parseCoord(row.longitude);
  if (lat == null || lng == null) return null;

  const galleryUrls = normalizeGalleryUrls(row.gallery_urls);
  const imageUrl = row.image_url?.trim() || galleryUrls[0] || null;
  const taCategory = row.type?.trim() || null;

  return applyCatalogMedia({
    id: row.id,
    name: row.name,
    address: row.address ?? '',
    type: taCategory || row.type_code || 'Place',
    hours: row.hours ?? '',
    lat,
    lng,
    imageUrl,
    galleryUrls: galleryUrls.length ? galleryUrls : imageUrl ? [imageUrl] : [],
    description: row.description,
    ntdp_category: row.ntdp_category,
    city_mun: row.city_mun ?? null,
    barangay: row.barangay ?? null,
    lgu_slug: row.lgu_slug,
    ta_category: taCategory,
    type_code: row.type_code ?? null,
    created_at: row.created_at ?? null,
    searchable_text: row.searchable_text ?? null,
    source_slug: row.source_slug ?? null,
  });
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
    `type.ilike.${pattern}`,
    `address.ilike.${pattern}`,
    `city_mun.ilike.${pattern}`,
    `ntdp_category.ilike.${pattern}`,
    `type_code.ilike.${pattern}`,
    `description.ilike.${pattern}`,
  ].join(',');

  const rows = await queryPublishedPlaces(client, (q) => q.or(orFilter).limit(fetchCap));

  const seen = new Map();
  for (const row of rows) {
    const p = rowToPlace(row);
    if (!p) continue;
    if (!seen.has(p.id)) seen.set(p.id, p);
  }

  return Array.from(seen.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limit);
}

export async function fetchTrendingPlacesFromSupabase(client, limit = 120) {
  const rows = await queryPublishedPlaces(client, (q) =>
    q.order('created_at', { ascending: false }).limit(limit)
  );

  const out = [];
  for (const row of rows) {
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
    const rows = await queryPublishedPlaces(client, (q) =>
      q.order('created_at', { ascending: false }).range(from, to)
    );
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
  const rows = await queryPublishedPlaces(client, (q) => q.eq('id', id).limit(1));
  return rows[0] ? rowToPlace(rows[0]) : null;
}
