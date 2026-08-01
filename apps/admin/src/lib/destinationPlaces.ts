import { CONTENT_PIPELINE } from 'cavitour-shared';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Admin CRUD against normalized {@link CONTENT_PIPELINE.adminPlacesTable}. */

export type Destination = {
  id: string;
  name: string;
  category: string;
  city: string;
  status: 'active' | 'hidden';
  address: string;
  description: string;
  lat: string;
  lng: string;
  operatingHours: string;
  phone: string;
  email: string;
  website: string;
  socialFacebook: string;
  socialInstagram: string;
  socialTwitter: string;
  images: string[];
  legacyEmoji?: string;
  sourceSlug?: string;
};

export type AdminPlaceRow = {
  establishment_public_id: string;
  ta_name: string;
  address: string;
  type: string | null;
  hours: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
  picture: string | null;
  description: string | null;
  ntdp_category: string | null;
  type_code: string | null;
  city_mun: string | null;
  gallery_urls: string[] | null;
  is_published: boolean | null;
  created_at?: string | null;
};

export function buildSearchableText(d: {
  name: string;
  address: string;
  city: string;
  description: string;
  category: string;
  operatingHours: string;
}): string {
  return [d.name, d.address, d.city, d.description, d.category, d.operatingHours]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .slice(0, 8000);
}

export function adminPlaceRowToDestination(row: AdminPlaceRow): Destination {
  const urls: string[] = [];
  if (row.picture) urls.push(row.picture);
  for (const u of row.gallery_urls ?? []) {
    if (u && !urls.includes(u)) urls.push(u);
  }
  const lat = row.latitude != null ? String(row.latitude) : '';
  const lng = row.longitude != null ? String(row.longitude) : '';
  return {
    id: row.establishment_public_id,
    name: row.ta_name,
    category: row.ntdp_category || row.type || '',
    city: row.city_mun || '',
    status: row.is_published === false ? 'hidden' : 'active',
    address: row.address || '',
    description: row.description || '',
    lat,
    lng,
    operatingHours: row.hours || '',
    phone: '',
    email: '',
    website: '',
    socialFacebook: '',
    socialInstagram: '',
    socialTwitter: '',
    images: urls,
  };
}

export async function fetchAdminDestinations(client: SupabaseClient): Promise<AdminPlaceRow[]> {
  const { data, error } = await client
    .from(CONTENT_PIPELINE.establishmentsView)
    .select(
      'establishment_public_id, ta_name, address, type, hours, latitude, longitude, picture, description, ntdp_category, type_code, city_mun, gallery_urls, is_published, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPlaceRow[];
}

async function resolveLookupIds(
  client: SupabaseClient,
  form: { city: string; category: string }
): Promise<{
  city_id: number | null;
  type_code_id: number | null;
  ta_categories_id: number;
  ntdp_category_id: number | null;
}> {
  const cityName = form.city.trim();
  const category = form.category.trim();

  const [{ data: cities }, { data: types }, { data: cats }, { data: ntdps }] = await Promise.all([
    client.from('cities').select('city_id, city_name'),
    client.from('type_codes').select('type_code_id, type_code'),
    client.from('ta_categories').select('category_id, category_name').order('category_id', { ascending: true }),
    client.from('ntdp_categories').select('ntdp_category_id, ntdp_category_name'),
  ]);

  const fold = (s: string) => s.trim().toLowerCase();
  const city_id =
    (cities ?? []).find((c) => fold(String(c.city_name ?? '')) === fold(cityName))?.city_id ??
    (cities ?? []).find((c) => fold(String(c.city_name ?? '')).startsWith(fold(cityName)))?.city_id ??
    null;

  const type_code_id = (types ?? [])[0]?.type_code_id ?? null;
  const ta_categories_id =
    (cats ?? []).find((c) => fold(String(c.category_name ?? '')) === fold(category))?.category_id ??
    (cats ?? [])[0]?.category_id;
  if (ta_categories_id == null) {
    throw new Error('ta_categories is empty — cannot insert tourist_attractions row');
  }

  const ntdp_category_id =
    (ntdps ?? []).find((n) => fold(String(n.ntdp_category_name ?? '')) === fold(category))
      ?.ntdp_category_id ??
    (ntdps ?? []).find((n) => fold(String(n.ntdp_category_name ?? '')) === 'others')
      ?.ntdp_category_id ??
    (ntdps ?? [])[0]?.ntdp_category_id ??
    null;

  return {
    city_id: city_id == null ? null : Number(city_id),
    type_code_id: type_code_id == null ? null : Number(type_code_id),
    ta_categories_id: Number(ta_categories_id),
    ntdp_category_id: ntdp_category_id == null ? null : Number(ntdp_category_id),
  };
}

async function formToAttractionPayload(
  client: SupabaseClient,
  form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>
) {
  const lat = parseFloat(form.lat);
  const lng = parseFloat(form.lng);
  const lookups = await resolveLookupIds(client, form);
  return {
    ta_name: form.name.trim(),
    address: form.address.trim() || '—',
    latitude: Number.isFinite(lat) ? lat : 0,
    longitude: Number.isFinite(lng) ? lng : 0,
    description: form.description.trim() || null,
    is_published: form.status === 'active',
    ...lookups,
  };
}

export async function insertAdminPlace(
  client: SupabaseClient,
  form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>
) {
  const payload = await formToAttractionPayload(client, form);
  const { data, error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .insert(payload)
    .select('establishment_public_id')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.establishment_public_id as string,
    source_slug: '',
  };
}

export async function updateAdminPlace(
  client: SupabaseClient,
  id: string,
  form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>,
  _existingSourceSlug: string
) {
  const payload = await formToAttractionPayload(client, form);
  const { error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .update(payload)
    .eq('establishment_public_id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAdminPlace(client: SupabaseClient, id: string) {
  const { error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .delete()
    .eq('establishment_public_id', id);
  if (error) throw new Error(error.message);
}

export async function uploadPlaceImage(client: SupabaseClient, placeId: string, file: File): Promise<string> {
  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await client.storage.from(CONTENT_PIPELINE.imageStorageBucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = client.storage.from(CONTENT_PIPELINE.imageStorageBucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function persistGalleryUrls(
  client: SupabaseClient,
  placeId: string,
  imageUrls: string[],
  fileByBlobUrl: Map<string, File>
): Promise<string[]> {
  const out: string[] = [];
  for (const url of imageUrls) {
    if (url.startsWith('blob:')) {
      const file = fileByBlobUrl.get(url);
      if (file) out.push(await uploadPlaceImage(client, placeId, file));
    } else if (url.trim()) {
      out.push(url.trim());
    }
  }
  const { error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .update({
      gallery_urls: out,
      picture: out[0] ?? null,
    })
    .eq('establishment_public_id', placeId);
  if (error) throw new Error(error.message);
  return out;
}
