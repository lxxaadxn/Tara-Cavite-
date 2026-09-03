/** Filters aligned with mobile `dashboardPlaceFilters.ts`. */

import { ntdpCategoriesMatch } from 'cavitour-shared/ntdpFilterMeta';
import { FILTER_OPTION_LABEL_BY_KEY } from './dashboardFilterOptions';

const DEFAULT_CAT_KEYWORDS = {
  'cat-nature': ['nature', 'eco', 'farm', 'agri', 'agritourism', 'wildlife', 'forest'],
  'cat-mice': ['mice', 'meeting', 'convention', 'conference', 'event venue', 'events', 'banquet'],
  'cat-restaurant': ['restaurant', 'dining', 'food service', 'eatery', 'bistro', 'cafe', 'café', 'food hub'],
  'cat-health': ['health', 'wellness', 'spa', 'medical', 'retirement', 'clinic', 'therapy', 'rehab'],
  'cat-cultural': ['cultural', 'museum', 'church', 'heritage', 'historical', 'shrine', 'parish'],
  'cat-education': ['education', 'school', 'university', 'college', 'training', 'academy', 'learning'],
  'cat-leisure': ['leisure', 'entertainment', 'resort', 'recreation', 'amusement', 'park', 'waterpark'],
  'cat-shopping': ['shopping', 'mall', 'market', 'retail', 'boutique', 'bazaar', 'commercial'],
};

/** Runtime keyword map (overridden when FilterModal loads DB categories). */
let CAT_KEYWORDS = { ...DEFAULT_CAT_KEYWORDS };

/** Extra labels for category keys loaded from DB. */
let EXTRA_CATEGORY_LABELS = {};

/** Extra labels for location keys loaded from DB. */
let EXTRA_LOCATION_LABELS = {};

export function setRuntimeCategoryKeywords(map) {
  CAT_KEYWORDS = { ...DEFAULT_CAT_KEYWORDS, ...(map || {}) };
}

export function setRuntimeCategoryLabels(map) {
  EXTRA_CATEGORY_LABELS = { ...(map || {}) };
}

export function setRuntimeLocationLabels(map) {
  EXTRA_LOCATION_LABELS = { ...(map || {}) };
}

export function getDefaultCategoryKeywords() {
  return { ...DEFAULT_CAT_KEYWORDS };
}

export function foldHaystack(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function placeSearchBlobWeb(place) {
  return foldHaystack(
    [
      place.name,
      place.address,
      place.description,
      place.ntdp_category,
      place.type,
      place.ta_category,
      place.type_code,
      place.city_mun,
      place.searchable_text,
    ]
      .filter(Boolean)
      .join(' ')
  );
}

function normalizeAreaLabel(label) {
  return String(label ?? '')
    .replace(/\s+City\s*$/i, '')
    .trim()
    .toLowerCase();
}

function categorySelectionLabel(key) {
  if (!key) return '';
  return EXTRA_CATEGORY_LABELS[key] || FILTER_OPTION_LABEL_BY_KEY[key] || key;
}

export function placeMatchesCategoryKeysWeb(place, keys) {
  if (!keys?.length) return true;
  const blob = placeSearchBlobWeb(place);
  return keys.some((key) => {
    const label = categorySelectionLabel(key);
    if (ntdpCategoriesMatch(place.ntdp_category, label) || ntdpCategoriesMatch(place.ntdp_category, key)) {
      return true;
    }
    if (!String(key).startsWith('cat-')) return false;
    let words = CAT_KEYWORDS[key];
    if (!words?.length) {
      words = foldHaystack(label)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2);
    }
    if (!words?.length) return false;
    return words.some((w) => blob.includes(w));
  });
}

export function placeMatchesLocationKeysWeb(place, keys) {
  if (!keys?.length) return true;
  const cmRaw = (place.city_mun ?? '').trim().toLowerCase();
  const cm = foldHaystack(place.city_mun ?? '');
  const addr = foldHaystack(place.address ?? '');
  const hay = `${cm} ${addr}`;
  return keys.some((key) => {
    const label = EXTRA_LOCATION_LABELS[key] || FILTER_OPTION_LABEL_BY_KEY[key] || key;
    if (!label) return false;
    const core = foldHaystack(normalizeAreaLabel(label));
    if (!core) return false;
    if (hay.includes(core)) return true;
    if (cm.includes(core) || core.includes(cm)) return true;
    const rawFold = foldHaystack(cmRaw);
    return rawFold.includes(core) || core.includes(rawFold);
  });
}

/** Diacritic-insensitive match for `city_mun` (itinerary browse). */
export function foldCityLabel(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+city\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cityMunMatchesFilter(placeCityMun, selectedCityValue) {
  const a = foldCityLabel(placeCityMun);
  const b = foldCityLabel(selectedCityValue);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * @typedef {Object} AppliedPlaceFilters
 * @property {string[]} selectedCategoryKeys
 * @property {string[]} selectedCityKeys
 * @property {string[]} selectedMunicipalityKeys
 */

/** @param {AppliedPlaceFilters | null | undefined} f */
export function countActiveFilters(f) {
  if (!f) return 0;
  return (
    (f.selectedCategoryKeys?.length ?? 0) +
    (f.selectedCityKeys?.length ?? 0) +
    (f.selectedMunicipalityKeys?.length ?? 0)
  );
}

/** @param {any} place @param {AppliedPlaceFilters | null} f */
export function placePassesAppliedFilters(place, f) {
  if (!f) return true;
  if (f.selectedCategoryKeys?.length && !placeMatchesCategoryKeysWeb(place, f.selectedCategoryKeys)) {
    return false;
  }
  const locKeys = [...(f.selectedCityKeys ?? []), ...(f.selectedMunicipalityKeys ?? [])];
  if (locKeys.length && !placeMatchesLocationKeysWeb(place, locKeys)) {
    return false;
  }
  return true;
}

function hashIdToInt(id) {
  let h = 0;
  const s = String(id ?? '');
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function effectiveRatingWeb(place) {
  const r = parseFloat(place.rating ?? '');
  if (Number.isFinite(r)) return r;
  return 4.2 + (hashIdToInt(place.id) % 8) * 0.1;
}

function syntheticReviewCountWeb(place) {
  return 200 + (hashIdToInt(place.id) % 9800);
}

/** Sort search results (recent / top / reviewed); default order unchanged. */
export function sortPlacesByModeWeb(places, sortMode) {
  const list = [...places];
  if (sortMode === 'recent') {
    list.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta || String(a.name).localeCompare(String(b.name));
    });
    return list;
  }
  if (sortMode === 'reviewed') {
    list.sort(
      (a, b) =>
        syntheticReviewCountWeb(b) - syntheticReviewCountWeb(a) ||
        effectiveRatingWeb(b) - effectiveRatingWeb(a) ||
        String(a.name).localeCompare(String(b.name))
    );
    return list;
  }
  if (sortMode === 'top') {
    list.sort(
      (a, b) =>
        effectiveRatingWeb(b) - effectiveRatingWeb(a) || String(a.name).localeCompare(String(b.name))
    );
    return list;
  }
  return list;
}
