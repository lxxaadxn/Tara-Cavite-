import type { SupabaseClient } from '@supabase/supabase-js';
import { inferLguKind, parseLguKind } from 'cavitour-shared/lguKind';

export type LguKind = 'city' | 'municipality';

export type CityAdminRow = {
  id: string;
  name: string;
  kind: LguKind;
};

export { inferLguKind };

function friendlyWriteError(err: { message?: string; code?: string }, action: string): Error {
  const msg = err.message ?? `Failed to ${action}`;
  if (err.code === '23503' || /foreign key/i.test(msg)) {
    return new Error(
      `Cannot ${action}: this record is still referenced by other rows. Update those places first.`
    );
  }
  if (err.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new Error(
      `Cannot ${action}: run migration 20260812140000_cities_admin_write.sql for write policies.`
    );
  }
  if (err.code === '23505' || /duplicate/i.test(msg)) {
    return new Error('That city / municipality name already exists.');
  }
  return new Error(msg);
}

function isMissingKindColumn(err: { message?: string; code?: string }): boolean {
  return err.code === '42703' || /lgu_kind/i.test(err.message ?? '');
}

function mapRow(r: { city_id?: unknown; city_name?: unknown; lgu_kind?: unknown }): CityAdminRow | null {
  const name = String(r.city_name ?? '').trim();
  const id = String(r.city_id ?? '');
  if (!name || !Number.isFinite(Number(id))) return null;
  return { id, name, kind: parseLguKind(r.lgu_kind, name) as LguKind };
}

export async function fetchCitiesAdmin(
  client: SupabaseClient,
  opts?: { kind?: LguKind }
): Promise<CityAdminRow[]> {
  const withKind = await client
    .from('cities')
    .select('city_id, city_name, lgu_kind')
    .order('city_name', { ascending: true });

  let rows: CityAdminRow[];
  if (withKind.error && isMissingKindColumn(withKind.error)) {
    const { data, error } = await client
      .from('cities')
      .select('city_id, city_name')
      .order('city_name', { ascending: true });
    if (error) throw new Error(error.message);
    rows = (data ?? []).map(mapRow).filter((r): r is CityAdminRow => r != null);
  } else if (withKind.error) {
    throw new Error(withKind.error.message);
  } else {
    rows = (withKind.data ?? []).map(mapRow).filter((r): r is CityAdminRow => r != null);
  }

  if (opts?.kind) return rows.filter((r) => r.kind === opts.kind);
  return rows;
}

export async function createCity(
  client: SupabaseClient,
  form: { name: string; kind?: LguKind }
): Promise<void> {
  const name = form.name.trim();
  if (!name) throw new Error('Name is required');
  const kind: LguKind =
    form.kind === 'city' || form.kind === 'municipality' ? form.kind : inferLguKind(name);

  const withKind = await client.from('cities').insert({ city_name: name, lgu_kind: kind });
  if (!withKind.error) return;
  if (isMissingKindColumn(withKind.error)) {
    const { error } = await client.from('cities').insert({ city_name: name });
    if (error) throw friendlyWriteError(error, 'create');
    return;
  }
  throw friendlyWriteError(withKind.error, 'create');
}

export async function updateCity(
  client: SupabaseClient,
  id: string,
  form: { name: string; kind?: LguKind }
): Promise<void> {
  const name = form.name.trim();
  if (!name) throw new Error('Name is required');
  const cityId = Number(id);
  if (!Number.isFinite(cityId)) throw new Error(`Invalid city id: ${id}`);
  const kind: LguKind =
    form.kind === 'city' || form.kind === 'municipality' ? form.kind : inferLguKind(name);

  const withKind = await client
    .from('cities')
    .update({ city_name: name, lgu_kind: kind })
    .eq('city_id', cityId);
  if (!withKind.error) return;
  if (isMissingKindColumn(withKind.error)) {
    const { error } = await client.from('cities').update({ city_name: name }).eq('city_id', cityId);
    if (error) throw friendlyWriteError(error, 'update');
    return;
  }
  throw friendlyWriteError(withKind.error, 'update');
}

export async function deleteCity(client: SupabaseClient, id: string): Promise<void> {
  const cityId = Number(id);
  if (!Number.isFinite(cityId)) throw new Error(`Invalid city id: ${id}`);
  const { error } = await client.from('cities').delete().eq('city_id', cityId);
  if (error) throw friendlyWriteError(error, 'delete');
}
