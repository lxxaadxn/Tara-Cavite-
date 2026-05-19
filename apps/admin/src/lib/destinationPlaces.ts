import { CONTENT_PIPELINE } from 'cavitour-shared';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Admin table; web/mobile read {@link CONTENT_PIPELINE.establishmentsView}. */

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
  /** DB-only: stable admin source key */
  sourceSlug?: string;
};

export type AdminPlaceRow = {
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
  source_slug: string | null;
  type_code: string | null;
  city_mun: string | null;
  gallery_urls: string[] | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  social_facebook: string | null;
  social_instagram: string | null;
  social_twitter: string | null;
  searchable_text: string | null;
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
  if (row.image_url) urls.push(row.image_url);
  for (const u of row.gallery_urls ?? []) {
    if (u && !urls.includes(u)) urls.push(u);
  }
  const lat = row.latitude != null ? String(row.latitude) : '';
  const lng = row.longitude != null ? String(row.longitude) : '';
  return {
    id: row.id,
    name: row.name,
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
    socialFacebook: row.social_facebook || '',
    socialInstagram: row.social_instagram || '',
    socialTwitter: row.social_twitter || '',
    images: urls,
    sourceSlug: row.source_slug ?? undefined,
  };
}

export async function fetchAdminDestinations(client: SupabaseClient): Promise<AdminPlaceRow[]> {
  const { data, error } = await client
    .from('places')
    .select(
      'id, name, address, type, hours, latitude, longitude, image_url, description, ntdp_category, source_slug, type_code, city_mun, gallery_urls, phone, email, website, social_facebook, social_instagram, social_twitter, searchable_text, is_published, created_at'
    )
    .like('source_slug', 'admin:%')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AdminPlaceRow[];
}

function formToPlacePayload(form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>, sourceSlug: string) {
  const lat = parseFloat(form.lat);
  const lng = parseFloat(form.lng);
  return {
    name: form.name.trim(),
    address: form.address.trim() || '—',
    type: form.category.trim() || 'Destination',
    hours: form.operatingHours.trim() || null,
    latitude: Number.isFinite(lat) ? lat : null,
    longitude: Number.isFinite(lng) ? lng : null,
    description: form.description.trim() || null,
    ntdp_category: form.category.trim() || null,
    type_code: null,
    city_mun: form.city.trim() || null,
    source_slug: sourceSlug,
    phone: form.phone.trim() || null,
    email: form.email.trim() || null,
    website: form.website.trim() || null,
    social_facebook: form.socialFacebook.trim() || null,
    social_instagram: form.socialInstagram.trim() || null,
    social_twitter: form.socialTwitter.trim() || null,
    searchable_text: buildSearchableText({
      name: form.name,
      address: form.address,
      city: form.city,
      description: form.description,
      category: form.category,
      operatingHours: form.operatingHours,
    }),
    is_published: form.status === 'active',
    lgu_slug: 'admin',
  };
}

export async function insertAdminPlace(client: SupabaseClient, form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>) {
  const sourceSlug = `admin:${crypto.randomUUID()}`;
  const payload = formToPlacePayload(form, sourceSlug);
  const { data, error } = await client.from('places').insert(payload).select('id, source_slug').single();
  if (error) throw new Error(error.message);
  return { id: data.id as string, source_slug: data.source_slug as string };
}

export async function updateAdminPlace(
  client: SupabaseClient,
  id: string,
  form: Omit<Destination, 'id' | 'legacyEmoji' | 'sourceSlug'>,
  existingSourceSlug: string
) {
  const { source_slug: _slug, ...payload } = formToPlacePayload(form, existingSourceSlug);
  const { error } = await client.from('places').update(payload).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAdminPlace(client: SupabaseClient, id: string) {
  const { error } = await client.from('places').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function uploadPlaceImage(client: SupabaseClient, placeId: string, file: File): Promise<string> {
  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const ext = rawExt.replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error } = await client.storage.from('place-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = client.storage.from('place-images').getPublicUrl(path);
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
    .from('places')
    .update({
      gallery_urls: out,
      image_url: out[0] ?? null,
    })
    .eq('id', placeId);
  if (error) throw new Error(error.message);
  return out;
}
