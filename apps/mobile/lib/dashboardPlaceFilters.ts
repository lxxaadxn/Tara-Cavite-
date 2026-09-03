import { ntdpCategoriesMatch } from 'cavitour-shared/ntdpFilterMeta';
import type { Place } from '../data/mockData';
import { FILTER_OPTION_LABEL_BY_KEY } from './dashboardFilterOptions';

export type AppliedPlaceFilters = {
  selectedCategoryKeys: string[];
  selectedCityKeys: string[];
  selectedMunicipalityKeys: string[];
};

export function placeMatchesSearchQuery(place: Place, query: string): boolean {
  const q = fold(query);
  if (!q) return true;
  const blob = placeSearchBlob(place);
  return q.split(' ').every((word) => Boolean(word) && blob.includes(word));
}

export function countActiveFilters(f: AppliedPlaceFilters | null): number {
  if (!f) return 0;
  return (
    (f.selectedCategoryKeys?.length ?? 0) +
    (f.selectedCityKeys?.length ?? 0) +
    (f.selectedMunicipalityKeys?.length ?? 0)
  );
}

function fold(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Combined text used for keyword-based filters (access, amenities, categories). */
export function placeSearchBlob(place: Place): string {
  return fold(
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

/** Match filter labels: drop trailing "City" for comparison. */
function normalizeAreaLabel(label: string): string {
  return label.replace(/\s+City\s*$/i, '').trim().toLowerCase();
}

function placeMatchesLocationKeys(place: Place, keys: string[]): boolean {
  const cmRaw = (place.city_mun ?? '').trim().toLowerCase();
  const cm = fold(place.city_mun ?? '');
  const addr = fold(place.address ?? '');
  const hay = `${cm} ${addr}`;
  return keys.some((key) => {
    const label = EXTRA_LOCATION_LABELS[key] || FILTER_OPTION_LABEL_BY_KEY[key] || key;
    if (!label) return false;
    const core = fold(normalizeAreaLabel(label));
    if (!core) return false;
    if (hay.includes(core)) return true;
    if (cm.includes(core) || core.includes(cm)) return true;
    const rawFold = fold(cmRaw);
    return rawFold.includes(core) || core.includes(rawFold);
  });
}

/** NTDP / TA wording in Cavite STA data — match on blob or structured fields. */
const DEFAULT_CAT_KEYWORDS: Record<string, string[]> = {
  'cat-nature': ['nature', 'eco', 'farm', 'agri', 'agritourism', 'wildlife', 'forest'],
  'cat-mice': ['mice', 'meeting', 'convention', 'conference', 'event venue', 'events', 'banquet'],
  'cat-restaurant': ['restaurant', 'dining', 'food service', 'eatery', 'bistro', 'cafe', 'café', 'food hub'],
  'cat-health': ['health', 'wellness', 'spa', 'medical', 'retirement', 'clinic', 'therapy', 'rehab'],
  'cat-cultural': ['cultural', 'museum', 'church', 'heritage', 'historical', 'shrine', 'parish'],
  'cat-education': ['education', 'school', 'university', 'college', 'training', 'academy', 'learning'],
  'cat-leisure': ['leisure', 'entertainment', 'resort', 'recreation', 'amusement', 'park', 'waterpark'],
  'cat-shopping': ['shopping', 'mall', 'market', 'retail', 'boutique', 'bazaar', 'commercial'],
};

let CAT_KEYWORDS: Record<string, string[]> = { ...DEFAULT_CAT_KEYWORDS };
let EXTRA_CATEGORY_LABELS: Record<string, string> = {};
let EXTRA_LOCATION_LABELS: Record<string, string> = {};

export function setRuntimeCategoryKeywords(map: Record<string, string[]>) {
  CAT_KEYWORDS = { ...DEFAULT_CAT_KEYWORDS, ...(map || {}) };
}

export function setRuntimeCategoryLabels(map: Record<string, string>) {
  EXTRA_CATEGORY_LABELS = { ...(map || {}) };
}

export function setRuntimeLocationLabels(map: Record<string, string>) {
  EXTRA_LOCATION_LABELS = { ...(map || {}) };
}

export function getDefaultCategoryKeywords() {
  return { ...DEFAULT_CAT_KEYWORDS };
}

function categorySelectionLabel(key: string): string {
  if (!key) return '';
  return EXTRA_CATEGORY_LABELS[key] || FILTER_OPTION_LABEL_BY_KEY[key] || key;
}

function placeMatchesCategoryKeys(place: Place, keys: string[]): boolean {
  const blob = placeSearchBlob(place);
  return keys.some((key) => {
    const label = categorySelectionLabel(key);
    if (ntdpCategoriesMatch(place.ntdp_category, label) || ntdpCategoriesMatch(place.ntdp_category, key)) {
      return true;
    }
    if (!key.startsWith('cat-')) return false;
    let words = CAT_KEYWORDS[key];
    if (!words?.length) {
      words = fold(label)
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2);
    }
    if (!words?.length) return false;
    return words.some((w) => blob.includes(w));
  });
}

export function placePassesAppliedFilters(place: Place, f: AppliedPlaceFilters | null): boolean {
  if (!f) return true;
  const catKeys = f.selectedCategoryKeys ?? [];
  if (catKeys.length && !placeMatchesCategoryKeys(place, catKeys)) return false;
  const locKeys = [...(f.selectedCityKeys ?? []), ...(f.selectedMunicipalityKeys ?? [])];
  if (locKeys.length && !placeMatchesLocationKeys(place, locKeys)) return false;
  return true;
}

/** Any keyword match satisfies this access dimension (OR within the list). */
const ACCESS_KEYWORDS: Record<string, string[]> = {
  'acc-commute': [
    'jeepney',
    'bus',
    'terminal',
    'pala-pala',
    'palipala',
    'highway',
    'commute',
    'public transport',
    'uv express',
    'van terminal',
    'tricycle',
    'transport terminal',
    'integrated terminal',
    'along aguinaldo',
  ],
  'acc-parking': ['parking', 'car park', 'parking area', 'parking space', 'motorcycle parking'],
  'acc-road': [
    'highway',
    'national road',
    'aguinaldo',
    'governor',
    'governors',
    'main road',
    'access road',
    'roadside',
    'along the highway',
  ],
};

function placeMatchesAccessKeys(place: Place, keys: string[]): boolean {
  const blob = placeSearchBlob(place);
  return keys.every((key) => {
    const words = ACCESS_KEYWORDS[key];
    if (!words?.length) return true;
    return words.some((w) => blob.includes(w));
  });
}

const AMENITY_KEYWORDS: Record<string, string[]> = {
  'am-wifi': ['wifi', 'wi-fi', 'internet', 'wireless', 'fiber', 'broadband', 'hotspot'],
  'am-pet': ['pet friendly', 'pet-friendly', 'pets allowed', 'pet policy', 'bring your pet'],
  'am-food': [
    'food',
    'restaurant',
    'cafe',
    'café',
    'dining',
    'buffet',
    'meals',
    'kitchen',
    'in-house dining',
    'food court',
  ],
  'am-insta': [
    'instagram',
    'instagrammable',
    'scenic',
    'viewpoint',
    'overlooking',
    'garden',
    'aesthetic',
    'photo spot',
    'picture',
    'ridge',
    'sunset view',
  ],
};

function placeMatchesAmenityKeys(place: Place, keys: string[]): boolean {
  const blob = placeSearchBlob(place);
  return keys.every((key) => {
    const words = AMENITY_KEYWORDS[key];
    if (!words?.length) return true;
    return words.some((w) => blob.includes(w));
  });
}

function hashIdToInt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) {
    h = (h * 31 + id.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function effectiveRating(place: Place): number {
  const r = parseFloat(place.rating ?? '');
  if (Number.isFinite(r)) return r;
  return 4.2 + (hashIdToInt(place.id) % 8) * 0.1;
}

function syntheticReviewCount(place: Place): number {
  return 200 + (hashIdToInt(place.id) % 9800);
}

/**
 * Applies all dashboard filter toggles. Sections combine with AND; within cities/muns and
 * categories, selections combine with OR; access and amenities use AND across selected items.
 */
export function placeMatchesDashboardFilters(place: Place, toggles: Record<string, boolean>): boolean {
  const active = Object.keys(toggles).filter((k) => toggles[k]);
  if (!active.length) return true;

  const locKeys = active.filter((k) => k.startsWith('city-') || k.startsWith('mun-'));
  const catKeys = active.filter((k) => k.startsWith('cat-'));
  const accKeys = active.filter((k) => k.startsWith('acc-'));
  const amKeys = active.filter((k) => k.startsWith('am-'));

  if (locKeys.length && !placeMatchesLocationKeys(place, locKeys)) return false;
  if (catKeys.length && !placeMatchesCategoryKeys(place, catKeys)) return false;
  if (accKeys.length && !placeMatchesAccessKeys(place, accKeys)) return false;
  if (amKeys.length && !placeMatchesAmenityKeys(place, amKeys)) return false;
  return true;
}

/** Sort keys: recent beats reviewed beats top when multiple are on. */
export function sortPlacesByDashboardSort(places: Place[], toggles: Record<string, boolean>): Place[] {
  const active = Object.keys(toggles).filter((k) => toggles[k]);
  const sortKeys = active.filter((k) => k.startsWith('sort-'));
  const out = [...places];
  if (sortKeys.includes('sort-recent')) {
    out.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta || a.name.localeCompare(b.name);
    });
    return out;
  }
  if (sortKeys.includes('sort-reviewed')) {
    out.sort(
      (a, b) =>
        syntheticReviewCount(b) - syntheticReviewCount(a) ||
        effectiveRating(b) - effectiveRating(a) ||
        a.name.localeCompare(b.name)
    );
    return out;
  }
  if (sortKeys.includes('sort-top')) {
    out.sort(
      (a, b) =>
        effectiveRating(b) - effectiveRating(a) ||
        a.name.localeCompare(b.name)
    );
    return out;
  }
  return out;
}
