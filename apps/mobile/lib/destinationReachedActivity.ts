import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const STORAGE_KEY = 'cavitour:destination-reached:v1';

export const DESTINATION_REACHED_UPDATED_EVENT = 'cavitour:destination-reached-updated';

export type DestinationReachedEntry = {
  id: string;
  name: string;
  image?: string;
  savedAt: string;
};

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

type BucketRow = string | DestinationReachedEntry | Record<string, unknown>;

async function readAll(): Promise<Record<string, BucketRow[]>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, BucketRow[]>)
      : {};
  } catch {
    return {};
  }
}

async function writeAll(data: Record<string, BucketRow[]>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  DeviceEventEmitter.emit(DESTINATION_REACHED_UPDATED_EVENT);
}

function normalizeEntry(x: BucketRow): DestinationReachedEntry {
  if (x && typeof x === 'object' && 'id' in x && typeof (x as DestinationReachedEntry).id === 'string') {
    const o = x as DestinationReachedEntry;
    return {
      id: o.id,
      name: String(o.name || 'Place').slice(0, 160),
      image: o.image,
      savedAt: o.savedAt || new Date().toISOString(),
    };
  }
  if (typeof x === 'string') {
    return { id: x, name: 'Place', savedAt: new Date().toISOString() };
  }
  return { id: '', name: 'Place', savedAt: new Date().toISOString() };
}

/**
 * User confirmed they arrived (e.g. tapped "Destination Reached" after a trip). Deduped per place id per user per month (UTC).
 */
export async function recordDestinationReached(
  userId: string | null | undefined,
  placeId: string | null | undefined,
  meta: { name?: string; image?: string } = {}
) {
  const uid = String(userId ?? '').trim();
  const pid = String(placeId ?? '').trim();
  if (!uid || !pid) return;

  const m = monthKey();
  const all = await readAll();
  const bucketKey = `${uid}:${m}`;
  const prev = Array.isArray(all[bucketKey]) ? all[bucketKey] : [];
  const normalized = prev.map((row) => normalizeEntry(row)).filter((e) => e.id && e.id !== pid);
  const entry: DestinationReachedEntry = {
    id: pid,
    name: String(meta.name || 'Place').slice(0, 160),
    image: meta.image,
    savedAt: new Date().toISOString(),
  };
  all[bucketKey] = [entry, ...normalized].slice(0, 200);
  await writeAll(all);
}

export async function getThisMonthDestinationReachedEntries(
  userId: string | null | undefined
): Promise<DestinationReachedEntry[]> {
  const uid = String(userId ?? '').trim();
  if (!uid) return [];
  const all = await readAll();
  const bucketKey = `${uid}:${monthKey()}`;
  const raw = Array.isArray(all[bucketKey]) ? all[bucketKey] : [];
  return raw.map((row) => normalizeEntry(row)).filter((e) => e.id);
}

export async function getThisMonthDestinationReachedCount(userId: string | null | undefined): Promise<number> {
  const entries = await getThisMonthDestinationReachedEntries(userId);
  return entries.length;
}

/** Unique destinations reached across all months for a user. */
export async function getAllDestinationReachedEntries(
  userId: string | null | undefined
): Promise<DestinationReachedEntry[]> {
  const uid = String(userId ?? '').trim();
  if (!uid) return [];
  const all = await readAll();
  const prefix = `${uid}:`;
  const byId = new Map<string, DestinationReachedEntry>();
  for (const [key, raw] of Object.entries(all)) {
    if (!key.startsWith(prefix) || !Array.isArray(raw)) continue;
    for (const row of raw) {
      const entry = normalizeEntry(row);
      if (!entry.id) continue;
      const prev = byId.get(entry.id);
      if (!prev || (entry.savedAt && (!prev.savedAt || entry.savedAt > prev.savedAt))) {
        byId.set(entry.id, entry);
      }
    }
  }
  return [...byId.values()].sort((a, b) => {
    const ta = a.savedAt ? Date.parse(a.savedAt) : 0;
    const tb = b.savedAt ? Date.parse(b.savedAt) : 0;
    return tb - ta;
  });
}
