import type { SupabaseClient } from '@supabase/supabase-js';

export type StaLookupOption = { value: string; label: string };

export type StaLookups = {
  typeCodes: StaLookupOption[];
  taCategories: StaLookupOption[];
  ntdpCategories: StaLookupOption[];
  cities: StaLookupOption[];
};

export function foldLabel(s: string): string {
  return s.trim().toLowerCase();
}

function toOptions(
  rows: { label: string | null | undefined }[],
  getLabel: (row: { label: string | null | undefined }) => string
): StaLookupOption[] {
  const seen = new Set<string>();
  const out: StaLookupOption[] = [];
  for (const row of rows) {
    const label = getLabel(row).trim();
    if (!label) continue;
    const key = foldLabel(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ value: label, label });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return out;
}

/** Load type / TA / NTDP / city lookup labels for admin STA selects. */
export async function fetchStaLookups(client: SupabaseClient): Promise<StaLookups> {
  const [{ data: types, error: typesErr }, { data: cats, error: catsErr }, { data: ntdps, error: ntdpsErr }, { data: cities, error: citiesErr }] =
    await Promise.all([
      client.from('type_codes').select('type_code_id, type_code').order('type_code', { ascending: true }),
      client
        .from('ta_categories')
        .select('category_id, category_name')
        .order('category_name', { ascending: true }),
      client
        .from('ntdp_categories')
        .select('ntdp_category_id, ntdp_category_name')
        .order('ntdp_category_name', { ascending: true }),
      client.from('cities').select('city_id, city_name').order('city_name', { ascending: true }),
    ]);

  if (typesErr) throw new Error(typesErr.message);
  if (catsErr) throw new Error(catsErr.message);
  if (ntdpsErr) throw new Error(ntdpsErr.message);
  if (citiesErr) throw new Error(citiesErr.message);

  return {
    typeCodes: toOptions(
      (types ?? []).map((r) => ({ label: r.type_code })),
      (r) => String(r.label ?? '')
    ),
    taCategories: toOptions(
      (cats ?? []).map((r) => ({ label: r.category_name })),
      (r) => String(r.label ?? '')
    ),
    ntdpCategories: toOptions(
      (ntdps ?? []).map((r) => ({ label: r.ntdp_category_name })),
      (r) => String(r.label ?? '')
    ),
    cities: toOptions(
      (cities ?? []).map((r) => ({ label: r.city_name })),
      (r) => String(r.label ?? '')
    ),
  };
}

/** Lookup options with leading empty choice (table-only; no orphan merge). */
export function tableSelectOptions(lookupOptions: StaLookupOption[]): StaLookupOption[] {
  return [{ value: '', label: '—' }, ...lookupOptions];
}

/** Merge lookup options with orphan labels from existing STA rows. */
export function mergeSelectOptions(
  lookupOptions: StaLookupOption[],
  extras: (string | null | undefined)[]
): StaLookupOption[] {
  const seen = new Set(lookupOptions.map((o) => foldLabel(o.value)));
  const out = [...lookupOptions];
  for (const raw of extras) {
    const label = String(raw ?? '').trim();
    if (!label) continue;
    const key = foldLabel(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ value: label, label });
  }
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return [{ value: '', label: '—' }, ...out];
}
