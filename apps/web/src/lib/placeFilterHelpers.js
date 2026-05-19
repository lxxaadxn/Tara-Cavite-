/** Keyword filters aligned with mobile `dashboardPlaceFilters.ts`. */

import { FILTER_OPTION_LABEL_BY_KEY } from './dashboardFilterOptions';

const CAT_KEYWORDS = {
  'cat-nature': ['nature', 'eco', 'farm', 'agri', 'agritourism', 'wildlife', 'forest'],
  'cat-mice': ['mice', 'meeting', 'convention', 'conference', 'event venue', 'events', 'banquet'],
  'cat-restaurant': ['restaurant', 'dining', 'food service', 'eatery', 'bistro', 'cafe', 'café', 'food hub'],
  'cat-health': ['health', 'wellness', 'spa', 'medical', 'retirement', 'clinic', 'therapy', 'rehab'],
  'cat-cultural': ['cultural', 'museum', 'church', 'heritage', 'historical', 'shrine', 'parish'],
  'cat-education': ['education', 'school', 'university', 'college', 'training', 'academy', 'learning'],
  'cat-leisure': ['leisure', 'entertainment', 'resort', 'recreation', 'amusement', 'park', 'waterpark'],
  'cat-shopping': ['shopping', 'mall', 'market', 'retail', 'boutique', 'bazaar', 'commercial'],
};

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

export function placeMatchesCategoryKeysWeb(place, keys) {
  if (!keys?.length) return true;
  const blob = placeSearchBlobWeb(place);
  return keys.some((key) => {
    const words = CAT_KEYWORDS[key];
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
    const label = FILTER_OPTION_LABEL_BY_KEY[key];
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
