import { supabase } from './supabase';
import { fetchAdminDestinations } from './destinationPlaces';
import { kiraChatJson } from './kiraAi';
import { fetchMostVisitedPlaces } from './placeVisits';
import {
  CATEGORY_OPTIONS,
  COST_TAGS,
  emptyItinerary,
  emptyStop,
  formatTimeWindow,
  durationHintFromTimes,
  mapsSearchUrl,
  PRICE_TIERS,
  VIBE_TAGS,
  persistAdminItinerary,
  fetchAdminItineraries,
  type AdminItinerary,
  type AdminItineraryStop,
} from './adminItineraries';

type GenerateItinerariesBatchParams = {
  count: number;
  stopsPerItinerary: number;
  /** Trip length in days (1–3). Affects duration label, schedule, and AI copy. */
  days?: 1 | 2 | 3;
  status: AdminItinerary['status'];
  /** City / area from the chat (e.g. "Tagaytay"). Filters seed venues. */
  locationHint?: string | null;
  onProgress?: (p: { created: number; total: number }) => void;
};

type VenueCandidate = {
  id: string;
  name: string;
  city: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
};

type AiStop = {
  name: string;
  highlights: string[];
  costType: string;
  expectTag: string;
};

type AiItinerary = {
  title: string;
  subtitle: string;
  route: string;
  bestTime: string;
  tags: string[];
  priceTier: 1 | 2 | 3;
  priceTierLabel: string;
  stops: AiStop[];
};

const LOCATION_FILLER = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'of',
  'to',
  'for',
  'in',
  'on',
  'at',
  'itinerary',
  'itineraries',
  'route',
  'routes',
  'trip',
  'trips',
  'draft',
  'drafts',
  'stop',
  'stops',
  'viewpoint',
  'viewpoints',
  'spot',
  'spots',
  'place',
  'places',
  'tourist',
  'attraction',
  'attractions',
  'destination',
  'destinations',
  'area',
  'areas',
  'city',
  'cities',
  'municipality',
  'town',
  'philippines',
  'cavite',
  'please',
  'generate',
  'create',
  'make',
  'focused',
  'featuring',
  'covering',
  'about',
  'day',
  'days',
]);

function foldLocation(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function locationTokens(hint: string): string[] {
  return foldLocation(hint)
    .split(' ')
    .filter((t) => t.length >= 3 && !LOCATION_FILLER.has(t));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i += 1) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + cost);
      last = tmp;
    }
  }
  return prev[b.length];
}

function maxEditDistance(token: string): number {
  return token.length <= 5 ? 1 : 2;
}

/** True if `token` appears in `hay` or is a near-miss of any word in `hay`. */
function fuzzyTokenInHay(token: string, hay: string): boolean {
  if (!token || !hay) return false;
  if (hay.includes(token)) return true;
  const maxDist = maxEditDistance(token);
  const hayTokens = hay.split(' ').filter((t) => t.length >= 3);
  for (const h of hayTokens) {
    if (h.includes(token) || token.includes(h)) return true;
    if (Math.abs(h.length - token.length) > maxDist) continue;
    if (levenshtein(token, h) <= maxDist) return true;
  }
  return false;
}

function tokensFuzzyNear(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const maxDist = Math.max(maxEditDistance(a), maxEditDistance(b));
  if (Math.abs(a.length - b.length) > maxDist) return false;
  return levenshtein(a, b) <= maxDist;
}

/**
 * Resolve a catalog city/municipality from a (possibly misspelled) hint.
 * Returns the display city label from candidates when a fuzzy match exists.
 */
function resolvePreferredCity(
  hint: string,
  candidates: VenueCandidate[]
): { fold: string; label: string } | null {
  const tokens = locationTokens(hint);
  if (!tokens.length) return null;

  const byFold = new Map<string, string>();
  for (const c of candidates) {
    const fold = foldLocation(c.city);
    if (fold.length < 3) continue;
    if (!byFold.has(fold)) byFold.set(fold, c.city.trim() || fold);
  }

  let best: { fold: string; label: string; score: number } | null = null;

  for (const [fold, label] of byFold) {
    const parts = fold.split(' ').filter((p) => p.length >= 3);
    for (const t of tokens) {
      let score = 0;
      if (fold === t) score = 100;
      else if (fold.includes(t) || t.includes(fold)) score = 80;
      else if (tokensFuzzyNear(fold, t)) score = 70;
      else if (parts.some((p) => tokensFuzzyNear(p, t))) score = 60;
      else continue;

      if (!best || score > best.score) best = { fold, label, score };
    }
  }

  return best ? { fold: best.fold, label: best.label } : null;
}

function venueMatchesLocation(v: VenueCandidate, hint: string, preferredCityFold?: string | null): boolean {
  const tokens = locationTokens(hint);
  if (!tokens.length) return false;

  const cityFold = foldLocation(v.city);
  if (preferredCityFold && cityFold === preferredCityFold) return true;

  const nameFold = foldLocation(v.name);
  const hay = foldLocation(`${v.city} ${v.name} ${v.description}`);
  const foldedHint = foldLocation(hint);

  if (cityFold.includes(foldedHint) || nameFold.includes(foldedHint)) return true;
  if (foldedHint.length >= 4 && (cityFold.includes(foldedHint) || foldedHint.includes(cityFold))) {
    return true;
  }

  return tokens.every((t) => fuzzyTokenInHay(t, hay));
}

function parseCoord(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
}

function toFixedHtmlSafeText(s: string, maxLen: number): string {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function nearestNeighborOrder(venues: VenueCandidate[], startId: string): VenueCandidate[] {
  const start = venues.find((v) => v.id === startId);
  if (!start) return venues;

  const remaining = new Map<string, VenueCandidate>(venues.map((v) => [v.id, v]));
  remaining.delete(start.id);
  const ordered: VenueCandidate[] = [start];
  let current = start;

  while (remaining.size > 0) {
    let best: VenueCandidate | null = null;
    let bestKm = Infinity;
    for (const candidate of remaining.values()) {
      const km = haversineDistanceKm(current.lat, current.lng, candidate.lat, candidate.lng);
      if (km < bestKm) {
        bestKm = km;
        best = candidate;
      }
    }
    if (!best) break;
    ordered.push(best);
    remaining.delete(best.id);
    current = best;
  }

  return ordered;
}

function durationLabelForDays(days: 1 | 2 | 3): string {
  return days === 1 ? '1 day' : `${days} days`;
}

function multiDayTimeSchedule(stopsPerItinerary: number, days: 1 | 2 | 3) {
  const dayCount = Math.max(1, Math.min(3, days));
  const stopsPerDay = Math.ceil(stopsPerItinerary / dayCount);
  const durationMinutes = dayCount >= 3 ? 75 : 90;
  const breakMinutes = 15;
  const dayStartMinutes = 9 * 60; // 09:00 each day

  const toHHMM = (m: number) => {
    const hh = Math.floor(m / 60);
    const mm = m % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  return Array.from({ length: stopsPerItinerary }, (_, i) => {
    const day = Math.min(dayCount, Math.floor(i / stopsPerDay) + 1);
    const indexInDay = i % stopsPerDay;
    const startMinutes = dayStartMinutes + indexInDay * (durationMinutes + breakMinutes);
    const endMinutes = startMinutes + durationMinutes;
    const startHHMM = toHHMM(startMinutes);
    const endHHMM = toHHMM(endMinutes);
    const windowCore = formatTimeWindow(startHHMM, endHHMM);
    const hintCore = durationHintFromTimes(startHHMM, endHHMM);
    const timeWindow = dayCount > 1 ? `Day ${day} · ${windowCore}` : windowCore;
    const durationHint = dayCount > 1 ? `Day ${day} · ${hintCore}` : hintCore;
    return { timeWindow, durationHint };
  });
}

function clampHighlights(items: string[]): string[] {
  return items.map((s) => toFixedHtmlSafeText(s, 120)).filter(Boolean).slice(0, 3);
}

function stopSetSignature(placeIds: string[]): string {
  return [...placeIds]
    .map((id) => String(id ?? '').trim())
    .filter(Boolean)
    .sort()
    .join('|');
}

function signatureFromVenues(venues: VenueCandidate[]): string {
  return stopSetSignature(venues.map((v) => v.id));
}

function signatureFromItinerary(row: AdminItinerary): string {
  const ids = row.stopList
    .map((s) =>
      s.establishment && typeof s.establishment === 'object'
        ? String((s.establishment as { placeId?: unknown }).placeId ?? '').trim()
        : ''
    )
    .filter(Boolean);
  return stopSetSignature(ids);
}

/** City path from stop order; collapses consecutive duplicates. Never "A → A". */
function buildRouteFromVenues(venues: VenueCandidate[]): string {
  const cities: string[] = [];
  for (const v of venues) {
    const city = String(v.city ?? '').trim() || 'Cavite';
    if (!cities.length || foldLocation(cities[cities.length - 1]) !== foldLocation(city)) {
      cities.push(city);
    }
  }
  if (!cities.length) return 'Cavite';
  if (cities.length === 1) return cities[0];
  return cities.join(' → ');
}

function primaryCityFromVenues(venues: VenueCandidate[]): string {
  const counts = new Map<string, { label: string; n: number }>();
  for (const v of venues) {
    const label = String(v.city ?? '').trim() || 'Cavite';
    const key = foldLocation(label);
    const prev = counts.get(key);
    counts.set(key, { label, n: (prev?.n ?? 0) + 1 });
  }
  let best: { label: string; n: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.n > best.n) best = entry;
  }
  return best?.label || 'Cavite';
}

/** Short display city for titles (strip "City" suffix noise). */
function shortCityLabel(city: string): string {
  return city.replace(/\s+City$/i, '').trim() || city || 'Cavite';
}

/** Dominant establishment kinds from venue category/name/description (for title guidance). */
const ESTABLISHMENT_TYPE_PATTERNS: Array<{ kind: string; label: string; patterns: RegExp }> = [
  { kind: 'farm', label: 'farms / agri-tourism', patterns: /\b(farm|farms|agri|agriculture|dairy|orchard|plantation)\b/i },
  { kind: 'cafe', label: 'cafés / coffee', patterns: /\b(cafe|café|coffee|brew|roastery)\b/i },
  { kind: 'restaurant', label: 'restaurants / dining', patterns: /\b(restaurant|resto|eatery|dining|bistro|cuisine)\b/i },
  { kind: 'heritage', label: 'heritage / ancestral sites', patterns: /\b(heritage|ancestral|bahay|shrine|cathedral|church|tribunal|historic)\b/i },
  { kind: 'museum', label: 'museums / culture', patterns: /\b(museum|gallery|cultural|exhibit)\b/i },
  { kind: 'garden', label: 'gardens / parks', patterns: /\b(garden|gardens|park|botanic|flower|bloom)\b/i },
  { kind: 'viewpoint', label: 'viewpoints / lookouts', patterns: /\b(view|viewpoint|lookout|ridge|scenic|panorama)\b/i },
  { kind: 'beach', label: 'beaches / coast', patterns: /\b(beach|coast|coastal|bay|shore|mangrove|resort)\b/i },
  { kind: 'shopping', label: 'shopping / outlets', patterns: /\b(shop|shopping|outlet|mall|market|bazaar)\b/i },
  { kind: 'seafood', label: 'seafood / ports', patterns: /\b(seafood|fishport|fish port|oyster|harbor|harbour)\b/i },
];

function summarizeEstablishmentTypes(venues: VenueCandidate[]): {
  kinds: string[];
  labels: string[];
  summary: string;
} {
  const scores = new Map<string, { label: string; n: number }>();
  for (const v of venues) {
    const blob = `${v.category} ${v.name} ${v.description}`;
    for (const { kind, label, patterns } of ESTABLISHMENT_TYPE_PATTERNS) {
      if (!patterns.test(blob)) continue;
      const prev = scores.get(kind);
      scores.set(kind, { label, n: (prev?.n ?? 0) + 1 });
    }
  }
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 3);
  const kinds = ranked.map(([k]) => k);
  const labels = ranked.map(([, v]) => v.label);
  const summary = labels.length
    ? labels.join('; ')
    : 'mixed Cavite attractions';
  return { kinds, labels, summary };
}

function primaryTypeForTitle(venues: VenueCandidate[], tags: string[]): string {
  const { kinds } = summarizeEstablishmentTypes(venues);
  if (kinds[0]) return kinds[0];
  const tag = tags[0] || 'Nature';
  const tagToKind: Record<string, string> = {
    Cafe: 'cafe',
    Food: 'restaurant',
    Heritage: 'heritage',
    History: 'heritage',
    Culture: 'museum',
    Gardens: 'garden',
    Nature: 'farm',
    Views: 'viewpoint',
    Coast: 'beach',
    Beach: 'beach',
    Seafood: 'seafood',
    Shopping: 'shopping',
  };
  return tagToKind[tag] || 'nature';
}

function buildFallbackTitle(venues: VenueCandidate[], days: 1 | 2 | 3, tags: string[]): string {
  const city = shortCityLabel(primaryCityFromVenues(venues));
  const typeKey = primaryTypeForTitle(venues, tags);
  const seed = `${city}|${days}|${typeKey}|${tags.join(',')}|${venues.map((v) => v.id).join(',')}`;

  const byType: Record<string, string[]> = {
    farm: [
      `${city} Farm & Field Day`,
      `Harvest Trails in ${city}`,
      `${city} Countryside Circuit`,
      `Soil & Sky: ${city}`,
    ],
    cafe: [
      `${city} Cup & Wander`,
      `Slow Sips in ${city}`,
      `${city} Coffee Corridor`,
      `Brew Trail: ${city}`,
    ],
    restaurant: [
      `${city} Flavor Trail`,
      `Table & Town: ${city}`,
      `${city} Bite-Sized Adventure`,
      `From Kitchen to Courtyard: ${city}`,
    ],
    heritage: [
      `${city} Heritage Whisper`,
      `Old Roads, New Days: ${city}`,
      `${city} Time Capsule`,
      `Stories Along ${city}`,
    ],
    museum: [
      `${city} Culture Drift`,
      `Local Pulse: ${city}`,
      `${city} Street & Story`,
    ],
    garden: [
      `${city} Bloom Circuit`,
      `Petals & Paths: ${city}`,
      `${city} Garden Drift`,
    ],
    viewpoint: [
      `${city} Above the Clouds`,
      `Horizon Hop: ${city}`,
      `${city} Lookout Loop`,
      `Ridge Light in ${city}`,
    ],
    beach: [
      `${city} Salt & Sky`,
      `Bay Breeze: ${city}`,
      `${city} Shoreline Drift`,
      `${city} Tide Trail`,
    ],
    shopping: [
      `${city} Browse & Breeze`,
      `Finds Along ${city}`,
      `${city} Market Meander`,
    ],
    seafood: [
      `${city} Catch of the Day`,
      `Harbor Flavors: ${city}`,
      `${city} Pier & Plate`,
    ],
    nature: [
      `${city} Wild Soft Escape`,
      `Green Pause in ${city}`,
      `${city} Leaf & Light`,
      `Into the Quiet: ${city}`,
    ],
  };

  const pool = byType[typeKey] || byType.nature;
  let title = pool[hashPick(seed, pool.length)];
  if (days > 1) {
    const multiPrefixes = [`${days}-Day`, `${days} Nights of`, `A ${days}-Day`];
    const prefix = multiPrefixes[hashPick(seed + 'd', multiPrefixes.length)];
    if (!/^\d/i.test(title)) title = `${prefix} ${title}`;
  }
  return toFixedHtmlSafeText(title, 70);
}

function titleContainsVenueName(title: string, venues: VenueCandidate[]): boolean {
  const foldedTitle = foldLocation(title);
  if (!foldedTitle) return false;
  for (const v of venues) {
    const name = foldLocation(v.name);
    if (name.length < 4) continue;
    if (foldedTitle.includes(name)) return true;
    for (const token of name.split(' ').filter((t) => t.length >= 5)) {
      if (foldedTitle.includes(token)) return true;
    }
  }
  return false;
}

const CATEGORY_KEYWORD_MAP: Array<{ tag: (typeof CATEGORY_OPTIONS)[number]; patterns: RegExp }> = [
  { tag: 'Views', patterns: /\b(view|viewpoint|ridge|lookout|scenic|panorama)\b/i },
  { tag: 'Food', patterns: /\b(food|restaurant|cuisine|eat|dining|eatery)\b/i },
  { tag: 'Heritage', patterns: /\b(heritage|ancestral|shrine|cathedral|tribunal)\b/i },
  { tag: 'Coast', patterns: /\b(coast|coastal|bay|waterfront|port|mangrove)\b/i },
  { tag: 'Nature', patterns: /\b(nature|farm|forest|mountain|eco|park|trail)\b/i },
  { tag: 'Shopping', patterns: /\b(shop|shopping|outlet|mall|souvenir|market)\b/i },
  { tag: 'Culture', patterns: /\b(culture|cultural|museum|festival|art)\b/i },
  { tag: 'History', patterns: /\b(history|historic|historical|war|monument)\b/i },
  { tag: 'Beach', patterns: /\b(beach|beaches|swim|shore)\b/i },
  { tag: 'Seafood', patterns: /\b(seafood|fish|fishport|oyster)\b/i },
  { tag: 'Gardens', patterns: /\b(garden|gardens|flower|bloom|botanic)\b/i },
  { tag: 'Cafe', patterns: /\b(cafe|café|coffee|brew)\b/i },
];

function mapTextToCategories(text: string): string[] {
  const hits: string[] = [];
  for (const { tag, patterns } of CATEGORY_KEYWORD_MAP) {
    if (patterns.test(text) && CATEGORY_OPTIONS.includes(tag)) hits.push(tag);
  }
  const folded = foldLocation(text);
  for (const opt of CATEGORY_OPTIONS) {
    if (folded.includes(foldLocation(opt)) && !hits.includes(opt)) hits.push(opt);
  }
  return hits;
}

function deriveCategoriesFromVenues(venues: VenueCandidate[]): string[] {
  const scores = new Map<string, number>();
  for (const v of venues) {
    const blob = `${v.category} ${v.name} ${v.description}`;
    for (const tag of mapTextToCategories(blob)) {
      scores.set(tag, (scores.get(tag) ?? 0) + 1);
    }
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .filter((t) => CATEGORY_OPTIONS.includes(t))
    .slice(0, 4);
}

function mergeCategories(aiTags: string[], derived: string[]): string[] {
  const out: string[] = [];
  for (const t of [...aiTags, ...derived]) {
    if (!CATEGORY_OPTIONS.includes(t)) continue;
    if (out.includes(t)) continue;
    out.push(t);
    if (out.length >= 4) break;
  }
  if (out.length < 2) {
    for (const fallback of ['Nature', 'Views', 'Food', 'Culture'] as const) {
      if (!out.includes(fallback) && CATEGORY_OPTIONS.includes(fallback)) out.push(fallback);
      if (out.length >= 2) break;
    }
  }
  return out.slice(0, 4);
}

/** Curated Unsplash covers — same CDN pattern as seeded itineraries. */
const CATEGORY_COVER_URLS: Record<string, string[]> = {
  Views: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80',
  ],
  Food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop&q=80',
  ],
  Heritage: [
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&h=600&fit=crop&q=80',
  ],
  Coast: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800&h=600&fit=crop&q=80',
  ],
  Nature: [
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop&q=80',
  ],
  Shopping: ['https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=600&fit=crop&q=80'],
  Culture: ['https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop&q=80'],
  History: ['https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&h=600&fit=crop&q=80'],
  Beach: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80'],
  Seafood: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&h=600&fit=crop&q=80'],
  Gardens: [
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop&q=80',
    'https://images.unsplash.com/photo-1466692476862-a0f5f6c4c0d0?w=800&h=600&fit=crop&q=80',
  ],
  Cafe: ['https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop&q=80'],
};

const AREA_COVER_URLS: Array<{ pattern: RegExp; urls: string[] }> = [
  {
    pattern: /\btagaytay\b/i,
    urls: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&h=600&fit=crop&q=80',
    ],
  },
  {
    pattern: /\b(silang|amadeo)\b/i,
    urls: [
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=600&fit=crop&q=80',
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop&q=80',
    ],
  },
  {
    pattern: /\b(tanza|noveleta|rosario|cavite city|bacoor)\b/i,
    urls: ['https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&h=600&fit=crop&q=80'],
  },
  {
    pattern: /\b(maragondon|imus|trece|dasmarinas|dasmariñas)\b/i,
    urls: ['https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop&q=80'],
  },
];

function hashPick(seed: string, len: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return len > 0 ? h % len : 0;
}

function pickCoverImageUrl({
  cities,
  tags,
  title,
}: {
  cities: string[];
  tags: string[];
  title: string;
}): string {
  const seed = `${title}|${cities.join(',')}|${tags.join(',')}`;
  const areaBlob = cities.join(' ');
  for (const area of AREA_COVER_URLS) {
    if (area.pattern.test(areaBlob)) {
      return area.urls[hashPick(seed, area.urls.length)];
    }
  }
  for (const tag of tags) {
    const pool = CATEGORY_COVER_URLS[tag];
    if (pool?.length) return pool[hashPick(seed, pool.length)];
  }
  const nature = CATEGORY_COVER_URLS.Nature;
  return nature[hashPick(seed, nature.length)];
}

async function generateAiItineraryText({
  venues,
  stopsPerItinerary,
  days,
}: {
  venues: VenueCandidate[];
  stopsPerItinerary: number;
  days: 1 | 2 | 3;
}): Promise<AiItinerary | null> {
  if (venues.length !== stopsPerItinerary) return null;

  const promptVenues = venues.map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city,
    category: v.category,
    description: toFixedHtmlSafeText(v.description, 220),
  }));

  const dayPhrase = days === 1 ? '1-day' : `${days}-day`;
  const routeHint = buildRouteFromVenues(venues);
  const typeGuide = summarizeEstablishmentTypes(venues);

  const system = [
    'You are a travel writer for Cavite, Philippines.',
    'You have deep knowledge of popular tourist destinations there — including Tagaytay ridge,',
    'Pico de Loro, Lake Palakpakin, Las Piñas Bamboo Organ, Maragondon heritage sites,',
    'Corregidor Island ferry routes, Tanza beaches, and upland Silang/Amadeo farms.',
    'When writing itinerary titles and stop descriptions:',
    '- Prioritize well-known, traveler-loved spots.',
    '- Write engaging, accurate, specific copy (not generic filler).',
    '- Keep tone friendly and practical.',
    `- This is a ${dayPhrase} trip with ${stopsPerItinerary} stops — title, subtitle, and bestTime must sound like a ${dayPhrase} itinerary.`,
    '- TITLE: creative, punchy marketing name (3–7 words). Mood, metaphor, or sensory vibe welcome.',
    '- TITLE: never include any stop or establishment names from the venue list.',
    '- TITLE: city names are OK; avoid bland templates like "X Day Trip" or "X Escape".',
    `- TITLE NAMING GUIDE: lean into the kinds of places on this route — ${typeGuide.summary}.`,
    '- TITLE NAMING GUIDE: if stops are mostly farms, sound agrarian/countryside; cafés → coffee/slow-sip; heritage houses → history/story; beaches → salt/coast; viewpoints → ridge/horizon; shopping → browse/finds.',
    '- TITLE examples by type: farms → "Harvest Trails in Silang"; cafés → "Cup & Wander"; heritage → "Heritage Whisper Weekend"; viewpoints → "Above the Ridge at Dusk"; coast → "Salt Air & Slow Sips".',
    '- SUBTITLE: one short line about the vibe or corridor that also reflects those establishment types; do not list stop names.',
    `- ROUTE field: echo this exact city path (do not invent): "${routeHint}".`,
    `- TAGS: pick 2 to 4 categories from this exact list only: ${CATEGORY_OPTIONS.join(', ')}.`,
    '',
    'Return JSON only (no markdown).',
    'All fields must be present and valid.',
    `Only pick priceTier from [1,2,3] and priceTierLabel should match.`,
    `For stops: costType must be one of ${JSON.stringify(COST_TAGS)} or empty string.`,
    `expectTag must be one of ${JSON.stringify(VIBE_TAGS)} or empty string.`,
  ].join('\n');

  const user = {
    context: {
      region: 'Cavite, Philippines',
      stopsPerItinerary,
      days,
      route: routeHint,
      establishmentTypes: typeGuide.labels,
      namingGuide: typeGuide.summary,
    },
    venues: promptVenues,
  };

  let parsed: AiItinerary | null = null;
  try {
    parsed = await kiraChatJson<AiItinerary>({
      temperature: 0.6,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `Create a ${dayPhrase} itinerary for these stops in the given order.\n\nInput JSON:\n${JSON.stringify(
            user
          )}\n\nOutput schema:\n{\n  "title": string,\n  "subtitle": string,\n  "route": string,\n  "bestTime": string,\n  "tags": string[],\n  "priceTier": 1|2|3,\n  "priceTierLabel": string,\n  "stops": [\n    {\n      "name": string,\n      "highlights": string[],\n      "costType": string,\n      "expectTag": string\n    }\n  ]\n}\n\nReturn only valid JSON.`,
        },
      ],
    });
  } catch {
    // Kira unreachable or out of credit: the caller writes the copy itself.
    return null;
  }

  if (!parsed) return null;
  if (!Array.isArray(parsed.stops) || parsed.stops.length !== stopsPerItinerary) return null;
  return parsed;
}

function fallbackItineraryText({
  venues,
  stopsPerItinerary,
  days,
}: {
  venues: VenueCandidate[];
  stopsPerItinerary: number;
  days: 1 | 2 | 3;
}): AiItinerary {
  const route = buildRouteFromVenues(venues.slice(0, stopsPerItinerary));
  const priceTier: 1 | 2 | 3 = 2;
  const priceTierLabel = PRICE_TIERS.find((p) => p.value === priceTier)?.label ?? 'Moderate';
  const tags = mergeCategories([], deriveCategoriesFromVenues(venues));
  const title = buildFallbackTitle(venues, days, tags);

  return {
    title,
    subtitle: route,
    route,
    bestTime: days > 1 ? `${days} days · weekday mornings preferred` : 'Weekday mornings · clearer skies',
    tags,
    priceTier,
    priceTierLabel,
    stops: venues.map((v) => ({
      name: v.name,
      highlights: v.description
        ? [toFixedHtmlSafeText(v.description, 80)]
        : ['Visit this stop'],
      costType: '',
      expectTag: '',
    })),
  };
}

function sanitizeAiItineraryText(
  ai: AiItinerary,
  stopsPerItinerary: number,
  venues: VenueCandidate[],
  days: 1 | 2 | 3
): AiItinerary {
  const priceTier = ai.priceTier === 1 || ai.priceTier === 2 || ai.priceTier === 3 ? ai.priceTier : 2;
  const priceTierLabel = PRICE_TIERS.find((p) => p.value === priceTier)?.label ?? ai.priceTierLabel ?? 'Moderate';

  const stops = ai.stops.slice(0, stopsPerItinerary).map((s) => ({
    name: toFixedHtmlSafeText(s.name, 70),
    highlights: clampHighlights(s.highlights ?? []),
    costType: COST_TAGS.includes(s.costType) ? s.costType : '',
    expectTag: VIBE_TAGS.includes(s.expectTag) ? s.expectTag : '',
  }));

  const tags = mergeCategories(
    Array.isArray(ai.tags) ? ai.tags : [],
    deriveCategoriesFromVenues(venues)
  );

  const route = buildRouteFromVenues(venues);
  let title = toFixedHtmlSafeText(ai.title, 70);
  if (!title || titleContainsVenueName(title, venues)) {
    title = buildFallbackTitle(venues, days, tags);
  }

  const subtitleRaw = toFixedHtmlSafeText(ai.subtitle, 80);
  const subtitle =
    subtitleRaw && !titleContainsVenueName(subtitleRaw, venues) ? subtitleRaw : route;

  return {
    title,
    subtitle,
    route,
    bestTime: toFixedHtmlSafeText(ai.bestTime, 80),
    tags,
    priceTier,
    priceTierLabel,
    stops,
  };
}

async function generateAiTextOrFallback({
  venuesOrdered,
  stopsPerItinerary,
  days,
}: {
  venuesOrdered: VenueCandidate[];
  stopsPerItinerary: number;
  days: 1 | 2 | 3;
}): Promise<AiItinerary> {
  const ai = await generateAiItineraryText({ venues: venuesOrdered, stopsPerItinerary, days });
  if (ai) return sanitizeAiItineraryText(ai, stopsPerItinerary, venuesOrdered, days);
  return sanitizeAiItineraryText(
    fallbackItineraryText({ venues: venuesOrdered, stopsPerItinerary, days }),
    stopsPerItinerary,
    venuesOrdered,
    days
  );
}

function pickCluster(venues: VenueCandidate[], seed: VenueCandidate, size: number): VenueCandidate[] | null {
  const ordered = venues
    .map((v) => ({ v, km: haversineDistanceKm(seed.lat, seed.lng, v.lat, v.lng) }))
    .sort((a, b) => a.km - b.km)
    .map((x) => x.v);

  const slice = ordered.slice(0, size);
  if (slice.length < size) return null;
  return slice;
}

/**
 * Prefer nearest neighbors but swap later slots toward less-used places when possible.
 */
function pickClusterPreferFresh(
  venues: VenueCandidate[],
  seed: VenueCandidate,
  size: number,
  placeUsage: Map<string, number>
): VenueCandidate[] | null {
  const byDist = venues
    .map((v) => ({
      v,
      km: haversineDistanceKm(seed.lat, seed.lng, v.lat, v.lng),
      usage: placeUsage.get(v.id) ?? 0,
    }))
    .sort((a, b) => a.km - b.km || a.usage - b.usage);

  if (byDist.length < size) return null;

  const picked: VenueCandidate[] = [];
  const pickedIds = new Set<string>();

  // Always include seed + closest core.
  for (const item of byDist) {
    if (picked.length >= size) break;
    if (pickedIds.has(item.v.id)) continue;
    // Soft: skip heavily used places for later slots if alternatives exist nearby.
    if (picked.length >= Math.ceil(size * 0.6) && item.usage >= 2) {
      const alt = byDist.find((x) => !pickedIds.has(x.v.id) && x.usage < item.usage && x.km <= item.km + 8);
      if (alt) {
        picked.push(alt.v);
        pickedIds.add(alt.v.id);
        continue;
      }
    }
    picked.push(item.v);
    pickedIds.add(item.v.id);
  }

  return picked.length >= size ? picked.slice(0, size) : null;
}

function buildStop({
  venue,
  aiStop,
  timeWindow,
  durationHint,
}: {
  venue: VenueCandidate;
  aiStop: AiStop | undefined;
  timeWindow: string;
  durationHint: string;
}): AdminItineraryStop {
  const highlights = clampHighlights(aiStop?.highlights ?? []);

  return {
    ...emptyStop(),
    name: aiStop?.name ? toFixedHtmlSafeText(aiStop.name, 70) : venue.name,
    description: venue.description ? toFixedHtmlSafeText(venue.description, 200) : '',
    timeWindow,
    durationHint: durationHint || '',
    costType: aiStop?.costType ?? '',
    expectTag: aiStop?.expectTag ?? '',
    vibeTags: [],
    venueName: venue.name,
    venueLat: venue.lat,
    venueLng: venue.lng,
    mapsUrl: mapsSearchUrl(venue.lat, venue.lng),
    highlights: highlights.length ? highlights : ['Visit this stop'],
    establishment: { placeId: venue.id },
  };
}

function buildItinerary({
  venuesOrdered,
  status,
  aiText,
  days,
}: {
  venuesOrdered: VenueCandidate[];
  status: AdminItinerary['status'];
  aiText: AiItinerary;
  days: 1 | 2 | 3;
}): AdminItinerary {
  const stopsPerItinerary = venuesOrdered.length;
  const timeWindows = multiDayTimeSchedule(stopsPerItinerary, days);
  const sanitized = sanitizeAiItineraryText(aiText, stopsPerItinerary, venuesOrdered, days);

  const route = buildRouteFromVenues(venuesOrdered);
  const tags = mergeCategories(sanitized.tags, deriveCategoriesFromVenues(venuesOrdered));
  let title = sanitized.title || buildFallbackTitle(venuesOrdered, days, tags);
  if (titleContainsVenueName(title, venuesOrdered)) {
    title = buildFallbackTitle(venuesOrdered, days, tags);
  }
  const subtitle =
    sanitized.subtitle && !titleContainsVenueName(sanitized.subtitle, venuesOrdered)
      ? sanitized.subtitle
      : route;

  const bestTime = sanitized.bestTime || 'Weekday mornings · clearer skies';
  const priceTier = sanitized.priceTier;
  const priceTierLabel = sanitized.priceTierLabel;

  const stopList = venuesOrdered.map((venue, i) => {
    const tw = timeWindows[i];
    return buildStop({
      venue,
      aiStop: sanitized.stops[i],
      timeWindow: tw.timeWindow,
      durationHint: tw.durationHint,
    });
  });

  const cities = venuesOrdered.map((v) => v.city).filter(Boolean);
  const image = pickCoverImageUrl({ cities, tags, title });

  const row: AdminItinerary = {
    ...(emptyItinerary() as Omit<AdminItinerary, 'id'>),
    id: '',
    title,
    subtitle,
    route,
    image,
    durationLabel: durationLabelForDays(days),
    priceTier,
    priceTierLabel,
    tags,
    itineraryHighlights: [],
    summary: '',
    stopList,
    bestTime,
    status,
    featured: false,
    tips: [],
  };

  return row;
}

/** Returns a map of placeId → total visit count from app check-in data. */
async function fetchPopularityScores(): Promise<Map<string, number>> {
  try {
    const results = await fetchMostVisitedPlaces(supabase, 50);
    return new Map(results.map((r) => [r.placeId, r.visits]));
  } catch {
    return new Map();
  }
}

async function loadPublishedStopMeta(): Promise<{
  signatures: Set<string>;
  placeUsage: Map<string, number>;
}> {
  const signatures = new Set<string>();
  const placeUsage = new Map<string, number>();
  try {
    const all = await fetchAdminItineraries();
    for (const row of all) {
      if (row.status !== 'published') continue;
      const sig = signatureFromItinerary(row);
      if (sig) signatures.add(sig);
      for (const stop of row.stopList) {
        const id =
          stop.establishment && typeof stop.establishment === 'object'
            ? String((stop.establishment as { placeId?: unknown }).placeId ?? '').trim()
            : '';
        if (!id) continue;
        placeUsage.set(id, (placeUsage.get(id) ?? 0) + 1);
      }
    }
  } catch {
    // Soft-fail: still generate without published dedupe.
  }
  return { signatures, placeUsage };
}

function hintLooksLikeExactFold(hint: string, cityFold: string): boolean {
  const folded = foldLocation(hint);
  if (!folded || !cityFold) return false;
  return folded === cityFold || cityFold.includes(folded) || folded.includes(cityFold);
}

export async function generateItinerariesFromTouristAttractionsBatch({
  count,
  stopsPerItinerary,
  days = 1,
  status,
  locationHint,
  onProgress,
}: GenerateItinerariesBatchParams): Promise<{
  createdIds: string[];
  failedIds: string[];
  matchedLocation?: string | null;
  spellingCorrected?: boolean;
}> {
  const total = Math.max(0, count);
  if (total === 0) return { createdIds: [], failedIds: [] };

  const tripDays: 1 | 2 | 3 = days === 2 || days === 3 ? days : 1;
  const stopCount = Math.max(1, stopsPerItinerary);

  const all = await fetchAdminDestinations(supabase);
  const candidates: VenueCandidate[] = all
    .map((row) => {
      if (row.is_published === false) return null;
      const lat = parseCoord(row.latitude);
      const lng = parseCoord(row.longitude);
      if (lat == null || lng == null) return null;
      return {
        id: row.establishment_public_id,
        name: row.ta_name,
        city: row.city_mun ?? '',
        category: String(row.ntdp_category || row.type || '').trim(),
        description: String(row.description ?? ''),
        lat,
        lng,
      } as VenueCandidate;
    })
    .filter((v): v is VenueCandidate =>
      Boolean(
        v &&
          v.id &&
          v.name &&
          Number.isFinite(v.lat) &&
          Number.isFinite(v.lng) &&
          String(v.id).trim()
      )
    );

  if (candidates.length < stopCount) {
    throw new Error('Not enough published establishments to generate itineraries.');
  }

  const hint = String(locationHint ?? '').trim();
  const hintTokens = hint ? locationTokens(hint) : [];
  const preferredCity = hint && hintTokens.length ? resolvePreferredCity(hint, candidates) : null;

  let matched =
    hint && hintTokens.length
      ? candidates.filter((v) => venueMatchesLocation(v, hint, preferredCity?.fold ?? null))
      : candidates;

  // Prefer a single city's pool when fuzzy/exact city resolution succeeds.
  if (preferredCity) {
    const cityOnly = candidates.filter((v) => foldLocation(v.city) === preferredCity.fold);
    if (cityOnly.length >= stopCount) {
      matched = cityOnly;
    } else if (cityOnly.length > 0) {
      matched = cityOnly;
    }
  }

  if (hint && hintTokens.length && matched.length === 0) {
    throw new Error(
      `No published catalog places match “${hint}”. Try a Cavite city or municipality name from the catalog.`
    );
  }

  const spellingCorrected = Boolean(
    preferredCity && hint && !hintLooksLikeExactFold(hint, preferredCity.fold)
  );
  const matchedLocation = preferredCity?.label ?? null;

  const seedPool = matched.length ? matched : candidates;
  const clusterPool = matched.length >= stopCount ? matched : candidates;

  if (clusterPool.length < stopCount) {
    throw new Error(
      `Not enough published places near “${hint}” to build a ${stopCount}-stop itinerary.`
    );
  }

  const [{ signatures: publishedSigs, placeUsage }, popularityMap] = await Promise.all([
    loadPublishedStopMeta(),
    fetchPopularityScores(),
  ]);

  const scored = seedPool.map((c) => ({
    c,
    score:
      (popularityMap.get(c.id) ?? 0) -
      (placeUsage.get(c.id) ?? 0) * 2 +
      Math.random() * 0.5,
  }));
  scored.sort((a, b) => b.score - a.score);

  // Over-sample seeds so we can skip published stop-set clones.
  const seedLimit = Math.min(Math.max(total * 4, total), scored.length);
  const seeds = scored.slice(0, seedLimit).map((x) => x.c);
  const createdIds: string[] = [];
  const failedIds: string[] = [];
  const usedSignatures = new Set<string>(publishedSigs);

  for (let i = 0; i < seeds.length && createdIds.length < total; i += 1) {
    const seed = seeds[i];
    const cluster = pickClusterPreferFresh(clusterPool, seed, stopCount, placeUsage) ?? pickCluster(clusterPool, seed, stopCount);
    if (!cluster) continue;

    const venuesOrdered = nearestNeighborOrder(cluster, seed.id);
    if (venuesOrdered.length !== stopCount) continue;

    const sig = signatureFromVenues(venuesOrdered);
    if (sig && usedSignatures.has(sig)) continue;

    const aiText = await generateAiTextOrFallback({
      venuesOrdered,
      stopsPerItinerary: stopCount,
      days: tripDays,
    });
    const row = buildItinerary({ venuesOrdered, status, aiText, days: tripDays });
    // Keep title clean; uniquify slug so UNIQUE(itineraries.slug) still holds.
    const slugBase = toFixedHtmlSafeText(row.title, 60)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
    row.slug = `${slugBase || 'itin'}-${Date.now().toString(36).slice(-4)}${createdIds.length}`;

    try {
      const createdId = await persistAdminItinerary(row);
      createdIds.push(createdId);
      if (sig) usedSignatures.add(sig);
    } catch (e) {
      failedIds.push(seed.id);
      // eslint-disable-next-line no-console
      console.warn('Could not persist generated itinerary:', e);
    }

    onProgress?.({ created: createdIds.length, total });
  }

  return { createdIds, failedIds, matchedLocation, spellingCorrected };
}
