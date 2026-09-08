import { CONTENT_PIPELINE } from 'cavitour-shared';
import { supabase } from './supabase';

/**
 * The owner's catalog row: the traveler-facing content behind their listing.
 * Read straight from the base table, because the public catalog view swaps an
 * empty description for a synthetic "NTDP: … STA-v3 Cavite 2025 (…)" string that
 * must never land in the owner's textarea.
 */

const TABLE = CONTENT_PIPELINE.adminPlacesTable;
const BUCKET = CONTENT_PIPELINE.imageStorageBucket;

const SELECT =
  'id, ta_name, description, picture, gallery_urls, opening_hours, closing_hours, phone, email, website, address, barangay, city_mun, ta_category, ntdp_category, type_code, latitude, longitude, google_maps_link, is_listed, highlight';

/** "09:30:00" or "09:30:00+00" -> "09:30" for <input type="time">. */
export function timeForInput(value) {
  const match = String(value ?? '')
    .trim()
    .match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
}

export function galleryFrom(picture, galleryUrls) {
  const urls = [];
  const cover = String(picture ?? '').trim();
  if (cover) urls.push(cover);
  for (const raw of galleryUrls ?? []) {
    const url = String(raw ?? '').trim();
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

function mapListing(row) {
  return {
    id: String(row.id),
    name: String(row.ta_name ?? '').trim(),
    description: String(row.description ?? '').trim(),
    gallery: galleryFrom(row.picture, row.gallery_urls),
    openingHours: timeForInput(row.opening_hours),
    closingHours: timeForInput(row.closing_hours),
    phone: String(row.phone ?? '').trim(),
    email: String(row.email ?? '').trim(),
    website: String(row.website ?? '').trim(),
    address: String(row.address ?? '').trim(),
    barangay: String(row.barangay ?? '').trim(),
    cityMun: String(row.city_mun ?? '').trim(),
    taCategory: String(row.ta_category ?? '').trim(),
    ntdpCategory: String(row.ntdp_category ?? '').trim(),
    typeCode: String(row.type_code ?? '').trim(),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    googleMapsLink: String(row.google_maps_link ?? '').trim(),
    isListed: row.is_listed === true,
    highlight: String(row.highlight ?? 'none'),
  };
}

export async function fetchOwnListing(placeId) {
  if (!placeId) return null;
  const { data, error } = await supabase.from(TABLE).select(SELECT).eq('id', placeId).maybeSingle();
  if (error || !data) return null;
  return mapListing(data);
}

function isMapsLink(value) {
  return /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(String(value ?? ''));
}

/**
 * Why a listing is still hidden from travelers. Mirrors computeIsListed in the
 * admin catalog helpers, which is what actually flips is_listed.
 */
export function listingBlockers(listing) {
  if (!listing) return [];
  const reasons = [];
  if (!listing.address) reasons.push('an address');
  if (!isMapsLink(listing.googleMapsLink)) reasons.push('a Google Maps link');
  if (listing.highlight === 'red') reasons.push('the tourism office to clear its hidden flag');
  return reasons;
}

export async function saveOwnListing(input) {
  const { error } = await supabase.rpc('update_my_establishment_listing', {
    p_description: input.description ?? '',
    p_gallery_urls: input.gallery ?? [],
    p_opening_hours: input.openingHours ?? '',
    p_closing_hours: input.closingHours ?? '',
    p_phone: input.phone ?? '',
    p_email: input.email ?? '',
    p_website: input.website ?? '',
    p_address: input.address ?? '',
    p_google_maps_link: input.googleMapsLink ?? '',
    // Null leaves the saved pin alone; the RPC never clears coordinates.
    p_latitude: Number.isFinite(input.latitude) ? input.latitude : null,
    p_longitude: Number.isFinite(input.longitude) ? input.longitude : null,
  });
  if (error) {
    const msg = String(error.message ?? '');
    if (/function .* does not exist|schema cache/i.test(msg)) {
      throw new Error(
        'Saving is not enabled yet. Ask the Cavite Tourism Administration to run ESTABLISHMENT_PORTAL.sql.'
      );
    }
    throw new Error(msg || 'Could not save your listing.');
  }
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export async function uploadListingPhoto(placeId, file) {
  if (!placeId) throw new Error('No listing is linked to this account yet.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > MAX_PHOTO_BYTES) throw new Error('Please choose an image under 5 MB.');

  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ext = ['jpg', 'jpeg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  // The folder is the place id, which is what the owner storage policy checks.
  const path = `${placeId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  });
  if (error) {
    if (/policy|permission|row-level security|denied/i.test(error.message || '')) {
      throw new Error(
        'Photo uploads are not enabled yet. Ask the Cavite Tourism Administration to run ESTABLISHMENT_PORTAL.sql.'
      );
    }
    throw new Error(error.message || 'Could not upload the photo.');
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
