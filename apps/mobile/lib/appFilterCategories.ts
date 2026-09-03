import { ntdpToFilterOption } from 'cavitour-shared/ntdpFilterMeta';
import { supabase } from './supabase';
import { WEB_CATEGORY_OPTIONS } from './dashboardFilterOptions';

export type AppFilterCategoryOption = {
  key: string;
  label: string;
  shortLabel: string;
  icon: string;
  matchKeywords: string[];
  ntdpName?: string;
};

function mapNtdpRows(rows: Record<string, unknown>[] | null): AppFilterCategoryOption[] {
  const seen = new Set<string>();
  const out: AppFilterCategoryOption[] = [];
  for (const r of rows ?? []) {
    const opt = ntdpToFilterOption(r.ntdp_category_name, r.ntdp_category_id) as AppFilterCategoryOption | null;
    if (!opt) continue;
    const fold = opt.key.toLowerCase();
    if (seen.has(fold)) continue;
    seen.add(fold);
    out.push(opt);
  }
  return out;
}

export function staticCategoryOptions(): AppFilterCategoryOption[] {
  return WEB_CATEGORY_OPTIONS.map((o) => ({
    key: o.label,
    label: o.label,
    shortLabel: o.shortLabel,
    icon: o.icon,
    matchKeywords: [],
    ntdpName: o.label,
  }));
}

export async function fetchAppFilterCategoryOptions(): Promise<AppFilterCategoryOption[]> {
  try {
    const { data, error } = await supabase
      .from('ntdp_categories')
      .select('ntdp_category_id, ntdp_category_name')
      .order('ntdp_category_name', { ascending: true });
    if (error) throw error;
    const mapped = mapNtdpRows((data ?? []) as Record<string, unknown>[]);
    if (!mapped.length) return staticCategoryOptions();
    return mapped;
  } catch (e) {
    console.warn('[appFilterCategories] falling back to static NTDP options', e);
    return staticCategoryOptions();
  }
}

/** @deprecated Keywords are unused; NTDP matching uses category names. */
export function keywordMapFromOptions(
  options: AppFilterCategoryOption[],
  staticKeywords: Record<string, string[]> = {}
): Record<string, string[]> {
  const m: Record<string, string[]> = { ...staticKeywords };
  for (const o of options ?? []) {
    if (o.matchKeywords?.length) m[o.key] = o.matchKeywords;
  }
  return m;
}

export function labelMapFromOptions(options: AppFilterCategoryOption[]): Record<string, string> {
  const m: Record<string, string> = {};
  for (const o of options ?? []) {
    if (o.key) m[o.key] = o.ntdpName || o.label || o.shortLabel || o.key;
  }
  return m;
}
