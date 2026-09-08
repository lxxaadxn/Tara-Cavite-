const STORAGE_KEY = 'cavitour:itinerary-starts:v1';
export const ITINERARY_STARTS_UPDATED_EVENT = 'cavitour:itinerary-starts-updated';

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
  window.dispatchEvent(new CustomEvent(ITINERARY_STARTS_UPDATED_EVENT));
}

function normalizeEntry(row) {
  if (!row || typeof row !== 'object') return null;
  const id = String(row.id ?? '').trim();
  if (!id) return null;
  return {
    id,
    title: String(row.title ?? 'Itinerary').slice(0, 160),
    startedAt: String(row.startedAt ?? '') || new Date().toISOString(),
  };
}

/**
 * Record that the traveler pressed Start itinerary (unique per itinerary id).
 * @param {string | null | undefined} userId
 * @param {{ id?: string, title?: string }} itinerary
 */
export function recordItineraryStart(userId, itinerary = {}) {
  const uid = String(userId ?? '').trim();
  const id = String(itinerary.id ?? '').trim();
  if (!uid || !id) return;

  const all = readAll();
  const prev = Array.isArray(all[uid]) ? all[uid] : [];
  const filtered = prev.filter((row) => normalizeEntry(row)?.id !== id);
  const entry = {
    id,
    title: String(itinerary.title ?? 'Itinerary').slice(0, 160),
    startedAt: new Date().toISOString(),
  };
  all[uid] = [entry, ...filtered.map((row) => normalizeEntry(row)).filter(Boolean)].slice(0, 200);
  writeAll(all);
}

/** @returns {{ id: string, title: string, startedAt: string }[]} */
export function getItineraryStarts(userId) {
  const uid = String(userId ?? '').trim();
  if (!uid) return [];
  const all = readAll();
  const raw = Array.isArray(all[uid]) ? all[uid] : [];
  return raw
    .map((row) => normalizeEntry(row))
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export function getItineraryStartsCount(userId) {
  return getItineraryStarts(userId).length;
}
