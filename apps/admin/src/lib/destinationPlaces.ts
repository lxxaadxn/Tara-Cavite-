import { CONTENT_PIPELINE } from 'cavitour-shared';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Admin helpers against {@link CONTENT_PIPELINE.adminPlacesTable} (sta_v3_cavite_2025). */

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
  phone?: string | null;
  email?: string | null;
  website?: string | null;
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
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
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
      'establishment_public_id, ta_name, address, type, hours, latitude, longitude, picture, description, ntdp_category, type_code, city_mun, gallery_urls, is_published, phone, email, website, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPlaceRow[];
}

function formToStaPayload(form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>) {
  const lat = parseFloat(form.lat);
  const lng = parseFloat(form.lng);
  const city_mun = form.city.trim() || null;
  const address = form.address.trim() || null;
  const highlight = form.status === 'active' ? 'none' : 'red';
  const is_listed = Boolean(address && form.status === 'active');
  return {
    sheet_name: city_mun || 'Unknown',
    ta_name: form.name.trim(),
    address,
    city_mun,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    description: form.description.trim() || null,
    ntdp_category: form.category.trim() || null,
    ta_category: form.category.trim() || null,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    website: form.website.trim() || null,
    highlight,
    is_listed,
  };
}

export async function insertAdminPlace(
  client: SupabaseClient,
  form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>
) {
  const payload = formToStaPayload(form);
  const { data, error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .insert(payload)
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return {
    id: data.id as string,
    source_slug: '',
  };
}

export async function updateAdminPlace(
  client: SupabaseClient,
  id: string,
  form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>,
  _existingSourceSlug: string
) {
  const payload = formToStaPayload(form);
  const { error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .update(payload)
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAdminPlace(client: SupabaseClient, id: string) {
  const { error } = await client
    .from(CONTENT_PIPELINE.adminPlacesTable)
    .delete()
    .eq('id', id);
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
    .eq('id', placeId);
  if (error) throw new Error(error.message);
  return out;
}
