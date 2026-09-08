/** Curated filter options aligned with web FilterModal. */

export const WEB_CATEGORY_OPTIONS = [
  { key: 'cat-nature', label: 'Nature Tourism', shortLabel: 'Nature', icon: 'nature' as const },
  { key: 'cat-mice', label: 'MICE & Events', shortLabel: 'MICE', icon: 'mice' as const },
  { key: 'cat-restaurant', label: 'Restaurant', shortLabel: 'Food', icon: 'restaurant' as const },
  { key: 'cat-health', label: 'Health, Wellness & Retirement', shortLabel: 'Wellness', icon: 'health' as const },
  { key: 'cat-cultural', label: 'Cultural Tourism', shortLabel: 'Culture', icon: 'cultural' as const },
  { key: 'cat-education', label: 'Education', shortLabel: 'Education', icon: 'education' as const },
  { key: 'cat-leisure', label: 'Leisure and Entertainment', shortLabel: 'Leisure', icon: 'leisure' as const },
  { key: 'cat-shopping', label: 'Shopping', shortLabel: 'Shopping', icon: 'shopping' as const },
];

export const WEB_CITY_OPTIONS = [
  { key: 'city-bacoor', label: 'Bacoor City' },
  { key: 'city-carmona', label: 'Carmona City' },
  { key: 'city-cavite', label: 'Cavite City' },
  { key: 'city-dasma', label: 'Dasmariñas City' },
  { key: 'city-trias', label: 'General Trias City' },
  { key: 'city-imus', label: 'Imus City' },
  { key: 'city-tagaytay', label: 'Tagaytay City' },
  { key: 'city-trece', label: 'Trece Martires City' },
];

export const WEB_MUNICIPALITY_OPTIONS = [
  { key: 'mun-amadeo', label: 'Amadeo' },
  { key: 'mun-alfonso', label: 'Alfonso' },
  { key: 'city-gma', label: 'General Mariano Alvarez' },
  { key: 'mun-indang', label: 'Indang' },
  { key: 'mun-magallanes', label: 'Magallanes' },
  { key: 'mun-mendez', label: 'Mendez-Nuñez' },
  { key: 'mun-noveleta', label: 'Noveleta' },
  { key: 'mun-silang', label: 'Silang' },
  { key: 'mun-tanza', label: 'Tanza' },
];

export const FILTER_OPTION_LABEL_BY_KEY: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const o of [...WEB_CITY_OPTIONS, ...WEB_MUNICIPALITY_OPTIONS, ...WEB_CATEGORY_OPTIONS]) {
    m[o.key] = o.label;
  }
  return m;
})();
