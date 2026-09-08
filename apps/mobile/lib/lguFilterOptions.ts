import { parseLguKind } from 'cavitour-shared/lguKind';
import { supabase } from './supabase';
import { WEB_CITY_OPTIONS, WEB_MUNICIPALITY_OPTIONS } from './dashboardFilterOptions';

export type LguFilterOption = { key: string; label: string };

function toOption(name: unknown): LguFilterOption | null {
  const label = String(name ?? '').trim();
  if (!label) return null;
  return { key: label, label };
}

function staticLguOptions(): { cities: LguFilterOption[]; municipalities: LguFilterOption[] } {
  return {
    cities: WEB_CITY_OPTIONS.map((o) => ({ key: o.label, label: o.label })),
    municipalities: WEB_MUNICIPALITY_OPTIONS.map((o) => ({ key: o.label, label: o.label })),
  };
}

export async function fetchLguFilterOptions(): Promise<{
  cities: LguFilterOption[];
  municipalities: LguFilterOption[];
}> {
  try {
    const withKind = await supabase
      .from('cities')
      .select('city_id, city_name, lgu_kind')
      .order('city_name', { ascending: true });

    let rows = withKind.data as { city_name?: unknown; lgu_kind?: unknown }[] | null;
    if (withKind.error && (withKind.error.code === '42703' || /lgu_kind/i.test(withKind.error.message))) {
      const fallback = await supabase
        .from('cities')
        .select('city_id, city_name')
        .order('city_name', { ascending: true });
      if (fallback.error) throw fallback.error;
      rows = fallback.data as { city_name?: unknown; lgu_kind?: unknown }[] | null;
    } else if (withKind.error) {
      throw withKind.error;
    }

    const cities: LguFilterOption[] = [];
    const municipalities: LguFilterOption[] = [];
    const seen = new Set<string>();
    for (const r of rows ?? []) {
      const opt = toOption(r.city_name);
      if (!opt) continue;
      const fold = opt.key.toLowerCase();
      if (seen.has(fold)) continue;
      seen.add(fold);
      if (parseLguKind(r.lgu_kind, opt.label) === 'city') cities.push(opt);
      else municipalities.push(opt);
    }
    if (!cities.length && !municipalities.length) return staticLguOptions();
    return { cities, municipalities };
  } catch (e) {
    console.warn('[lguFilterOptions] falling back to static LGU options', e);
    return staticLguOptions();
  }
}

export function locationLabelMapFromOptions(
  cities: LguFilterOption[],
  municipalities: LguFilterOption[]
): Record<string, string> {
  const m: Record<string, string> = {};
  for (const o of [...cities, ...municipalities]) {
    if (o.key) m[o.key] = o.label;
  }
  return m;
}

/**
 * Combined Cavite cities + municipalities for profile location pickers.
 */
export async function fetchLocationOptions(): Promise<LguFilterOption[]> {
  const { cities, municipalities } = await fetchLguFilterOptions();
  const seen = new Set<string>();
  const out: LguFilterOption[] = [];
  for (const o of [...cities, ...municipalities]) {
    const fold = o.label.toLowerCase();
    if (seen.has(fold)) continue;
    seen.add(fold);
    out.push(o);
  }
  out.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
  return out;
}
