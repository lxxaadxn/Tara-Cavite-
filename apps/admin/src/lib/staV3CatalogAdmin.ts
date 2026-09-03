import type { SupabaseClient } from '@supabase/supabase-js';
import { collectGalleryImages, formatTimeForInput, parseTimeInput } from './staAttractionMedia';

export type StaHighlight = 'none' | 'red' | 'yellow';

const STA_SELECT =
  'id, sheet_name, ta_name, type_code, ta_category, ntdp_category, city_mun, barangay, address, google_maps_link, latitude, longitude, highlight, is_listed, description, picture, gallery_urls, opening_hours, closing_hours, phone, email, website';

/** Row shape for admin CRUD (matches public.sta_v3_cavite_2025). */
export type StaV3AdminRow = {
  id: string;
  sheet_name: string;
  ta_name: string;
  type_code: string | null;
  ta_category: string | null;
  ntdp_category: string | null;
  city_mun: string | null;
  barangay: string | null;
  address: string | null;
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
  highlight: StaHighlight;
  is_listed: boolean;
  description: string | null;
  picture: string | null;
  gallery_urls: string[] | null;
  opening_hours: string | null;
  closing_hours: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
};

export type StaV3Form = {
  sheet_name: string;
  ta_name: string;
  type_code: string;
  ta_category: string;
  ntdp_category: string;
  city_mun: string;
  barangay: string;
  address: string;
  google_maps_link: string;
  latitude: string;
  longitude: string;
  highlight: StaHighlight;
  description: string;
  openingHours: string;
  closingHours: string;
  phone: string;
  email: string;
  website: string;
};

function isMapsLink(v: string | null | undefined): boolean {
  return /google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(String(v ?? ''));
}

/** Prefer place pin !3dLAT!4dLNG, else /@lat,lng */
export function parseCoordsFromMapsUrl(url: string | null | undefined): {
  lat: number;
  lng: number;
} | null {
  const s = String(url ?? '').trim();
  if (!s) return null;

  const pin = s.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/i);
  if (pin) {
    const lat = parseFloat(pin[1]);
    const lng = parseFloat(pin[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const at = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (at) {
    const lat = parseFloat(at[1]);
    const lng = parseFloat(at[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const q = s.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (q) {
    const lat = parseFloat(q[1]);
    const lng = parseFloat(q[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

function parseCoordInput(v: string | number | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

export function computeIsListed(input: {
  address: string | null | undefined;
  google_maps_link: string | null | undefined;
  highlight: StaHighlight | string | null | undefined;
}): boolean {
  const address = String(input.address ?? '').trim();
  const link = String(input.google_maps_link ?? '').trim();
  const highlight = (input.highlight || 'none') as StaHighlight;
  return Boolean(address && isMapsLink(link) && highlight === 'none');
}

function mapRow(r: Record<string, unknown>): StaV3AdminRow {
  return {
    ...(r as unknown as StaV3AdminRow),
    highlight: (['none', 'red', 'yellow'].includes(String(r.highlight))
      ? r.highlight
      : 'none') as StaHighlight,
    is_listed: Boolean(r.is_listed),
    gallery_urls: Array.isArray(r.gallery_urls) ? (r.gallery_urls as string[]) : [],
  };
}

/** Normalize form → DB payload (coords from fields or Maps URL; is_listed recomputed). */
export function formToDbPayload(form: StaV3Form): Record<string, unknown> {
  const address = String(form.address ?? '').trim() || null;
  const google_maps_link = isMapsLink(form.google_maps_link)
    ? String(form.google_maps_link).trim()
    : null;
  const highlight = (['none', 'red', 'yellow'].includes(form.highlight)
    ? form.highlight
    : 'none') as StaHighlight;

  let latitude = parseCoordInput(form.latitude);
  let longitude = parseCoordInput(form.longitude);
  if ((latitude == null || longitude == null) && google_maps_link) {
    const fromUrl = parseCoordsFromMapsUrl(google_maps_link);
    if (fromUrl) {
      latitude = fromUrl.lat;
      longitude = fromUrl.lng;
    }
  }

  const city_mun = String(form.city_mun ?? '').trim() || null;
  const sheet_name = String(form.sheet_name ?? '').trim() || city_mun || 'Unknown';

  return {
    sheet_name,
    ta_name: String(form.ta_name ?? '').trim(),
    type_code: String(form.type_code ?? '').trim() || null,
    ta_category: String(form.ta_category ?? '').trim() || null,
    ntdp_category: String(form.ntdp_category ?? '').trim() || null,
    city_mun,
    barangay: String(form.barangay ?? '').trim() || null,
    address,
    google_maps_link,
    latitude,
    longitude,
    highlight,
    is_listed: computeIsListed({ address, google_maps_link, highlight }),
    description: String(form.description ?? '').trim() || null,
    opening_hours: parseTimeInput(form.openingHours),
    closing_hours: parseTimeInput(form.closingHours),
    phone: String(form.phone ?? '').trim() || null,
    email: String(form.email ?? '').trim() || null,
    website: String(form.website ?? '').trim() || null,
  };
}

export function rowToForm(row: StaV3AdminRow): StaV3Form {
  return {
    sheet_name: row.sheet_name ?? '',
    ta_name: row.ta_name ?? '',
    type_code: row.type_code ?? '',
    ta_category: row.ta_category ?? '',
    ntdp_category: row.ntdp_category ?? '',
    city_mun: row.city_mun ?? '',
    barangay: row.barangay ?? '',
    address: row.address ?? '',
    google_maps_link: row.google_maps_link ?? '',
    latitude: row.latitude != null ? String(row.latitude) : '',
    longitude: row.longitude != null ? String(row.longitude) : '',
    highlight: row.highlight ?? 'none',
    description: row.description ?? '',
    openingHours: formatTimeForInput(row.opening_hours),
    closingHours: formatTimeForInput(row.closing_hours),
    phone: row.phone ?? '',
    email: row.email ?? '',
    website: row.website ?? '',
  };
}

export function rowImages(row: StaV3AdminRow): string[] {
  return collectGalleryImages(row.picture, row.gallery_urls);
}

export async function fetchStaV3Rows(client: SupabaseClient): Promise<StaV3AdminRow[]> {
  const { data, error } = await client
    .from('sta_v3_cavite_2025')
    .select(STA_SELECT)
    .order('city_mun', { ascending: true })
    .order('ta_name', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
}

export async function insertStaV3Row(
  client: SupabaseClient,
  form: StaV3Form
): Promise<StaV3AdminRow> {
  const payload = formToDbPayload(form);
  if (!payload.ta_name) throw new Error('Name is required');

  const { data, error } = await client
    .from('sta_v3_cavite_2025')
    .insert(payload)
    .select(STA_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function updateStaV3Row(
  client: SupabaseClient,
  id: string,
  form: StaV3Form
): Promise<StaV3AdminRow> {
  const payload = formToDbPayload(form);
  if (!payload.ta_name) throw new Error('Name is required');

  const { data, error } = await client
    .from('sta_v3_cavite_2025')
    .update(payload)
    .eq('id', id)
    .select(STA_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as Record<string, unknown>);
}

export async function deleteStaV3Row(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('sta_v3_cavite_2025').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
