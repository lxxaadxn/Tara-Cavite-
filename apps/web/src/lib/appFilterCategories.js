import { ntdpToFilterOption } from 'cavitour-shared/ntdpFilterMeta';
import { supabase } from './supabase';
import { WEB_CATEGORY_OPTIONS } from './dashboardFilterOptions';

/** @typedef {{ key: string, label: string, shortLabel: string, icon: string, matchKeywords: string[], ntdpName?: string }} AppFilterCategoryOption */

/** Hide Education from Search quick pills and Filter modal. */
const HIDDEN_SEARCH_CATEGORY_FOLDS = new Set([
  'education',
  'educational',
  'educational tourism',
]);

function foldCategoryLabel(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[/&,]+/g, ' ')
    .replace(/\s+tourism$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {AppFilterCategoryOption | null | undefined} opt */
export function isHiddenSearchCategory(opt) {
  const fold = foldCategoryLabel(opt?.shortLabel || opt?.label || opt?.ntdpName || opt?.key);
  if (!fold) return false;
  if (HIDDEN_SEARCH_CATEGORY_FOLDS.has(fold)) return true;
  for (const hidden of HIDDEN_SEARCH_CATEGORY_FOLDS) {
    if (fold.includes(hidden)) return true;
  }
  return false;
}

/**
 * @param {AppFilterCategoryOption[] | null | undefined} options
 * @returns {AppFilterCategoryOption[]}
 */
export function visibleSearchCategoryOptions(options) {
  return (options ?? []).filter((o) => !isHiddenSearchCategory(o));
}

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
