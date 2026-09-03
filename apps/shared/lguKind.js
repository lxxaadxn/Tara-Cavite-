/** Classify Cavite LGUs as city vs municipality. */

const CAVITE_COMPONENT_CITIES = new Set([
  'bacoor',
  'carmona',
  'cavite',
  'dasmarinas',
  'general trias',
  'imus',
  'tagaytay',
  'trece martires',
]);

export function foldLguName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+city\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @returns {'city' | 'municipality'} */
export function inferLguKind(name) {
  const fold = foldLguName(name);
  if (CAVITE_COMPONENT_CITIES.has(fold)) return 'city';
  if (/\bcity\b/i.test(String(name ?? ''))) return 'city';
  return 'municipality';
}

/** @returns {'city' | 'municipality'} */
export function parseLguKind(raw, name) {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'city' || v === 'municipality') return v;
  return inferLguKind(name);
}
