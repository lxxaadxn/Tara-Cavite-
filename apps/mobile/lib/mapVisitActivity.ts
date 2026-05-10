import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'cavitour:map-place-visits:v1';

export type MapVisitEntry = {
  id: string;
  name: string;
  image?: string;
  savedAt: string;
};

function monthKey(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

type BucketRow = string | MapVisitEntry | Record<string, unknown>;

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
}

function normalizeEntry(x: BucketRow): MapVisitEntry {
  if (x && typeof x === 'object' && 'id' in x && typeof (x as MapVisitEntry).id === 'string') {
    const o = x as MapVisitEntry;
    return {
      id: o.id,
      name: String(o.name || 'Place on map').slice(0, 160),
      image: o.image,
      savedAt: o.savedAt || new Date().toISOString(),
    };
  }
  if (typeof x === 'string') {
    return { id: x, name: 'Place on map', savedAt: new Date().toISOString() };
  }
  return { id: '', name: 'Place on map', savedAt: new Date().toISOString() };
}

export async function recordMapPlaceVisit(
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
  const entry: MapVisitEntry = {
    id: pid,
    name: String(meta.name || 'Place on map').slice(0, 160),
    image: meta.image,
    savedAt: new Date().toISOString(),
  };
  all[bucketKey] = [entry, ...normalized].slice(0, 200);
  await writeAll(all);
}

export async function getThisMonthVisitEntries(userId: string | null | undefined): Promise<MapVisitEntry[]> {
  const uid = String(userId ?? '').trim();
  if (!uid) return [];
  const all = await readAll();
  const bucketKey = `${uid}:${monthKey()}`;
  const raw = Array.isArray(all[bucketKey]) ? all[bucketKey] : [];
  return raw.map((row) => normalizeEntry(row)).filter((e) => e.id);
}

export async function getThisMonthVisitCount(userId: string | null | undefined): Promise<number> {
  const entries = await getThisMonthVisitEntries(userId);
  return entries.length;
}
