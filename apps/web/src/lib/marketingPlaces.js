import { fetchAllPlacesFromSupabase } from './placesFromSupabase';
import { formatNtdpCategoryTagLabel } from './ntdpDisplayLabels';

export const MARKETING_PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

function hasMedia(place) {
  const image = String(place?.imageUrl ?? '').trim();
  if (image) return true;
  const gallery = place?.galleryUrls;
  if (Array.isArray(gallery) && gallery.some((u) => String(u ?? '').trim())) return true;
  return false;
}

export function filterPlacesWithMedia(places) {
  return (places || []).filter(hasMedia);
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
    ntdp_category: place.ntdp_category ?? null,
    city_mun: place.city_mun ?? null,
  };
}

export async function fetchPlacesWithMedia(client, { limit } = {}) {
  const all = await fetchAllPlacesFromSupabase(client);
  const withMedia = filterPlacesWithMedia(all);
  if (limit && limit > 0) return withMedia.slice(0, limit);
  return withMedia;
}

export function placesToDestinationCards(places) {
  return filterPlacesWithMedia(places).map(placeToDestinationCard);
}

export function pickAuthHeroPlaces(places, count = 2) {
  const sorted = [...places].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return (a.name ?? '').localeCompare(b.name ?? '');
  });
  return sorted.slice(0, count);
}

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

export function pickLandingDestinationCards(places, ids, { limit = 4 } = {}) {
  const byId = new Map((places || []).map((place) => [String(place.id), place]));
  const cards = [];
  const used = new Set();

  for (const raw of ids || []) {
    const id = String(raw ?? '').trim();
    const place = byId.get(id);
    if (!id || !place || used.has(id)) continue;
    used.add(id);
    cards.push(placeToDestinationCard(place));
    if (cards.length >= limit) break;
  }

  return cards;
}

export function pickLandingItineraries(published, ids, { limit = 4 } = {}) {
  const list = Array.isArray(published) ? published : [];
  const byKey = new Map();
  for (const it of list) {
    for (const key of [it?.uuid, it?.id, it?.slug, it?.publicId]) {
      const normalized = String(key ?? '').trim();
      if (normalized && !byKey.has(normalized)) byKey.set(normalized, it);
    }
  }

  const needles = (ids || []).map((raw) => String(raw ?? '').trim()).filter(Boolean);
  if (!needles.length) return list.slice(0, limit);

  const ordered = [];
  const used = new Set();
  for (const needle of needles) {
    const item = byKey.get(needle);
    if (!item) continue;
    const dedupe = String(item.uuid || item.id || needle);
    if (used.has(dedupe)) continue;
    used.add(dedupe);
    ordered.push(item);
    if (ordered.length >= limit) break;
  }

  return ordered;
}

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

export function pickHeroPlace(places) {
  const withMedia = places.filter(hasMedia);
  const adminCurated = withMedia.find((p) => String(p.source_slug ?? '').startsWith('admin:'));
  if (adminCurated) return adminCurated;
  const remote = withMedia.find((p) => isRemoteUrl(p.imageUrl || p.galleryUrls?.[0]));
  if (remote) return remote;
  return withMedia[0] ?? null;
}

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

/** Anonymous RPC; returns 0 if the function is not deployed yet. */
export async function fetchLandingActiveUserCount(client) {
  if (!client) return 0;
  const { data, error } = await client.rpc('landing_active_user_count');
  if (error || data == null || data === '') return 0;
  const n = Number(data);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
