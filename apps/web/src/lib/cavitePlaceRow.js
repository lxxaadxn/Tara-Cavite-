import { CONTENT_PIPELINE } from 'cavitour-shared';

/** Supabase view — same for web, mobile, and admin-published destinations. */
export const ESTABLISHMENTS_VIEW = CONTENT_PIPELINE.establishmentsView;

/**
 * Row fields from `v_cavite_establishments`.
 * Keep in sync with apps/mobile/lib/cavitePlaceRow.ts and migration 20260510120004.
 */
export const CAVITE_ESTABLISHMENTS_SELECT =
  'id, name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, lgu_slug, source_slug, image_url, gallery_urls, hours, phone, email, website, social_facebook, social_instagram, social_twitter';

export function isAdminCuratedRow(row) {
  const slug = String(row?.source_slug ?? row?.lgu_slug ?? '');
  return slug.startsWith('admin:') || row?.lgu_slug === 'admin';
}

/** Remote image URLs from admin uploads (image_url + gallery_urls). */
export function collectRemoteMediaUrls(row) {
  const urls = [];
  const primary = row?.image_url && String(row.image_url).trim();
  if (primary) urls.push(primary);
  const gallery = row?.gallery_urls;
  if (Array.isArray(gallery)) {
    for (const u of gallery) {
      const s = u && String(u).trim();
      if (s && !urls.includes(s)) urls.push(s);
    }
  }
  return urls;
}
