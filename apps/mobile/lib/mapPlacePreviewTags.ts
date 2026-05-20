import type { Place } from '../data/mockData';
import { formatNtdpCategoryTagLabel } from './ntdpDisplayLabels';
import { placeSearchBlob } from './dashboardPlaceFilters';

export type MapPreviewTagVariant = 'olive' | 'teal' | 'pale';

export type MapPreviewTag = {
  label: string;
  variant: MapPreviewTagVariant;
};

const CATEGORY_OPTIONS: { key: string; shortLabel: string }[] = [
  { key: 'cat-nature', shortLabel: 'Nature' },
  { key: 'cat-mice', shortLabel: 'MICE' },
  { key: 'cat-restaurant', shortLabel: 'Food' },
  { key: 'cat-health', shortLabel: 'Wellness' },
  { key: 'cat-cultural', shortLabel: 'Culture' },
  { key: 'cat-education', shortLabel: 'Education' },
  { key: 'cat-leisure', shortLabel: 'Leisure' },
  { key: 'cat-shopping', shortLabel: 'Shopping' },
];

const CAT_KEYWORDS: Record<string, string[]> = {
  'cat-nature': ['nature', 'eco', 'farm', 'agri', 'agritourism', 'wildlife', 'forest'],
  'cat-mice': ['mice', 'meeting', 'convention', 'conference', 'event venue', 'events', 'banquet'],
  'cat-restaurant': ['restaurant', 'dining', 'food service', 'eatery', 'bistro', 'cafe', 'café', 'food hub'],
  'cat-health': ['health', 'wellness', 'spa', 'medical', 'retirement', 'clinic', 'therapy', 'rehab'],
  'cat-cultural': ['cultural', 'museum', 'church', 'heritage', 'historical', 'shrine', 'parish'],
  'cat-education': ['education', 'school', 'university', 'college', 'training', 'academy', 'learning'],
  'cat-leisure': ['leisure', 'entertainment', 'resort', 'recreation', 'amusement', 'park', 'waterpark'],
  'cat-shopping': ['shopping', 'mall', 'market', 'retail', 'boutique', 'bazaar', 'commercial'],
};

function foldLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function labelsMatch(a: string, b: string): boolean {
  const fa = foldLabel(a);
  const fb = foldLabel(b);
  if (!fa || !fb) return false;
  return fa === fb || fa.includes(fb) || fb.includes(fa);
}

function matchesCategoryKey(place: Place, key: string): boolean {
  const words = CAT_KEYWORDS[key];
  if (!words?.length) return false;
  const blob = placeSearchBlob(place);
  return words.some((w) => blob.includes(w));
}

/** Up to three pills from NTDP category, type/TA label, and dashboard category keywords. */
export function getMapPlacePreviewTags(place: Place, maxTags = 3): MapPreviewTag[] {
  const tags: MapPreviewTag[] = [];
  const seen = new Set<string>();

  const add = (label: string, variant: MapPreviewTagVariant) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = foldLabel(trimmed);
    if (seen.has(key)) return;
    if (tags.some((t) => labelsMatch(t.label, trimmed))) return;
    seen.add(key);
    tags.push({ label: trimmed, variant });
  };

  if (place.ntdp_category) {
    add(formatNtdpCategoryTagLabel(place.ntdp_category), 'teal');
  }

  const typeLabel = (place.ta_category || place.type || '').trim();
  if (typeLabel && !tags.some((t) => labelsMatch(t.label, typeLabel))) {
    add(typeLabel, 'olive');
  }

  for (const opt of CATEGORY_OPTIONS) {
    if (tags.length >= maxTags) break;
    if (!matchesCategoryKey(place, opt.key)) continue;
    if (tags.some((t) => labelsMatch(t.label, opt.shortLabel))) continue;
    add(opt.shortLabel, 'pale');
  }

  return tags.slice(0, maxTags);
}
