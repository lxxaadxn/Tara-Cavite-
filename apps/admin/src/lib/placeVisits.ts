import type { SupabaseClient } from '@supabase/supabase-js';
import { CONTENT_PIPELINE } from 'cavitour-shared';
import {
  buildCheckinUrl,
  foldEstablishmentName,
  qrImageUrl,
} from 'cavitour-shared/placeCheckin';

export type PlaceCheckinInfo = {
  placeId: string;
  code: string;
  isActive: boolean;
  checkinUrl: string;
  qrUrl: string;
  totalVisits: number;
  qrVisits?: number;
};

export type EstablishmentVisitStatRow = {
  placeId: string;
  placeName: string;
  checkinCode: string | null;
  totalVisits: number;
  qrVisits: number;
  destinationReachedVisits: number;
  lastVisitAt: string | null;
};

/** Public marketing-web origin used inside QR codes (must host /checkin/:code). */
export function getPublicWebOrigin(): string {
  const fromEnv = String(
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_PUBLIC_WEB_ORIGIN ||
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_CHECKIN_WEB_ORIGIN ||
      ''
  )
    .trim()
    .replace(/\/$/, '');
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined' && window.location?.origin) {
    const { protocol, hostname, port } = window.location;
    // Standalone admin (:3001) does not serve /checkin — point QR at the web app.
    if (port === '3001' || port === '3000') {
      return `${protocol}//${hostname}:5173`;
    }
    return window.location.origin.replace(/\/$/, '');
  }
  return 'http://localhost:5173';
}

/** Avoid PostgREST URL limits when filtering many UUIDs with `.in()`. */
const PLACE_ID_CHUNK = 80;

function chunkIds(ids: string[], size = PLACE_ID_CHUNK): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    out.push(ids.slice(i, i + size));
  }
  return out;
}

type RawCounts = Map<string, { total: number; qr: number }>;

function emptyCounts(): { total: number; qr: number } {
  return { total: 0, qr: 0 };
}

function addCount(map: RawCounts, placeId: string, source?: string) {
  const prev = map.get(placeId) ?? emptyCounts();
  prev.total += 1;
  if (source === 'qr' || source === 'code') prev.qr += 1;
  map.set(placeId, prev);
}

function buildAliasMaps(
  places: { id: string; name: string }[],
  sta: { id: string; name: string }[]
): { placesToAliases: Map<string, string[]>; aliasToPlaces: Map<string, string> } {
  const staByFold = new Map<string, string>();
  for (const row of sta) {
    const fold = foldEstablishmentName(row.name);
    if (fold && row.id && !staByFold.has(fold)) staByFold.set(fold, row.id);
  }

  const placesToAliases = new Map<string, string[]>();
  const aliasToPlaces = new Map<string, string>();

  for (const p of places) {
    const placeId = String(p.id);
    const aliases = [placeId];
    const fold = foldEstablishmentName(p.name);
    const staId = fold ? staByFold.get(fold) : undefined;
    if (staId && staId !== placeId) {
      aliases.push(staId);
      aliasToPlaces.set(staId, placeId);
    }
    aliasToPlaces.set(placeId, placeId);
    placesToAliases.set(placeId, aliases);
  }

  return { placesToAliases, aliasToPlaces };
}

function sumAliases(
  placesToAliases: Map<string, string[]>,
  raw: RawCounts
): Map<string, { total: number; qr: number }> {
  const out = new Map<string, { total: number; qr: number }>();
  for (const [placeId, aliases] of placesToAliases) {
    const sum = emptyCounts();
    for (const alias of aliases) {
      const c = raw.get(alias);
      if (!c) continue;
      sum.total += c.total;
      sum.qr += c.qr;
    }
    out.set(placeId, sum);
  }
  return out;
}

async function loadPlacesNames(
  client: SupabaseClient,
  placeIds: string[]
): Promise<{ id: string; name: string; city: string }[]> {
  if (!placeIds.length) return [];
  const byId = new Map<string, { id: string; name: string; city: string }>();
  for (const chunk of chunkIds(placeIds)) {
    const { data, error } = await client
      .from(CONTENT_PIPELINE.establishmentsView)
      .select('establishment_public_id, ta_name, city_mun')
      .in('establishment_public_id', chunk);
    if (error) {
      console.warn('[placeVisits] STA catalog', error.message);
      continue;
    }
    for (const r of data ?? []) {
      const id = String(r.establishment_public_id ?? '');
      if (!id) continue;
      byId.set(id, {
        id,
        name: String(r.ta_name || ''),
        city: String(r.city_mun || '—'),
      });
    }
  }
  return placeIds.map((id) => byId.get(id) ?? { id, name: '', city: '—' });
}

async function loadViaAdminRpc(client: SupabaseClient): Promise<{
  rawCounts: RawCounts;
  codes: { placeId: string; code: string; isActive: boolean }[];
  sta: { id: string; name: string }[];
} | null> {
  try {
    const { data, error } = await client.rpc('get_admin_destination_checkin_stats');
    if (error || !data || typeof data !== 'object') return null;
    const payload = data as {
      visit_counts?: { place_id?: string; total_visits?: number; qr_visits?: number }[];
      visits_flat?: { place_id?: string; source?: string }[];
      codes?: { place_id?: string; code?: string; is_active?: boolean }[];
      sta?: { id?: string; name?: string }[];
    };

    const rawCounts: RawCounts = new Map();
    if (Array.isArray(payload.visit_counts) && payload.visit_counts.length) {
      for (const row of payload.visit_counts) {
        const id = String(row.place_id || '');
        if (!id) continue;
        rawCounts.set(id, {
          total: Number(row.total_visits) || 0,
          qr: Number(row.qr_visits) || 0,
        });
      }
    } else if (Array.isArray(payload.visits_flat)) {
      for (const row of payload.visits_flat) {
        const id = String(row.place_id || '');
        if (!id) continue;
        addCount(rawCounts, id, row.source);
      }
    }

    const codes = (payload.codes ?? [])
      .map((c) => ({
        placeId: String(c.place_id || ''),
        code: String(c.code || ''),
        isActive: c.is_active !== false,
      }))
      .filter((c) => c.placeId && c.code);

    const sta = (payload.sta ?? [])
      .map((s) => ({ id: String(s.id || ''), name: String(s.name || '') }))
      .filter((s) => s.id);

    return { rawCounts, codes, sta };
  } catch (e) {
    console.warn('[placeVisits] admin RPC', e);
    return null;
  }
}

async function loadViaDirectQueries(client: SupabaseClient): Promise<{
  rawCounts: RawCounts;
  codes: { placeId: string; code: string; isActive: boolean }[];
  sta: { id: string; name: string }[];
}> {
  const rawCounts: RawCounts = new Map();

  const { data: counts, error: countErr } = await client
    .from('v_place_visit_counts')
    .select('place_id, total_visits, qr_visits');

  if (!countErr && counts?.length) {
    for (const row of counts) {
      rawCounts.set(String(row.place_id), {
        total: Number(row.total_visits) || 0,
        qr: Number(row.qr_visits) || 0,
      });
    }
  } else {
    const { data: visits } = await client.from('place_visits').select('place_id, source').limit(20000);
    for (const row of visits ?? []) {
      addCount(rawCounts, String(row.place_id), row.source as string | undefined);
    }
  }

  const { data: codeRows } = await client
    .from('place_checkin_codes')
    .select('place_id, code, is_active');
  const codes = (codeRows ?? [])
    .map((c) => ({
      placeId: String(c.place_id || ''),
      code: String(c.code || ''),
      isActive: c.is_active !== false,
    }))
    .filter((c) => c.placeId && c.code);

  let sta: { id: string; name: string }[] = [];
  const staView = await client
    .from(CONTENT_PIPELINE.establishmentsView)
    .select('establishment_public_id, ta_name')
    .limit(1200);
  if (!staView.error && staView.data?.length) {
    sta = staView.data.map((r) => ({
      id: String(r.establishment_public_id || ''),
      name: String(r.ta_name || ''),
    }));
  } else {
    const staTable = await client.from(CONTENT_PIPELINE.adminPlacesTable).select('id, ta_name').limit(1200);
    if (!staTable.error) {
      sta = (staTable.data ?? []).map((r) => ({
        id: String(r.id || ''),
        name: String(r.ta_name || ''),
      }));
    }
  }

  return { rawCounts, codes, sta: sta.filter((s) => s.id) };
}

export async function fetchPlaceCheckinMap(
  client: SupabaseClient,
  placeIds: string[]
): Promise<Map<string, PlaceCheckinInfo>> {
  const map = new Map<string, PlaceCheckinInfo>();
  const ids = [...new Set(placeIds.map(String).filter(Boolean))];
  if (!ids.length) return map;

  const origin = getPublicWebOrigin();
  const places = await loadPlacesNames(client, ids);

  const viaRpc = await loadViaAdminRpc(client);
  const bundle = viaRpc ?? (await loadViaDirectQueries(client));

  const { placesToAliases } = buildAliasMaps(places, bundle.sta);
  const visitCounts = sumAliases(placesToAliases, bundle.rawCounts);

  const codeById = new Map(bundle.codes.map((c) => [c.placeId, c]));

  for (const placeId of ids) {
    const aliases = placesToAliases.get(placeId) || [placeId];
    let codeProp: { code: string; isActive: boolean } | null = null;
    for (const alias of aliases) {
      const hit = codeById.get(alias);
      if (hit?.code) {
        codeProp = { code: hit.code, isActive: hit.isActive };
        break;
      }
    }
    const c = visitCounts.get(placeId) ?? emptyCounts();
    const code = codeProp?.code || '';
    const checkinUrl = code ? buildCheckinUrl(origin, code) : '';
    map.set(placeId, {
      placeId,
      code,
      isActive: codeProp?.isActive ?? false,
      checkinUrl,
      qrUrl: checkinUrl ? qrImageUrl(checkinUrl, 200) : '',
      totalVisits: c.total,
      qrVisits: c.qr,
    });
  }

  return map;
}

export async function fetchMostVisitedPlaces(
  client: SupabaseClient,
  limit = 8
): Promise<{ name: string; visits: number; city: string; placeId: string }[]> {
  const { data: counts, error } = await client
    .from('v_place_visit_counts')
    .select('place_id, total_visits')
    .order('total_visits', { ascending: false })
    .limit(Math.max(limit * 4, 32));

  let ranked: [string, number][] = [];
  if (error) {
    const { data: visits, error: visitErr } = await client
      .from('place_visits')
      .select('place_id')
      .order('created_at', { ascending: false })
      .limit(5000);
    if (visitErr) throw new Error(visitErr.message);
    if (!visits?.length) return [];
    const tally = new Map<string, number>();
    for (const row of visits) {
      const id = String(row.place_id);
      tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit * 4);
  } else {
    ranked = (counts ?? []).map((r) => [String(r.place_id), Number(r.total_visits) || 0] as [string, number]);
  }

  const names = await loadPlacesNames(
    client,
    ranked.map(([id]) => id)
  );
  const byId = new Map(names.map((p) => [p.id, p]));
  const cmap = await fetchPlaceCheckinMap(
    client,
    ranked.map(([id]) => id)
  );

  return ranked
    .map(([placeId, visitsCount]) => {
      const info = cmap.get(placeId);
      const named = byId.get(placeId);
      return {
        placeId,
        visits: info?.totalVisits ?? visitsCount,
        name: named?.name || placeId.slice(0, 8),
        city: named?.city || '—',
      };
    })
    .filter((r) => r.visits > 0)
    .sort((a, b) => b.visits - a.visits)
    .slice(0, limit);
}

/** Future Establishment portal — same visit totals the business will see. */
export async function fetchMyEstablishmentVisitStats(
  client: SupabaseClient
): Promise<EstablishmentVisitStatRow[]> {
  const { data, error } = await client.rpc('get_my_establishment_visit_stats');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    placeId: String(row.place_id),
    placeName: String(row.place_name || 'Place'),
    checkinCode: row.checkin_code ? String(row.checkin_code) : null,
    totalVisits: Number(row.total_visits) || 0,
    qrVisits: Number(row.qr_visits) || 0,
    destinationReachedVisits: Number(row.destination_reached_visits) || 0,
    lastVisitAt: row.last_visit_at ? String(row.last_visit_at) : null,
  }));
}
