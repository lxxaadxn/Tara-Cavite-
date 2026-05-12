const STORAGE_KEY = 'cavitour:map-place-visits:v1';
export const MAP_VISITS_UPDATED_EVENT = 'cavitour:map-visits-updated';
const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function readAll() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent(MAP_VISITS_UPDATED_EVENT));
}

function normalizeEntry(x, pidFallback) {
  if (x && typeof x === 'object' && x.id) {
    return {
      id: String(x.id),
      name: String(x.name || 'Place on map').slice(0, 160),
      image: x.image || PLACEHOLDER_IMG,
      savedAt: x.savedAt || new Date().toISOString(),
    };
  }
  if (typeof x === 'string') {
    return {
      id: x,
      name: 'Place on map',
      image: PLACEHOLDER_IMG,
      savedAt: null,
    };
  }
  return {
    id: String(pidFallback || ''),
    name: 'Place on map',
    image: PLACEHOLDER_IMG,
    savedAt: null,
  };
}

/**
 * Record a place opened from the map / home browse (deduped per id per user per calendar month, UTC).
 * @param {string | null | undefined} userId
 * @param {string | null | undefined} placeId
 * @param {{ name?: string; image?: string }} [meta]
 */
export function recordMapPlaceVisit(userId, placeId, meta = {}) {
  const uid = String(userId ?? '').trim();
  const pid = String(placeId ?? '').trim();
  if (!uid || !pid) return;

  const m = monthKey();
  const all = readAll();
  const bucketKey = `${uid}:${m}`;
  const prev = Array.isArray(all[bucketKey]) ? all[bucketKey] : [];
  const filtered = prev.filter((row) => normalizeEntry(row, '').id !== pid);
  const entry = {
    id: pid,
    name: String(meta.name || 'Place on map').slice(0, 160),
    image: meta.image || PLACEHOLDER_IMG,
    savedAt: new Date().toISOString(),
  };
  all[bucketKey] = [entry, ...filtered.map((row) => normalizeEntry(row))].slice(0, 200);
  writeAll(all);
}

/** @returns {{ id: string; name: string; image: string; savedAt: string | null }[]} */
export function getThisMonthVisitEntries(userId) {
  const uid = String(userId ?? '').trim();
  if (!uid) return [];
  const all = readAll();
  const bucketKey = `${uid}:${monthKey()}`;
  const raw = Array.isArray(all[bucketKey]) ? all[bucketKey] : [];
  return raw.map((row) => normalizeEntry(row)).filter((e) => e.id);
}

export function getThisMonthVisitCount(userId) {
  return getThisMonthVisitEntries(userId).length;
}
