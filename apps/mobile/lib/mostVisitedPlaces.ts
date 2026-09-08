import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Traveler-safe "Most visited" ranking.
 *
 * Same math as the admin Export reports page
 * (`apps/admin/src/lib/adminAnalyticsExport.ts` → `fetchVisitReport`):
 * pull recent `place_visits` rows and tally per place client-side.
 * Returns ordered place ids (most visits first), or [] when the table is
 * unreachable (RLS / offline) so callers degrade to catalog order.
 */

const VISIT_ROW_LIMIT = 20000;

function defaultFrom(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

export async function fetchMostVisitedPlaceIds(
  client: SupabaseClient,
  options: { from?: string | null; to?: string | null; limit?: number } = {}
): Promise<string[]> {
  const { from = defaultFrom(), to = null, limit = 10 } = options;
  try {
    let query = client.from('place_visits').select('place_id, created_at').limit(VISIT_ROW_LIMIT);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    const { data, error } = await query;
    if (error || !data) return [];
    const tally = new Map<string, number>();
    for (const row of data as Array<{ place_id?: unknown }>) {
      const id = String(row?.place_id ?? '');
      if (!id) continue;
      tally.set(id, (tally.get(id) ?? 0) + 1);
    }
    return [...tally.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.max(1, limit))
      .map(([id]) => id);
  } catch {
    return [];
  }
}

/** Ranked pictured places first (in rank order), everything else after. */
export function orderByVisitRank<T>(
  places: T[],
  idOf: (place: T) => string,
  rankedIds: string[]
): T[] {
  if (!rankedIds.length) return places;
  const rank = new Map(rankedIds.map((id, i) => [id, i]));
  const ranked = places
    .filter((p) => rank.has(idOf(p)))
    .sort((a, b) => (rank.get(idOf(a)) ?? 0) - (rank.get(idOf(b)) ?? 0));
  const rest = places.filter((p) => !rank.has(idOf(p)));
  return [...ranked, ...rest];
}
