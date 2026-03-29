import type { SupabaseClient } from '@supabase/supabase-js';
import type { Place } from '../data/mockData';

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
  'id, name, address, type, hours, latitude, longitude, image_url, description, ntdp_category';

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
  if (row.description) p.description = row.description;
  if (row.ntdp_category) p.ntdp_category = row.ntdp_category;
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
