export const WEB_CATEGORY_OPTIONS = [
  { key: 'cat-nature', label: 'Nature Tourism', shortLabel: 'Nature', icon: 'nature' },
  { key: 'cat-mice', label: 'MICE & Events', shortLabel: 'MICE', icon: 'mice' },
  { key: 'cat-restaurant', label: 'Culinary Tourism', shortLabel: 'Culinary', icon: 'restaurant' },
  { key: 'cat-health', label: 'Health, Wellness & Retirement', shortLabel: 'Wellness', icon: 'health' },
  { key: 'cat-cultural', label: 'Cultural Tourism', shortLabel: 'Culture', icon: 'cultural' },
  { key: 'cat-education', label: 'Educational Tourism', shortLabel: 'Education', icon: 'education' },
  { key: 'cat-leisure', label: 'Leisure and Entertainment', shortLabel: 'Leisure', icon: 'leisure' },
  { key: 'cat-shopping', label: 'Shopping Tourism', shortLabel: 'Shopping', icon: 'shopping' },
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

export const WEB_LOCATION_OPTIONS = [...WEB_CITY_OPTIONS, ...WEB_MUNICIPALITY_OPTIONS];

export const FILTER_OPTION_LABEL_BY_KEY = (() => {
  const m = {};
  for (const o of [...WEB_CITY_OPTIONS, ...WEB_MUNICIPALITY_OPTIONS, ...WEB_CATEGORY_OPTIONS]) {
    m[o.key] = o.label;
  }
  return m;
})();
