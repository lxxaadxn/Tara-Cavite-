/**
 * Cavite establishments via CONTENT_PIPELINE.establishmentsView
 * (v_sta_v3_cavite_2025_catalog — STA membership, coords, hours, media, contact).
 */
import { getDemoEstablishmentById } from 'cavitour-shared/demoPlaces';
import { CONTENT_PIPELINE } from 'cavitour-shared';
import { enrichPlaceWithLocalEstablishmentMedia } from './establishmentLocalImages';

const CATALOG_TABLE = CONTENT_PIPELINE.establishmentsView;

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

const CATALOG_SELECT =
  'establishment_public_id, ta_name, address, type, hours, latitude, longitude, picture, gallery_urls, description, ntdp_category, type_code, city_mun, is_published, created_at, phone, email, website';

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

/** Normalize catalog view (or demo) row → internal catalog row. */
function normalizeCatalogRow(row) {
  if (!row || typeof row !== 'object') return null;
  return {
    id: row.establishment_public_id ?? row.id,
    name: row.ta_name ?? row.name,
    address: row.address,
    type: row.type,
    hours: row.hours,
    phone: row.phone ?? null,
    email: row.email ?? null,
    website: row.website ?? null,
    latitude: row.latitude,
    longitude: row.longitude,
    image_url: row.picture ?? row.image_url ?? null,
    gallery_urls: row.gallery_urls ?? null,
    description: row.description,
    ntdp_category: row.ntdp_category,
    type_code: row.type_code,
    city_mun: row.city_mun,
    is_published: row.is_published,
    created_at: row.created_at,
  };
}

/** Listed catalog rows with coordinates (STA is_listed → is_published). */
function publishedCatalogQuery(client) {
  return client
    .from(CATALOG_TABLE)
    .select(CATALOG_SELECT)
    .eq('is_published', true)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null);
}

async function queryPublishedPlaces(client, builder) {
  let lastError = null;
  const attempts = [
    () => builder(publishedCatalogQuery(client)),
    // Fallback if view lacks is_published
    () =>
      builder(
        client
          .from(CATALOG_TABLE)
          .select(CATALOG_SELECT)
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
      ),
  ];
  for (const run of attempts) {
    const { data, error } = await run();
    if (!error) return (data ?? []).map(normalizeCatalogRow).filter(Boolean);
    lastError = error;
    const msg = String(error.message ?? '');
    if (/column.*does not exist/i.test(msg) && msg.includes('is_published')) continue;
    break;
  }
  throw new Error(lastError?.message ?? 'STA catalog query failed');
}

/** Normalize catalog row → UI place */
export function rowToPlace(row) {
  const normalized = normalizeCatalogRow(row) ?? row;
  const lat = parseCoord(normalized.latitude);
  const lng = parseCoord(normalized.longitude);
  if (lat == null || lng == null) return null;

  const galleryUrls = normalizeGalleryUrls(normalized.gallery_urls);
  const imageUrl = normalized.image_url?.trim() || galleryUrls[0] || null;
  const taCategory = normalized.type?.trim() || null;

  return applyCatalogMedia({
    id: normalized.id,
    name: normalized.name,
    address: normalized.address ?? '',
    type: taCategory || normalized.type_code || 'Place',
    hours: normalized.hours ?? '',
    phone: normalized.phone ?? null,
    email: normalized.email ?? null,
    website: normalized.website ?? null,
    lat,
    lng,
    imageUrl,
    galleryUrls: galleryUrls.length ? galleryUrls : imageUrl ? [imageUrl] : [],
    description: normalized.description,
    ntdp_category: normalized.ntdp_category,
    city_mun: normalized.city_mun ?? null,
    ta_category: taCategory,
    type_code: normalized.type_code ?? null,
    created_at: normalized.created_at ?? null,
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
    `ta_name.ilike.${pattern}`,
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
  const key = String(id ?? '').trim();
  if (!key) return null;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key);
  if (isUuid) {
    try {
      const rows = await queryPublishedPlaces(client, (q) =>
        q.eq('establishment_public_id', key).limit(1)
      );
      if (rows[0]) return rowToPlace(rows[0]);
    } catch {
      /* fall through to bundled demo */
    }
  }

  const demoRow = getDemoEstablishmentById(key);
  return demoRow ? rowToPlace(demoRow) : null;
}
