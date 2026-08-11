import type { SupabaseClient } from '@supabase/supabase-js';
import { buildCheckinUrl, qrImageUrl } from 'cavitour-shared/placeCheckin';

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

export async function fetchPlaceCheckinMap(
  client: SupabaseClient,
  placeIds: string[]
): Promise<Map<string, PlaceCheckinInfo>> {
  const map = new Map<string, PlaceCheckinInfo>();
  if (!placeIds.length) return map;

  const origin = getPublicWebOrigin();
  const visitCounts = new Map<string, { total: number; qr: number }>();

  const { data: counts, error: countErr } = await client
    .from('v_place_visit_counts')
    .select('place_id, total_visits, qr_visits')
    .in('place_id', placeIds);

  if (!countErr && counts) {
    for (const row of counts) {
      visitCounts.set(String(row.place_id), {
        total: Number(row.total_visits) || 0,
        qr: Number(row.qr_visits) || 0,
      });
    }
  } else {
    const { data: visits, error: visitErr } = await client
      .from('place_visits')
      .select('place_id, source')
      .in('place_id', placeIds);
    if (visitErr) {
      console.warn('[placeVisits]', visitErr.message);
    } else {
      for (const row of visits ?? []) {
        const id = String(row.place_id);
        const prev = visitCounts.get(id) ?? { total: 0, qr: 0 };
        prev.total += 1;
        if (row.source === 'qr' || row.source === 'code') prev.qr += 1;
        visitCounts.set(id, prev);
      }
    }
  }

  const { data: codes, error: codeErr } = await client
    .from('place_checkin_codes')
    .select('place_id, code, is_active')
    .in('place_id', placeIds);
  if (codeErr) throw new Error(codeErr.message);

  for (const row of codes ?? []) {
    const placeId = String(row.place_id);
    const code = String(row.code || '');
    const checkinUrl = buildCheckinUrl(origin, code);
    const c = visitCounts.get(placeId) ?? { total: 0, qr: 0 };
    map.set(placeId, {
      placeId,
      code,
      isActive: row.is_active !== false,
      checkinUrl,
      qrUrl: qrImageUrl(checkinUrl, 200),
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
    .limit(limit);

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
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
    return attachPlaceNames(client, ranked);
  }

  if (!counts?.length) return [];
  const ranked = counts.map((r) => [String(r.place_id), Number(r.total_visits) || 0] as [string, number]);
  return attachPlaceNames(client, ranked);
}

async function attachPlaceNames(
  client: SupabaseClient,
  ranked: [string, number][]
): Promise<{ name: string; visits: number; city: string; placeId: string }[]> {
  const ids = ranked.map(([id]) => id);
  const { data: places, error: placeErr } = await client
    .from('v_tourist_attractions_catalog')
    .select('establishment_public_id, ta_name, city_mun')
    .in('establishment_public_id', ids);
  if (placeErr) throw new Error(placeErr.message);

  const byId = new Map(
    (places ?? []).map((p) => [
      String(p.establishment_public_id),
      {
        name: String(p.ta_name || 'Place'),
        city: String(p.city_mun || '—'),
      },
    ])
  );

  return ranked.map(([placeId, visitsCount]) => ({
    placeId,
    visits: visitsCount,
    name: byId.get(placeId)?.name ?? placeId.slice(0, 8),
    city: byId.get(placeId)?.city ?? '—',
  }));
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
