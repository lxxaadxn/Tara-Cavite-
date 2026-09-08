/** NTDP category chips for the visitor Filter modal, sourced from admin `ntdp_categories`. */

export function normalizeNtdpFilterCopy(text) {
  return String(text ?? '').replace(/\bLeasure\b/g, 'Leisure');
}

/** Fold NTDP labels for matching (typos, punctuation, trailing "tourism"). */
export function foldNtdpCategory(raw) {
  if (raw == null || !String(raw).trim()) return '';
  let s = normalizeNtdpFilterCopy(raw).trim().toLowerCase();
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[/&,]/g, ' ').replace(/\s+/g, ' ').trim();
  if (s.startsWith('heatlh')) s = `health${s.slice(6)}`;
  s = s.replace(/\bleasure\b/g, 'leisure');
  s = s.replace(/\s+tourism$/i, '').trim();
  return s;
}

export function ntdpCategoriesMatch(a, b) {
  const fa = foldNtdpCategory(a);
  const fb = foldNtdpCategory(b);
  if (!fa || !fb) return false;
  return fa === fb || fa.includes(fb) || fb.includes(fa);
}

/** Chip colors for Filter modal pills (icon + selected state). */
export const FILTER_CHIP_PALETTES = {
  nature: { color: '#16A34A', tint: '#E9F8EF', selectedText: '#14532D' },
  beach: { color: '#0891B2', tint: '#E6F7FB', selectedText: '#155E75' },
  farm: { color: '#65A30D', tint: '#F1F8E4', selectedText: '#3F6212' },
  mice: { color: '#4F46E5', tint: '#EEF0FF', selectedText: '#312E81' },
  restaurant: { color: '#EA580C', tint: '#FFF3E8', selectedText: '#9A3412' },
  health: { color: '#DB2777', tint: '#FDF0F6', selectedText: '#9D174D' },
  cultural: { color: '#7C3AED', tint: '#F4EEFF', selectedText: '#5B21B6' },
  education: { color: '#CA8A04', tint: '#FDF8E7', selectedText: '#854D0E' },
  leisure: { color: '#0284C7', tint: '#E8F5FC', selectedText: '#075985' },
  sports: { color: '#2563EB', tint: '#EBF2FF', selectedText: '#1E3A8A' },
  shopping: { color: '#C026D3', tint: '#FBE8FC', selectedText: '#86198F' },
  historical: { color: '#B45309', tint: '#FEF3E2', selectedText: '#78350F' },
  other: { color: '#64748B', tint: '#F1F5F9', selectedText: '#334155' },
  city: { color: '#2563EB', tint: '#EEF4FF', selectedText: '#1E3A8A' },
  municipality: { color: '#D97706', tint: '#FFF6E8', selectedText: '#92400E' },
};

/**
 * @param {{ icon?: string, shortLabel?: string, label?: string }} [opt]
 */
export function paletteForFilterCategory(opt = {}) {
  const key = foldNtdpCategory(opt.shortLabel || opt.label);
  if (key.includes('beach') || key.includes('cruise')) return FILTER_CHIP_PALETTES.beach;
  if (key.includes('farm') || key.includes('agri')) return FILTER_CHIP_PALETTES.farm;
  if (key.includes('culin') || key.includes('food') || key.includes('gastronom')) return FILTER_CHIP_PALETTES.restaurant;
  if (key.includes('histor')) return FILTER_CHIP_PALETTES.historical;
  if (key.includes('sport')) return FILTER_CHIP_PALETTES.sports;
  if (key.includes('other')) return FILTER_CHIP_PALETTES.other;
  return FILTER_CHIP_PALETTES[opt.icon] || FILTER_CHIP_PALETTES.leisure;
}

export function paletteForLguKind(kind) {
  return kind === 'municipality' ? FILTER_CHIP_PALETTES.municipality : FILTER_CHIP_PALETTES.city;
}

/** Map an NTDP label to a FilterCategoryIcon name. */
export function iconForNtdpCategory(raw) {
  const key = foldNtdpCategory(raw);
  if (!key) return 'nature';
  if (key.includes('cultural')) return 'cultural';
  if (key.includes('mice') || key.includes('conference') || key.includes('exhibition') || key.includes('meeting')) {
    return 'mice';
  }
  if (key.includes('health') || key.includes('wellness') || key.includes('retirement')) return 'health';
  if (key.includes('food') || key.includes('gastronom') || key.includes('restaurant') || key.includes('culin')) {
    return 'restaurant';
  }
  if (key.includes('education')) return 'education';
  if (key.includes('shopping')) return 'shopping';
  if (key.includes('leisure') || key.includes('entertainment') || key.includes('sport') || key.includes('recreation')) {
    return 'leisure';
  }
  if (
    key.includes('nature') ||
    key.includes('farm') ||
    key.includes('agri') ||
    key.includes('cruise') ||
    key.includes('beach')
  ) {
    return 'nature';
  }
  return 'leisure';
}

/** Compact chip text for Filter modal pills. */
export function shortLabelForNtdpCategory(raw) {
  const label = normalizeNtdpFilterCopy(String(raw ?? '').trim());
  const key = foldNtdpCategory(label);
  if (key.includes('cultural')) return 'Culture';
  if (key.includes('mice') || key.includes('conference') || key.includes('exhibition')) return 'MICE';
  if (key.includes('health') || key.includes('wellness') || key.includes('retirement')) return 'Wellness';
  if (key.includes('culin')) return 'Culinary';
  if (key.includes('food') || key.includes('gastronom') || key.includes('restaurant')) return 'Food';
  if (key.includes('education')) return 'Education';
  if (key.includes('shopping')) return 'Shopping';
  if (key.includes('leisure') || key.includes('entertainment')) return 'Leisure';
  if (key.includes('sport') || key.includes('recreation')) return 'Sports';
  if (key.includes('farm') || key.includes('agri')) return 'Farm';
  if (key.includes('cruise') || key.includes('beach')) return 'Beach';
  if (key.includes('nature')) return 'Nature';
  if (key.includes('other')) return 'Other';
  const stripped = label.replace(/\s+Tourism$/i, '').trim();
  return stripped || label || 'Category';
}

/**
 * @param {string} name
 * @param {string|number|null} [_id]
 */
export function ntdpToFilterOption(name, _id) {
  const label = normalizeNtdpFilterCopy(String(name ?? '').trim());
  if (!label) return null;
  return {
    key: label,
    label,
    shortLabel: shortLabelForNtdpCategory(label),
    icon: iconForNtdpCategory(label),
    matchKeywords: [],
    ntdpName: label,
  };
}
