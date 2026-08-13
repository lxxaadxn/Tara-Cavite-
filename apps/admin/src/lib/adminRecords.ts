import type { SupabaseClient } from '@supabase/supabase-js';

type CuratedItinerary = {
  id: string;
  title: string;
  route: string;
  stops: number;
  durationLabel: string;
  featured?: boolean;
};

const CURATED_CATALOG: CuratedItinerary[] = [
  {
    id: 'highlands',
    title: 'Highlands Getaway',
    route: 'Silang — Tagaytay',
    stops: 5,
    durationLabel: '1 day',
    featured: true,
  },
  {
    id: 'heritage',
    title: 'Heritage & Horizons Trail',
    route: 'Imus — Kawit — Noveleta',
    stops: 4,
    durationLabel: 'Full day',
    featured: true,
  },
  {
    id: 'coastal',
    title: 'Coastal Calm Journey',
    route: 'Tanza — Naic — Maragondon',
    stops: 4,
    durationLabel: '1 day',
  },
  {
    id: 'bloomfields',
    title: 'Bloomfields & Breezes Route',
    route: 'Silang — General Trias — Dasmariñas',
    stops: 4,
    durationLabel: 'Half day',
  },
  {
    id: 'hidden-gems',
    title: 'Highlands & Hidden Gems',
    route: 'Alfonso — Magallanes — Maragondon',
    stops: 4,
    durationLabel: 'Full day',
    featured: true,
  },
];

const CURATED_BY_ID = Object.fromEntries(CURATED_CATALOG.map((c) => [c.id, c])) as Record<
  string,
  CuratedItinerary
>;

function isMissingTableError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  );
}

export type SavedListRow = {
  id: string;
  name: string;
  owner: string;
  items: number;
  visibility: 'private' | 'shared';
  status: 'active';
  updated: string;
};

export type ItineraryRow = {
  id: string;
  title: string;
  route: string;
  owner: string;
  stops: number;
  dates: string;
  status: 'published' | 'draft';
  featured: boolean;
  updated: string;
};

export type MapLayerRow = {
  id: string;
  layer: string;
  description: string;
  enabled: boolean;
  source: string;
};

function formatRelative(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Yesterday';
    if (diff < 7) return `${Math.floor(diff)} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

async function countItemsByList(
  client: SupabaseClient,
  listIds: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of listIds) counts[id] = 0;
  if (listIds.length === 0) return counts;

  const tables = ['saved_list_items', 'saved_list_itinerary_items'] as const;
  for (const table of tables) {
    const { data, error } = await client.from(table).select('list_id').in('list_id', listIds);
    if (error) continue;
    for (const row of data ?? []) {
      const lid = (row as { list_id: string }).list_id;
      counts[lid] = (counts[lid] ?? 0) + 1;
    }
  }
  return counts;
}

export async function fetchAdminSavedLists(client: SupabaseClient): Promise<SavedListRow[]> {
  const { data, error } = await client
    .from('saved_lists')
    .select('id, name, type, place_count, updated_at, user_id')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const userIds = [...new Set(rows.map((r) => r.user_id as string))];

  const profiles = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: prof } = await client.from('user_profiles').select('id, username').in('id', userIds);
    for (const p of prof ?? []) {
      profiles.set(p.id as string, (p.username as string) || 'User');
    }
  }

  const counts = await countItemsByList(
    client,
    rows.map((r) => r.id as string)
  );

  return rows.map((r) => {
    const uid = r.user_id as string;
    const owner = profiles.get(uid) ?? `${uid.slice(0, 8)}…`;
    const items = counts[r.id as string] ?? (r.place_count as number) ?? 0;
    return {
      id: r.id as string,
      name: (r.name as string) || 'Untitled list',
      owner,
      items,
      visibility: (r.type as 'private' | 'shared') || 'private',
      status: 'active' as const,
      updated: formatRelative(r.updated_at as string),
    };
  });
}

export type AdminItinerariesResult = {
  rows: ItineraryRow[];
  savesTableReady: boolean;
};

export async function fetchAdminItineraries(client: SupabaseClient): Promise<AdminItinerariesResult> {
  const saveCount = new Map<string, number>();
  const latestSave = new Map<string, string>();
  let savesTableReady = true;

  const { data: saveRows, error } = await client
    .from('saved_list_itinerary_items')
    .select('itinerary_ref, created_at');

  if (error) {
    if (isMissingTableError(error)) {
      savesTableReady = false;
    } else {
      throw new Error(error.message);
    }
  } else {
    for (const row of saveRows ?? []) {
      const ref = row.itinerary_ref as string;
      saveCount.set(ref, (saveCount.get(ref) ?? 0) + 1);
      const created = row.created_at as string;
      if (!latestSave.get(ref) || created > latestSave.get(ref)!) {
        latestSave.set(ref, created);
      }
    }
  }

  const ids = new Set([...CURATED_CATALOG.map((c) => c.id), ...saveCount.keys()]);

  const rows = [...ids].map((id) => {
    const meta = CURATED_BY_ID[id];
    const saves = saveCount.get(id) ?? 0;
    return {
      id,
      title: meta?.title ?? `Saved ref: ${id}`,
      route: meta?.route ?? '—',
      owner: saves > 0 ? `${saves} in user lists` : 'App catalog',
      stops: meta?.stops ?? 0,
      dates: meta?.durationLabel ?? '—',
      status: meta ? ('published' as const) : ('draft' as const),
      featured: Boolean(meta?.featured),
      updated: formatRelative(latestSave.get(id) ?? null),
    };
  });

  rows.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'published' ? -1 : 1;
    return a.title.localeCompare(b.title);
  });

  return { rows, savesTableReady };
}

export async function fetchAdminMapLayers(client: SupabaseClient): Promise<{
  layers: MapLayerRow[];
  establishmentCount: number;
}> {
  const placesRes = await client
    .from('sta_v3_cavite_2025')
    .select('id', { count: 'exact', head: true });

  const establishmentCount = placesRes.count ?? 0;

  const layers: MapLayerRow[] = [
    {
      id: 'establishments',
      layer: 'Establishments',
      description: `${establishmentCount.toLocaleString()} places in Supabase (STA catalog)`,
      enabled: establishmentCount > 0,
      source: 'sta_v3_cavite_2025 · v_sta_v3_cavite_2025_catalog',
    },
    {
      id: 'routes',
      layer: 'Driving corridors',
      description: 'OSRM route lines from user GPS to destinations',
      enabled: establishmentCount > 0,
      source: 'OSRM',
    },
    {
      id: 'ntdp',
      layer: 'NTDP labels',
      description: 'Named departure points on commute map',
      enabled: false,
      source: 'places.ntdp_category',
    },
  ];

  return { layers, establishmentCount };
}
