import { foldLguName } from 'cavitour-shared/lguKind';
import type { Place } from '../data/mockData';
import { fetchLguFilterOptions, type LguFilterOption } from './lguFilterOptions';

export type LguKind = 'city' | 'municipality';

export type LguPlaceGroup = {
  /** `foldLguName` of the LGU — stable across "City of X" / "X City" spellings. */
  fold: string;
  label: string;
  kind: LguKind;
  places: Place[];
};

/**
 * Titlecase fallback for LGUs present in the catalog but missing from the
 * `cities` table, so a group is never labelled with a raw fold.
 */
function titleCase(fold: string): string {
  return fold
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export type LguLabelLookup = {
  labelByFold: Map<string, string>;
  kindByFold: Map<string, LguKind>;
};

/**
 * Canonical LGU labels from the `cities` table. The static list in
 * `dashboardFilterOptions` only covers 17 of Cavite's 23 LGUs, so groups fall
 * back to whatever `city_mun` the catalog actually carries.
 */
export async function fetchLguLabelLookup(): Promise<LguLabelLookup> {
  const labelByFold = new Map<string, string>();
  const kindByFold = new Map<string, LguKind>();
  const add = (options: LguFilterOption[], kind: LguKind) => {
    for (const o of options) {
      const fold = foldLguName(o.label);
      if (!fold || labelByFold.has(fold)) continue;
      labelByFold.set(fold, o.label);
      kindByFold.set(fold, kind);
    }
  };
  try {
    const { cities, municipalities } = await fetchLguFilterOptions();
    add(cities, 'city');
    add(municipalities, 'municipality');
  } catch {
    // Catalog labels are enough to render the sections.
  }
  return { labelByFold, kindByFold };
}

/**
 * Buckets an already-loaded place pool by city/municipality. Pure and cheap —
 * Home reuses the pool it already fetched rather than querying per LGU.
 */
export function groupPlacesByLgu(places: Place[], lookup?: LguLabelLookup): LguPlaceGroup[] {
  const byFold = new Map<string, LguPlaceGroup>();
  for (const place of places) {
    const raw = place.city_mun?.trim();
    if (!raw) continue;
    const fold = foldLguName(raw);
    if (!fold) continue;
    let group = byFold.get(fold);
    if (!group) {
      group = {
        fold,
        label: lookup?.labelByFold.get(fold) ?? raw,
        kind: lookup?.kindByFold.get(fold) ?? (/\bcity\b/i.test(raw) ? 'city' : 'municipality'),
        places: [],
      };
      byFold.set(fold, group);
    }
    group.places.push(place);
  }

  // Ensure a stable label even when the catalog spelling is inconsistent.
  for (const group of byFold.values()) {
    if (!group.label) group.label = titleCase(group.fold);
  }

  return [...byFold.values()].sort(
    (a, b) => b.places.length - a.places.length || a.label.localeCompare(b.label)
  );
}

/** Does this place belong to the given LGU? Matches `city_mun` first, then address. */
export function placeIsInLgu(place: Place, fold: string): boolean {
  if (!fold) return false;
  const cityMun = foldLguName(place.city_mun ?? '');
  if (cityMun === fold) return true;
  if (cityMun && (cityMun.includes(fold) || fold.includes(cityMun))) return true;
  return foldLguName(place.address ?? '').includes(fold);
}
