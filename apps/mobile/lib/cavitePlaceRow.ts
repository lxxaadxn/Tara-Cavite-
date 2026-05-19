import { CONTENT_PIPELINE } from 'cavitour-shared';

/** Supabase view — same for web, mobile, and admin-published destinations. */
export const ESTABLISHMENTS_VIEW = CONTENT_PIPELINE.establishmentsView;

/**
 * Row fields from `v_cavite_establishments`.
 * Keep in sync with apps/web/src/lib/cavitePlaceRow.js and migration 20260510120004.
 */
export const CAVITE_ESTABLISHMENTS_SELECT =
  'id, name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, lgu_slug, source_slug, image_url, gallery_urls, hours, phone, email, website, social_facebook, social_instagram, social_twitter';

export type CaviteEstablishmentRow = {
  id: string;
  name: string;
  ta_name: string;
  type_code: string | null;
  ta_category: string | null;
  ntdp_category: string | null;
  city_mun: string | null;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  description: string | null;
  searchable_text: string | null;
  created_at?: string | null;
  lgu_slug: string | null;
  source_slug?: string | null;
  image_url?: string | null;
  gallery_urls?: string[] | null;
  hours?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  social_facebook?: string | null;
  social_instagram?: string | null;
  social_twitter?: string | null;
};

export function isAdminCuratedRow(row: { source_slug?: string | null; lgu_slug?: string | null }): boolean {
  const slug = String(row?.source_slug ?? row?.lgu_slug ?? '');
  return slug.startsWith('admin:') || row?.lgu_slug === 'admin';
}

export function collectRemoteMediaUrls(row: {
  image_url?: string | null;
  gallery_urls?: string[] | null;
}): string[] {
  const urls: string[] = [];
  const primary = row?.image_url && String(row.image_url).trim();
  if (primary) urls.push(primary);
  for (const u of row?.gallery_urls ?? []) {
    const s = u && String(u).trim();
    if (s && !urls.includes(s)) urls.push(s);
  }
  return urls;
}
