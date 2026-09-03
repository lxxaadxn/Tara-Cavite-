import { ntdpToFilterOption } from 'cavitour-shared/ntdpFilterMeta';
import { supabase } from './supabase';
import { WEB_CATEGORY_OPTIONS } from './dashboardFilterOptions';

/** @typedef {{ key: string, label: string, shortLabel: string, icon: string, matchKeywords: string[], ntdpName?: string }} AppFilterCategoryOption */

/**
 * @param {any[]} rows
 * @returns {AppFilterCategoryOption[]}
 */
function mapNtdpRows(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows ?? []) {
    const opt = ntdpToFilterOption(r.ntdp_category_name, r.ntdp_category_id);
    if (!opt) continue;
    const fold = opt.key.toLowerCase();
    if (seen.has(fold)) continue;
    seen.add(fold);
    out.push(opt);
  }
  return out;
}

/** Static fallback when Supabase is empty/unavailable. */
export function staticCategoryOptions() {
  return WEB_CATEGORY_OPTIONS.map((o) => ({
    key: o.label,
    label: o.label,
    shortLabel: o.shortLabel,
    icon: o.icon,
    matchKeywords: [],
    ntdpName: o.label,
  }));
}

/**
 * Load Filter modal CATEGORY chips from admin NTDP categories.
 * Falls back to hardcoded WEB_CATEGORY_OPTIONS on error/empty.
 * @returns {Promise<AppFilterCategoryOption[]>}
 */
export async function fetchAppFilterCategoryOptions() {
  try {
    const { data, error } = await supabase
      .from('ntdp_categories')
      .select('ntdp_category_id, ntdp_category_name')
      .order('ntdp_category_name', { ascending: true });
    if (error) throw error;
    const mapped = mapNtdpRows(data);
    if (!mapped.length) return staticCategoryOptions();
    return mapped;
  } catch (e) {
    console.warn('[appFilterCategories] falling back to static NTDP options', e);
    return staticCategoryOptions();
  }
}

/** @deprecated Keywords are unused; NTDP matching uses category names. */
export function keywordMapFromOptions(options, staticKeywords = {}) {
  const m = { ...staticKeywords };
  for (const o of options ?? []) {
    if (o.matchKeywords?.length) m[o.key] = o.matchKeywords;
  }
  return m;
}

export function labelMapFromOptions(options) {
  const m = {};
  for (const o of options ?? []) {
    if (o.key) m[o.key] = o.ntdpName || o.label || o.shortLabel || o.key;
  }
  return m;
}
