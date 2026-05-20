/**
 * Shared helpers for public marketing pages (landing, auth panels).
 */
import { fetchAllPlacesFromSupabase } from './placesFromSupabase';
import { formatNtdpCategoryTagLabel } from './ntdpDisplayLabels';

export const MARKETING_PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

function hasMedia(place) {
  return Boolean(place?.imageUrl?.trim() || place?.galleryUrls?.[0]);
}

function isRemoteUrl(url) {
  return /^https?:\/\//i.test(String(url ?? '').trim());
}

function normalizeCategoryKey(raw) {
  const s = String(raw ?? '').trim().toLowerCase();
  return s || 'other';
}

function placeImage(place) {
  return place?.imageUrl?.trim() || place?.galleryUrls?.[0] || MARKETING_PLACEHOLDER_IMG;
}

function placeToDestinationCard(place) {
  const categoryKey = normalizeCategoryKey(place.ntdp_category);
  const categoryLabel = place.ntdp_category
    ? formatNtdpCategoryTagLabel(place.ntdp_category)
    : place.type || 'Place';
  const city = place.city_mun?.trim();
  const metaParts = [city, categoryLabel].filter(Boolean);
  return {
    id: place.id,
    name: place.name,
    image: placeImage(place),
    meta: metaParts.join(' · ') || place.address?.split(',')[0]?.trim() || 'Cavite',
    categoryKey,
    categoryLabel,
    city_mun: place.city_mun ?? null,
  };
}

/** Published places that have a hero image (DB, gallery, or bundled local asset). */
export async function fetchPlacesWithMedia(client, { limit } = {}) {
  const all = await fetchAllPlacesFromSupabase(client);
  const withMedia = all.filter(hasMedia);
  if (limit && limit > 0) return withMedia.slice(0, limit);
  return withMedia;
}

/** Stable login vs signup side-panel picks (newest first, then name). */
export function pickAuthHeroPlaces(places, count = 2) {
  const sorted = [...places].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
  return sorted.slice(0, count);
}

/** Featured destination cards with diverse NTDP category and municipality. */
export function pickFeaturedDestinations(places, { limit = 8 } = {}) {
  const withMedia = places.filter(hasMedia);
  const picks = [];
  const usedCategories = new Set();
  const usedCities = new Set();

  for (const place of withMedia) {
    if (picks.length >= limit) break;
    const cat = normalizeCategoryKey(place.ntdp_category);
    const city = String(place.city_mun ?? '').trim().toLowerCase() || 'unknown';
    if (usedCategories.has(cat) && usedCities.has(city) && picks.length >= 4) continue;
    picks.push(placeToDestinationCard(place));
    usedCategories.add(cat);
    usedCities.add(city);
  }

  for (const place of withMedia) {
    if (picks.length >= limit) break;
    if (picks.some((p) => p.id === place.id)) continue;
    picks.push(placeToDestinationCard(place));
  }

  return picks;
}

/** Filter chips from categories present in the catalog (`All` + top NTDP types). */
export function buildDestinationFilters(places, maxCategories = 5) {
  const counts = new Map();
  for (const p of places) {
    const key = normalizeCategoryKey(p.ntdp_category);
    if (!key || key === 'other') continue;
    const label = p.ntdp_category ? formatNtdpCategoryTagLabel(p.ntdp_category) : 'Other';
    const prev = counts.get(key);
    if (prev) prev.count += 1;
    else counts.set(key, { value: key, label, count: 1 });
  }
  const sorted = [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, maxCategories);
  return [{ label: 'All', value: 'all' }, ...sorted.map(({ value, label }) => ({ label, value }))];
}

/** Single hero establishment (admin-curated preferred, else first remote image). */
export function pickHeroPlace(places) {
  const withMedia = places.filter(hasMedia);
  const adminCurated = withMedia.find((p) => String(p.source_slug ?? '').startsWith('admin:'));
  if (adminCurated) return adminCurated;
  const remote = withMedia.find((p) => isRemoteUrl(p.imageUrl || p.galleryUrls?.[0]));
  if (remote) return remote;
  return withMedia[0] ?? null;
}

/** Live stats for marketing copy (establishment and municipality counts). */
export function buildMarketingStats(places) {
  const municipalities = new Set();
  for (const p of places) {
    const city = String(p.city_mun ?? '').trim();
    if (city) municipalities.add(city);
  }
  return {
    establishmentCount: places.length,
    municipalityCount: municipalities.size,
  };
}

export function formatStatCount(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return `${n}+`;
}
