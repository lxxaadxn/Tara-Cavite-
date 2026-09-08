import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const STORAGE_KEY = 'cavitour:itinerary-starts:v1';
export const ITINERARY_STARTS_UPDATED_EVENT = 'cavitour:itinerary-starts-updated';

export type ItineraryStartEntry = {
  id: string;
  title: string;
  startedAt: string;
};

function normalizeEntry(row: unknown): ItineraryStartEntry | null {
  if (!row || typeof row !== 'object') return null;
  const id = String((row as { id?: unknown }).id ?? '').trim();
  if (!id) return null;
  return {
    id,
    title: String((row as { title?: unknown }).title ?? 'Itinerary').slice(0, 160),
    startedAt: String((row as { startedAt?: unknown }).startedAt ?? '') || new Date().toISOString(),
  };
}

async function readAll(): Promise<Record<string, ItineraryStartEntry[]>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeAll(data: Record<string, ItineraryStartEntry[]>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  DeviceEventEmitter.emit(ITINERARY_STARTS_UPDATED_EVENT);
}

/** Record that the traveler pressed Start itinerary (unique per itinerary id). */
export async function recordItineraryStart(
  userId: string | null | undefined,
  itinerary: { id?: string; title?: string } = {}
) {
  const uid = String(userId ?? '').trim();
  const id = String(itinerary.id ?? '').trim();
  if (!uid || !id) return;

  const all = await readAll();
  const prev = Array.isArray(all[uid]) ? all[uid] : [];
  const filtered = prev
    .map((row) => normalizeEntry(row))
    .filter((row): row is ItineraryStartEntry => row != null && row.id !== id);
  const entry: ItineraryStartEntry = {
    id,
    title: String(itinerary.title ?? 'Itinerary').slice(0, 160),
    startedAt: new Date().toISOString(),
  };
  all[uid] = [entry, ...filtered].slice(0, 200);
  await writeAll(all);
}

export async function getItineraryStarts(userId: string | null | undefined): Promise<ItineraryStartEntry[]> {
  const uid = String(userId ?? '').trim();
  if (!uid) return [];
  const all = await readAll();
  const raw = Array.isArray(all[uid]) ? all[uid] : [];
  return raw
    .map((row) => normalizeEntry(row))
    .filter((row): row is ItineraryStartEntry => row != null)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
}

export async function getItineraryStartsCount(userId: string | null | undefined): Promise<number> {
  return (await getItineraryStarts(userId)).length;
}
