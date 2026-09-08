import {
  deleteItinerary as deleteItineraryRow,
  fetchAllItineraries,
  fetchItineraryByIdOrSlug,
  subscribeItineraries,
  uploadItineraryCover,
  upsertItinerary,
  setItineraryFeatured,
} from 'cavitour-shared/itineraries';
import { supabase } from './supabase';

export type AdminItineraryStatus = 'published' | 'draft' | 'flagged';

export type AdminItineraryStop = {
  clientId: string;
  name: string;
  description: string;
  timeWindow: string;
  durationHint: string;
  costType: string;
  expectTag: string;
  vibeTags: string[];
  venueName: string;
  venueLat: number | null;
  venueLng: number | null;
  mapsUrl: string;
  highlights: string[];
  establishment?: { placeId: string };
};

export type AdminItinerary = {
  id: string;
  slug?: string;
  title: string;
  subtitle: string;
  route: string;
  image: string;
  durationLabel: string;
  priceTier: 1 | 2 | 3;
  priceTierLabel: string;
  tags: string[];
  summary: string;
  itineraryHighlights: string[];
  stopList: AdminItineraryStop[];
  tips: string[];
  bestTime: string;
  status: AdminItineraryStatus;
  featured: boolean;
};

export const CATEGORY_OPTIONS = [
  'Views',
  'Food',
  'Heritage',
  'Coast',
  'Nature',
  'Shopping',
  'Culture',
  'History',
  'Beach',
  'Seafood',
  'Gardens',
  'Cafe',
];

export const DURATION_PRESETS = ['2 hrs', '4 hrs', '6 hrs', '8 hrs', '1 day', '2 days', '3 days'];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toTimeInputValue(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!m) return '';
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || min > 59) return '';
  const ap = m[3]?.toUpperCase();
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  if (h > 23) return '';
  return `${pad2(h)}:${pad2(min)}`;
}

function fromTimeInputValue(hhmm: string): string {
  if (!hhmm) return '';
  const [hs, ms] = hhmm.split(':');
  const h = Number(hs);
  const min = Number(ms);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return '';
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${pad2(h12)}:${pad2(min)} ${ap}`;
}

export function parseTimeWindow(value: string): { start: string; end: string } {
  const parts = String(value ?? '')
    .split(/\s*[–—-]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    start: toTimeInputValue(parts[0] ?? ''),
    end: toTimeInputValue(parts[1] ?? ''),
  };
}

export function formatTimeWindow(start: string, end: string): string {
  const a = fromTimeInputValue(start);
  const b = fromTimeInputValue(end);
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

function minutesFromHhmm(hhmm: string): number | null {
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatStayMinutes(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  const hourPart = hours === 0 ? '' : hours === 1 ? '1 hr' : `${hours} hrs`;
  const minPart = mins === 0 ? '' : `${mins} min`;
  if (hourPart && minPart) return `${hourPart} ${minPart}`;
  return hourPart || minPart || '0 min';
}

export function durationHintFromTimes(start: string, end: string): string {
  const a = minutesFromHhmm(start);
  const b = minutesFromHhmm(end);
  if (a == null || b == null) return '';
  let diff = b - a;
  if (diff < 0) diff += 24 * 60;
  return formatStayMinutes(diff);
}

export function durationHintFromTimeWindow(timeWindow: string): string {
  const { start, end } = parseTimeWindow(timeWindow);
  return durationHintFromTimes(start, end);
}

export const PRICE_TIERS: { value: 1 | 2 | 3; label: string; badge: string }[] = [
  { value: 1, label: 'Budget', badge: 'Budget · $' },
  { value: 2, label: 'Moderate', badge: 'Moderate · $$' },
  { value: 3, label: 'Premium', badge: 'Premium · $$$' },
];

export const COST_TAGS = ['Pay per Order', 'Free Entry', 'Entrance Fee'];
export const VIBE_TAGS = ['Sip & Snack', 'Souvenir Shopping', 'Full Meal'];
export const STOP_TAG_OPTIONS = [...COST_TAGS, ...VIBE_TAGS];

const COST_TAG_ALIASES: Record<string, string> = {
  'Entrance Fee Required': 'Entrance Fee',
};

function normalizeCostTag(value: string): string {
  const v = value.trim();
  return COST_TAG_ALIASES[v] ?? v;
}

export function newLocalId(prefix = 'local'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function mapsSearchUrl(lat: number | null | undefined, lng: number | null | undefined): string {
  if (lat == null || lng == null) return '';
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function emptyStop(): AdminItineraryStop {
  return {
    clientId: newLocalId('stop'),
    name: '',
    description: '',
    timeWindow: '',
    durationHint: '',
    costType: '',
    expectTag: '',
    vibeTags: [],
    venueName: '',
    venueLat: null,
    venueLng: null,
    mapsUrl: '',
    highlights: [''],
  };
}

export function emptyItinerary(): Omit<AdminItinerary, 'id'> {
  return {
    title: '',
    subtitle: '',
    route: '',
    image: '',
    durationLabel: '2 hrs',
    priceTier: 2,
    priceTierLabel: 'Moderate',
    tags: [],
    summary: '',
    itineraryHighlights: [],
    stopList: [emptyStop()],
    tips: [],
    bestTime: '',
    status: 'draft',
    featured: false,
  };
}

export function stopCount(row: AdminItinerary): number {
  return row.stopList.filter((s) => s.name.trim() || s.venueName.trim()).length || row.stopList.length;
}

export function selectedStopTags(stop: AdminItineraryStop): string[] {
  const out: string[] = [];
  for (const t of [stop.costType, stop.expectTag, ...stop.vibeTags]) {
    const v = normalizeCostTag(t);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

export function applyStopTags(stop: AdminItineraryStop, tags: string[]): AdminItineraryStop {
  const unique = [...new Set(tags.map((t) => normalizeCostTag(t)).filter(Boolean))];
  const costType = unique.find((t) => COST_TAGS.includes(t)) ?? '';
  const expectTag = unique.find((t) => VIBE_TAGS.includes(t)) ?? '';
  const vibeTags = unique.filter((t) => t !== costType && t !== expectTag);
  return { ...stop, costType, expectTag, vibeTags };
}

export function persistableImage(image: string, previous?: string): string {
  const next = image.trim();
  if (!next || next.startsWith('blob:')) {
    const prev = (previous ?? '').trim();
    if (prev && !prev.startsWith('blob:')) return prev;
    return '';
  }
  return next;
}

function persistableStop(stop: AdminItineraryStop): AdminItineraryStop {
  return {
    ...stop,
    highlights: stop.highlights.map((h) => h.trim()).filter(Boolean).length
      ? stop.highlights.map((h) => h.trim()).filter(Boolean)
      : [],
  };
}

export function persistableItinerary(row: AdminItinerary, previous?: AdminItinerary): AdminItinerary {
  return {
    ...row,
    title: row.title.trim(),
    subtitle: row.subtitle.trim() || row.route.trim(),
    route: row.route.trim(),
    image: persistableImage(row.image, previous?.image),
    durationLabel: row.durationLabel.trim(),
    bestTime: row.bestTime.trim(),
    stopList: row.stopList.map(persistableStop),
    slug: row.slug || previous?.slug,
    featured: Boolean(previous?.featured ?? row.featured),
  };
}

function isStatus(v: unknown): v is AdminItineraryStatus {
  return v === 'published' || v === 'draft' || v === 'flagged';
}

function asStop(raw: unknown, index: number): AdminItineraryStop | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const lat = typeof s.venueLat === 'number' && Number.isFinite(s.venueLat) ? s.venueLat : null;
  const lng = typeof s.venueLng === 'number' && Number.isFinite(s.venueLng) ? s.venueLng : null;
  const placeId =
    s.establishment && typeof s.establishment === 'object'
      ? String((s.establishment as { placeId?: unknown }).placeId ?? '').trim()
      : '';
  const highlights = Array.isArray(s.highlights)
    ? s.highlights.map((h) => String(h ?? ''))
    : [];
  const vibeTags = Array.isArray(s.vibeTags) ? s.vibeTags.map((t) => String(t ?? '')).filter(Boolean) : [];
  return {
    clientId: String(s.clientId ?? `stop-${index}-${Math.random().toString(36).slice(2, 6)}`),
    name: String(s.name ?? ''),
    description: String(s.description ?? ''),
    timeWindow: String(s.timeWindow ?? ''),
    durationHint: String(s.durationHint ?? ''),
    costType: String(s.costType ?? ''),
    expectTag: String(s.expectTag ?? ''),
    vibeTags,
    venueName: String(s.venueName ?? ''),
    venueLat: lat,
    venueLng: lng,
    mapsUrl: String(s.mapsUrl ?? '') || mapsSearchUrl(lat, lng),
    highlights: highlights.length ? highlights : [''],
    establishment: placeId ? { placeId } : undefined,
  };
}

function asItinerary(raw: unknown): AdminItinerary | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.id ?? '').trim();
  if (!id) return null;
  const tier = r.priceTier === 1 || r.priceTier === 3 ? r.priceTier : 2;
  const stopList = Array.isArray(r.stopList)
    ? r.stopList.map(asStop).filter((s): s is AdminItineraryStop => Boolean(s))
    : [];
  return {
    id,
    slug: String(r.slug ?? '').trim() || undefined,
    title: String(r.title ?? ''),
    subtitle: String(r.subtitle ?? ''),
    route: String(r.route ?? ''),
    image: persistableImage(String(r.image ?? '')),
    durationLabel: String(r.durationLabel ?? ''),
    priceTier: tier,
    priceTierLabel: String(r.priceTierLabel ?? PRICE_TIERS.find((p) => p.value === tier)?.label ?? 'Moderate'),
    tags: Array.isArray(r.tags) ? r.tags.map((t) => String(t ?? '')).filter(Boolean) : [],
    summary: String(r.summary ?? ''),
    itineraryHighlights: Array.isArray(r.itineraryHighlights)
      ? r.itineraryHighlights.map((h) => String(h ?? '')).filter(Boolean)
      : Array.isArray(r.highlights)
        ? r.highlights.map((h) => String(h ?? '')).filter(Boolean)
        : [],
    stopList: stopList.length ? stopList : [emptyStop()],
    tips: Array.isArray(r.tips) ? r.tips.map((t) => String(t ?? '')).filter(Boolean) : [],
    bestTime: String(r.bestTime ?? ''),
    status: isStatus(r.status) ? r.status : 'draft',
    featured: Boolean(r.featured),
  };
}

export async function fetchAdminItineraries(): Promise<AdminItinerary[]> {
  const rows: unknown[] = await fetchAllItineraries(supabase);
  return rows.map((row) => persistableItinerary(asItinerary(row) ?? (row as AdminItinerary)));
}

export async function fetchAdminItinerary(id: string): Promise<AdminItinerary | null> {
  const row = await fetchItineraryByIdOrSlug(supabase, id);
  return row ? persistableItinerary(asItinerary(row) ?? (row as AdminItinerary)) : null;
}

export function subscribeAdminItineraries(onChange: () => void): () => void {
  return subscribeItineraries(supabase, onChange);
}

export async function persistAdminItinerary(
  row: AdminItinerary,
  options?: { previous?: AdminItinerary; coverFile?: File | null }
): Promise<string> {
  const saved = persistableItinerary(row, options?.previous);
  const id = await upsertItinerary(supabase, saved);
  const file = options?.coverFile;
  if (file && file.type.startsWith('image/')) {
    const url = await uploadItineraryCover(supabase, id, file);
    if (url) await upsertItinerary(supabase, { ...saved, id, image: url });
  }
  return id;
}

export async function deleteAdminItinerary(id: string): Promise<void> {
  await deleteItineraryRow(supabase, id);
}

export async function setAdminItineraryFeatured(id: string, featured: boolean): Promise<void> {
  await setItineraryFeatured(supabase, id, featured);
}

export function upsertAdminItinerary(
  rows: AdminItinerary[],
  next: AdminItinerary,
  previous?: AdminItinerary
): AdminItinerary[] {
  const saved = persistableItinerary(next, previous);
  const idx = rows.findIndex((r) => r.id === saved.id);
  if (idx >= 0) {
    const copy = [...rows];
    copy[idx] = saved;
    return copy;
  }
  return [...rows, saved];
}
