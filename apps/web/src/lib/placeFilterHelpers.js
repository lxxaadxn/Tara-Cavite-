/** Keyword filters aligned with mobile `dashboardPlaceFilters.ts` (STA text fields). */

export const WEB_ACCESS_FILTER_OPTIONS = [
  { key: 'acc-commute', label: 'Commute Accessible' },
  { key: 'acc-parking', label: 'Parking Available' },
  { key: 'acc-road', label: 'Easy Access Road' },
];

export const WEB_AMENITY_FILTER_OPTIONS = [
  { key: 'am-wifi', label: 'Wifi Available' },
  { key: 'am-pet', label: 'Pet-Friendly' },
  { key: 'am-food', label: 'Food Available' },
  { key: 'am-insta', label: 'Instagrammable' },
];

export const WEB_SORT_OPTIONS = [
  { key: '', label: 'Default (nearest first when location on)' },
  { key: 'recent', label: 'Recently Added' },
  { key: 'top', label: 'Top Rated' },
  { key: 'reviewed', label: 'Most Reviewed' },
];

const ACCESS_KEYWORDS = {
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

const AMENITY_KEYWORDS = {
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

export function placeMatchesAccessKeysWeb(place, keys) {
  if (!keys?.length) return true;
  const blob = placeSearchBlobWeb(place);
  return keys.every((key) => {
    const words = ACCESS_KEYWORDS[key];
    if (!words?.length) return true;
    return words.some((w) => blob.includes(w));
  });
}

export function placeMatchesAmenityKeysWeb(place, keys) {
  if (!keys?.length) return true;
  const blob = placeSearchBlobWeb(place);
  return keys.every((key) => {
    const words = AMENITY_KEYWORDS[key];
    if (!words?.length) return true;
    return words.some((w) => blob.includes(w));
  });
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

/** Diacritic-insensitive match for `city_mun` vs filter checkbox (e.g. Dasmariñas vs Dasmariñas City). */
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

/** @param {any} place @param {any} f AppliedPlaceFilters from FilterModal */
export function placePassesAppliedFilters(place, f) {
  if (!f) return true;
  if (f.selectedCities?.length) {
    const ok = f.selectedCities.some((sel) => cityMunMatchesFilter(place.city_mun, sel));
    if (!ok) return false;
  }
  if (f.selectedLgus?.length) {
    if (!place.lgu_slug || !f.selectedLgus.includes(place.lgu_slug)) return false;
  }
  if (f.selectedNtdpCategories?.length) {
    if (!place.ntdp_category || !f.selectedNtdpCategories.includes(place.ntdp_category)) return false;
  }
  if (f.selectedTypeCodes?.length) {
    const code = place.type_code ?? place.type;
    if (!code || !f.selectedTypeCodes.includes(code)) return false;
  }
  if (!placeMatchesAccessKeysWeb(place, f.selectedAccessKeys ?? [])) return false;
  if (!placeMatchesAmenityKeysWeb(place, f.selectedAmenityKeys ?? [])) return false;
  return true;
}
