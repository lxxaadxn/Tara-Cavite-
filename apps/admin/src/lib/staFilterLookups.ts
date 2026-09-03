import type { SupabaseClient } from '@supabase/supabase-js';

export type FilterLookupKind = 'ntdp' | 'ta' | 'type';

export type FilterLookupRow = {
  /** Composite id e.g. `ntdp:12` for ContentCrudPage. */
  id: string;
  label: string;
  kind: FilterLookupKind;
  tableId: number;
};

export type FilterLookupForm = Omit<FilterLookupRow, 'id' | 'tableId'>;

const KIND_META: Record<
  FilterLookupKind,
  { table: string; idCol: string; labelCol: string; label: string }
> = {
  ntdp: {
    table: 'ntdp_categories',
    idCol: 'ntdp_category_id',
    labelCol: 'ntdp_category_name',
    label: 'NTDP category',
  },
  ta: {
    table: 'ta_categories',
    idCol: 'category_id',
    labelCol: 'category_name',
    label: 'TA category',
  },
  type: {
    table: 'type_codes',
    idCol: 'type_code_id',
    labelCol: 'type_code',
    label: 'Type code',
  },
};

export function filterKindLabel(kind: FilterLookupKind): string {
  return KIND_META[kind].label;
}

export function parseFilterLookupId(id: string): { kind: FilterLookupKind; tableId: number } {
  const [kindRaw, idRaw] = id.split(':');
  if (kindRaw !== 'ntdp' && kindRaw !== 'ta' && kindRaw !== 'type') {
    throw new Error(`Invalid filter id: ${id}`);
  }
  const tableId = Number(idRaw);
  if (!Number.isFinite(tableId)) throw new Error(`Invalid filter id: ${id}`);
  return { kind: kindRaw, tableId };
}

function compositeId(kind: FilterLookupKind, tableId: number): string {
  return `${kind}:${tableId}`;
}

function friendlyWriteError(err: { message?: string; code?: string }, action: string): Error {
  const msg = err.message ?? `Failed to ${action}`;
  if (err.code === '23503' || /foreign key/i.test(msg)) {
    return new Error(
      `Cannot ${action}: this value is still referenced by other records. Update those places first.`
    );
  }
  if (err.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new Error(
      `Cannot ${action}: database permissions block writes to lookup tables. Add an authenticated write policy for admin.`
    );
  }
  if (err.code === '23505' || /duplicate/i.test(msg)) {
    return new Error(`That label already exists.`);
  }
  return new Error(msg);
}

/** NTDP categories shown as visitor Filter modal chips. */
export async function fetchNtdpLookupRows(client: SupabaseClient): Promise<FilterLookupRow[]> {
  const { data, error } = await client
    .from('ntdp_categories')
    .select('ntdp_category_id, ntdp_category_name')
    .order('ntdp_category_name', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((r) => ({
      id: compositeId('ntdp', Number(r.ntdp_category_id)),
      label: String(r.ntdp_category_name ?? '').trim(),
      kind: 'ntdp' as const,
      tableId: Number(r.ntdp_category_id),
    }))
    .filter((r) => r.label && Number.isFinite(r.tableId));
}

/** Load NTDP / TA category / type code lookups as one list. */
export async function fetchFilterLookupRows(client: SupabaseClient): Promise<FilterLookupRow[]> {
  const [{ data: ntdps, error: ntdpsErr }, { data: cats, error: catsErr }, { data: types, error: typesErr }] =
    await Promise.all([
      client
        .from('ntdp_categories')
        .select('ntdp_category_id, ntdp_category_name')
        .order('ntdp_category_name', { ascending: true }),
      client
        .from('ta_categories')
        .select('category_id, category_name')
        .order('category_name', { ascending: true }),
      client.from('type_codes').select('type_code_id, type_code').order('type_code', { ascending: true }),
    ]);

  if (ntdpsErr) throw new Error(ntdpsErr.message);
  if (catsErr) throw new Error(catsErr.message);
  if (typesErr) throw new Error(typesErr.message);

  const rows: FilterLookupRow[] = [
    ...(ntdps ?? []).map((r) => ({
      id: compositeId('ntdp', Number(r.ntdp_category_id)),
      label: String(r.ntdp_category_name ?? '').trim(),
      kind: 'ntdp' as const,
      tableId: Number(r.ntdp_category_id),
    })),
    ...(cats ?? []).map((r) => ({
      id: compositeId('ta', Number(r.category_id)),
      label: String(r.category_name ?? '').trim(),
      kind: 'ta' as const,
      tableId: Number(r.category_id),
    })),
    ...(types ?? []).map((r) => ({
      id: compositeId('type', Number(r.type_code_id)),
      label: String(r.type_code ?? '').trim(),
      kind: 'type' as const,
      tableId: Number(r.type_code_id),
    })),
  ].filter((r) => r.label && Number.isFinite(r.tableId));

  rows.sort((a, b) => {
    const kindOrder = a.kind.localeCompare(b.kind);
    if (kindOrder !== 0) return kindOrder;
    return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
  });

  return rows;
}

export async function createFilterLookup(
  client: SupabaseClient,
  form: FilterLookupForm
): Promise<void> {
  const label = form.label.trim();
  if (!label) throw new Error('Label is required');
  const meta = KIND_META[form.kind];
  const { error } = await client.from(meta.table).insert({ [meta.labelCol]: label });
  if (error) throw friendlyWriteError(error, 'create');
}

export async function updateFilterLookup(
  client: SupabaseClient,
  id: string,
  form: FilterLookupForm
): Promise<void> {
  const label = form.label.trim();
  if (!label) throw new Error('Label is required');
  const { kind, tableId } = parseFilterLookupId(id);
  if (form.kind !== kind) {
    throw new Error('Kind cannot be changed after create. Delete and re-add under the other kind.');
  }
  const meta = KIND_META[kind];
  const { error } = await client
    .from(meta.table)
    .update({ [meta.labelCol]: label })
    .eq(meta.idCol, tableId);
  if (error) throw friendlyWriteError(error, 'update');
}

export async function deleteFilterLookup(client: SupabaseClient, id: string): Promise<void> {
  const { kind, tableId } = parseFilterLookupId(id);
  const meta = KIND_META[kind];
  const { error } = await client.from(meta.table).delete().eq(meta.idCol, tableId);
  if (error) throw friendlyWriteError(error, 'delete');
}
