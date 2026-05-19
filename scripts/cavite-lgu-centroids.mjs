/**
 * Cavite LGU center points when Nominatim returns no result.
 */
export function normalizeLguKey(s) {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ñ/gi, 'n')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const BY_KEY = {
  amadeo: { lat: 14.17, lng: 120.785 },
  alfonso: { lat: 14.146, lng: 120.856 },
  'bacoor city': { lat: 14.459, lng: 120.938 },
  bacoor: { lat: 14.459, lng: 120.938 },
  'carmona city': { lat: 14.313, lng: 121.057 },
  carmona: { lat: 14.313, lng: 121.057 },
  'cavite city': { lat: 14.479, lng: 120.897 },
  'dasmarinas city': { lat: 14.329, lng: 120.937 },
  dasmarinas: { lat: 14.329, lng: 120.937 },
  'city of dasmarinas': { lat: 14.329, lng: 120.937 },
  'general mariano alvarez': { lat: 14.298, lng: 120.868 },
  gma: { lat: 14.298, lng: 120.868 },
  'general trias city': { lat: 14.386, lng: 120.88 },
  'general trias': { lat: 14.386, lng: 120.88 },
  'imus city': { lat: 14.429, lng: 120.936 },
  imus: { lat: 14.429, lng: 120.936 },
  indang: { lat: 14.195, lng: 120.878 },
  magallanes: { lat: 14.188, lng: 120.758 },
  'mendez-nuñez': { lat: 14.128, lng: 120.905 },
  'mendez-nunez': { lat: 14.128, lng: 120.905 },
  mendez: { lat: 14.128, lng: 120.905 },
  noveleta: { lat: 14.432, lng: 120.901 },
  silang: { lat: 14.23, lng: 120.975 },
  'tagaytay city': { lat: 14.096, lng: 120.932 },
  tagaytay: { lat: 14.096, lng: 120.932 },
  tanza: { lat: 14.394, lng: 120.853 },
  'trece martires city': { lat: 14.311, lng: 120.87 },
  'trece martires': { lat: 14.311, lng: 120.87 },
};

export function jitterCentroid(lat, lng, seed) {
  let h = 2166136261;
  const s = String(seed ?? '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const dx = ((h % 201) - 100) * 1.2e-5;
  const dy = (((h >> 8) % 201) - 100) * 1.2e-5;
  return { lat: lat + dy, lng: lng + dx };
}

export function getCentroidForLgu(cityMun, sheetName) {
  const candidates = [normalizeLguKey(cityMun), normalizeLguKey(sheetName)].filter(Boolean);
  for (const c of candidates) {
    if (BY_KEY[c]) return { ...BY_KEY[c] };
    const noCity = c.replace(/\s+city\s*$/i, '').trim();
    if (noCity !== c && BY_KEY[noCity]) return { ...BY_KEY[noCity] };
  }
  return null;
}
