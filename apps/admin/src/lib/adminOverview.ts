import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchPlaceNamesById } from './adminUsers';
import { CONTENT_PIPELINE } from 'cavitour-shared';

export type OverviewRange = 'today' | 'week' | 'month' | 'year';

export type OverviewKpi = {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: 'up' | 'down';
  tint: 'slate' | 'blue' | 'green' | 'sky';
};

export type OverviewSnapshot = {
  kpis: OverviewKpi[];
  usersTrend: { month: string; thisYear: number; lastYear: number }[];
  peakMonths: { label: string; visitors: number }[];
  engagement: { period: string; visits: number; reviews: number }[];
  trafficByCity: { name: string; value: number }[];
  topRated: { name: string; rating: number }[];
  trafficBySource: { name: string; value: number; color: string }[];
  monthlyVisited: { month: string; visits: number }[];
  updatedAt: string;
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SOURCE_COLORS: Record<string, string> = {
  qr: '#111827',
  code: '#3b82f6',
  destination_reached: '#1B8A70',
  manual: '#a78bfa',
};

const SOURCE_LABELS: Record<string, string> = {
  qr: 'QR check-in',
  code: 'Code',
  destination_reached: 'Arrived',
  manual: 'Manual',
};

function pctDelta(curr: number, prev: number): number {
  if (prev <= 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 10000) / 100;
}

function rangeWindow(range: OverviewRange): { from: Date; to: Date; prevFrom: Date; prevTo: Date } {
  const to = new Date();
  let from: Date;
  if (range === 'today') from = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  else if (range === 'week') from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  else if (range === 'month') from = new Date(to.getFullYear(), to.getMonth(), 1);
  else from = new Date(to.getFullYear(), 0, 1);
  const span = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
  const prevTo = from;
  const prevFrom = new Date(from.getTime() - span);
  return { from, to, prevFrom, prevTo };
}

function inRange(iso: string, from: Date, to: Date): boolean {
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

async function loadCityByPlace(client: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    const { data } = await client
      .from(CONTENT_PIPELINE.establishmentsView)
      .select('establishment_public_id, city_mun')
      .in('establishment_public_id', chunk);
    for (const row of data ?? []) {
      const id = String(row.establishment_public_id ?? '');
      if (id) map.set(id, String(row.city_mun ?? '').trim() || 'Unknown');
    }
  }
  return map;
}

export async function fetchAnalyticsOverview(
  client: SupabaseClient,
  range: OverviewRange
): Promise<OverviewSnapshot> {
  const { from, to, prevFrom, prevTo } = rangeWindow(range);
  const twoYearsAgo = new Date(to.getFullYear() - 1, 0, 1).toISOString();

  const [visitsRes, reviewsRes, profilesRes] = await Promise.all([
    client.from('place_visits').select('place_id, user_id, source, created_at').gte('created_at', twoYearsAgo).limit(20000),
    client.from('place_reviews').select('place_id, rating, is_published, created_at').limit(8000),
    client.from('user_profiles').select('id, created_at').gte('created_at', twoYearsAgo).limit(20000),
  ]);

  const visits = visitsRes.error ? [] : visitsRes.data ?? [];
  const reviews = (reviewsRes.error ? [] : reviewsRes.data ?? []).filter((r) => r.is_published !== false);
  const profiles = profilesRes.error ? [] : profilesRes.data ?? [];

  const visitsNow = visits.filter((v) => inRange(String(v.created_at), from, to));
  const visitsPrev = visits.filter((v) => inRange(String(v.created_at), prevFrom, prevTo));
  const newUsersNow = profiles.filter((p) => inRange(String(p.created_at), from, to)).length;
  const newUsersPrev = profiles.filter((p) => inRange(String(p.created_at), prevFrom, prevTo)).length;

  const viewsNow = visitsNow.filter((v) => v.source === 'destination_reached').length;
  const viewsPrev = visitsPrev.filter((v) => v.source === 'destination_reached').length;
  const checkinsNow = visitsNow.filter((v) => v.source === 'qr' || v.source === 'code').length;
  const checkinsPrev = visitsPrev.filter((v) => v.source === 'qr' || v.source === 'code').length;
  const activeNow = new Set(visitsNow.map((v) => String(v.user_id))).size;
  const activePrev = new Set(visitsPrev.map((v) => String(v.user_id))).size;

  const kpi = (
    key: string,
    label: string,
    value: number,
    prev: number,
    tint: OverviewKpi['tint']
  ): OverviewKpi => {
    const delta = pctDelta(value, prev);
    return { key, label, value, delta, trend: delta >= 0 ? 'up' : 'down', tint };
  };

  const thisYear = to.getFullYear();
  const lastYear = thisYear - 1;
  const usersTrend = MONTHS.map((month, i) => ({
    month,
    thisYear: profiles.filter((p) => {
      const d = new Date(String(p.created_at));
      return d.getFullYear() === thisYear && d.getMonth() === i;
    }).length,
    lastYear: profiles.filter((p) => {
      const d = new Date(String(p.created_at));
      return d.getFullYear() === lastYear && d.getMonth() === i;
    }).length,
  }));

  const peakMonths = MONTHS.map((label, i) => ({
    label,
    visitors: visits.filter((v) => {
      const d = new Date(String(v.created_at));
      return d.getFullYear() === thisYear && d.getMonth() === i;
    }).length,
  }));

  const engagement = MONTHS.map((period, i) => ({
    period,
    visits: visits.filter((v) => {
      const d = new Date(String(v.created_at));
      return d.getFullYear() === thisYear && d.getMonth() === i;
    }).length,
    reviews: reviews.filter((r) => {
      const d = new Date(String(r.created_at));
      return d.getFullYear() === thisYear && d.getMonth() === i;
    }).length,
  }));

  const monthlyVisited = MONTHS.map((month, i) => ({
    month,
    visits: visits.filter((v) => {
      const d = new Date(String(v.created_at));
      return d.getFullYear() === thisYear && d.getMonth() === i;
    }).length,
  }));

  const cityCounts = new Map<string, number>();
  const cities = await loadCityByPlace(
    client,
    visitsNow.map((v) => String(v.place_id ?? ''))
  );
  for (const v of visitsNow) {
    const city = cities.get(String(v.place_id ?? '')) || 'Unknown';
    cityCounts.set(city, (cityCounts.get(city) ?? 0) + 1);
  }
  const cityMax = Math.max(1, ...cityCounts.values());
  const trafficByCity = [...cityCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, value: count / cityMax }));

  const ratingSum = new Map<string, { sum: number; n: number }>();
  for (const r of reviews) {
    const id = String(r.place_id ?? '');
    if (!id) continue;
    const prev = ratingSum.get(id) ?? { sum: 0, n: 0 };
    prev.sum += Number(r.rating) || 0;
    prev.n += 1;
    ratingSum.set(id, prev);
  }
  const topRatedIds = [...ratingSum.entries()]
    .filter(([, v]) => v.n > 0)
    .sort((a, b) => b[1].sum / b[1].n - a[1].sum / a[1].n || b[1].n - a[1].n)
    .slice(0, 6);
  const names = await fetchPlaceNamesById(
    client,
    topRatedIds.map(([id]) => id)
  );
  const topRated = topRatedIds.map(([id, v]) => ({
    name: names.get(id) || id.slice(0, 8),
    rating: Math.round((v.sum / v.n) * 10) / 10,
  }));

  const sourceCounts = new Map<string, number>();
  for (const v of visitsNow) {
    const src = String(v.source || 'manual');
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  const sourceTotal = Math.max(1, [...sourceCounts.values()].reduce((n, c) => n + c, 0));
  const trafficBySource = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([src, count]) => ({
      name: SOURCE_LABELS[src] || src,
      value: Math.round((count / sourceTotal) * 1000) / 10,
      color: SOURCE_COLORS[src] || '#94a3b8',
    }));

  return {
    kpis: [
      kpi('views', 'Arrivals', viewsNow, viewsPrev, 'slate'),
      kpi('visits', 'Check-ins', checkinsNow || visitsNow.length, checkinsPrev || visitsPrev.length, 'blue'),
      kpi('newUsers', 'New users', newUsersNow, newUsersPrev, 'green'),
      kpi('activeUsers', 'Active travelers', activeNow, activePrev, 'sky'),
    ],
    usersTrend,
    peakMonths,
    engagement,
    trafficByCity,
    topRated,
    trafficBySource,
    monthlyVisited,
    updatedAt: new Date().toISOString(),
  };
}

export function subscribeAnalyticsOverview(client: SupabaseClient, onChange: () => void): () => void {
  if (!client?.channel || typeof onChange !== 'function') return () => {};
  let timer: ReturnType<typeof setTimeout> | null = null;
  const bump = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, 400);
  };
  const channel = client
    .channel(`analytics-overview-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'place_visits' }, bump)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'place_reviews' }, bump)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, bump)
    .subscribe();
  const poll = window.setInterval(onChange, 20000);
  return () => {
    if (timer) clearTimeout(timer);
    window.clearInterval(poll);
    try {
      client.removeChannel(channel);
    } catch {
      /* ignore */
    }
  };
}
