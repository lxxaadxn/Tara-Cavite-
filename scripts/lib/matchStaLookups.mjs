/**
 * Remap Excel STA city_mun / ta_category labels onto existing lookup table names.
 * Does not insert into cities or ta_categories.
 */

export function foldLabel(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Aggressive normalize for fuzzy TA matching. */
export function normalizeLoose(s) {
  return foldLabel(s)
    .replace(/^\d{3}\s+/, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[/,&_-]+/g, ' ')
    .replace(/\bor\b/g, ' ')
    .replace(/\band\b/g, ' ')
    .replace(/\bthe\b/g, ' ')
    .replace(/\bplease specify\b/g, ' ')
    .replace(/\be\.?g\.?\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeCityKey(s) {
  let t = foldLabel(s);
  t = t.replace(/^city of\s+/, '').replace(/^municipality of\s+/, '');
  t = t.replace(/\s+city$/, '');
  return t.trim();
}

/** Excel / sheet quirks → preferred table label (before fuzzy). */
export const CITY_ALIASES = {
  'city of dasmarinas': 'Dasmariñas',
  dasmarinas: 'Dasmariñas',
  'general trias city': 'General Trias',
  'general trias': 'General Trias',
  'imus city': 'Imus',
  imus: 'Imus',
  'tagaytay city': 'Tagaytay',
  tagaytay: 'Tagaytay',
  'trece martires city': 'Trece Martires',
  'trece martires': 'Trece Martires',
  'mendez-nunez': 'Mendez-Nuñez',
  'mendez nunez': 'Mendez-Nuñez',
  gma: 'General Mariano Alvarez',
  'gen. mariano alvarez': 'General Mariano Alvarez',
};

/** Freeform / coded Excel TA labels → table category_name. */
export const TA_CATEGORY_ALIASES = {
  '101 mountains/hills/highlands': 'Mountains or Hills or Highlands',
  '102 falls': 'Falls',
  '104 river and landscape (includes subterranean rivers)': 'River and Landscape',
  '199 other natural attractions (e.g. century old trees/forest, endemic species)':
    'Other Natural Attractions',
  '201 fort': 'Fort',
  '202 church, mosque, temples or other religious sites':
    'Church or Mosque or Temples or Other Religious Sites',
  '204 historic monuments': 'Historic Monuments',
  '205 museum': 'Museum',
  '206 structures and buildings': 'Structures and Buildings',
  '299 other historical or cultural attractions': 'Other Historical or Cultural Attractions',
  '301 agro-forestry': 'Agro Forestry',
  '302 farm / ranch': 'Farm or Ranch',
  '303 fishery': 'Fishery',
  '401 golf': 'Golf',
  '402 tennis': 'Tennis',
  '404 zoo and botanical garden': 'Zoo and Botanical Garden',
  '405 sports complex': 'Sports Complex',
  '408 beach for sea bathing': 'Beach for Sea Bathing',
  '409 pools and springs': 'Pools and Springs',
  '411 parks': 'Parks',
  '412 leisure-land, theme park': 'Leisure land or Theme Park',
  '413 resort complex': 'Resort Complex',
  '414 other sports and recreational activities': 'Other Sports and Recreational Activities',
  '501 malls, department stores': 'Malls or Department Stores',
  '502 open air market, traditional market area': 'Open Air Market and Traditional Market Area',
  '503 souvenirs and delicacies': 'Souvenirs and Delicacies',
  '601 local specialty restaurant': 'Local Specialty Restaurant',
  '602 festivals (e.g. official or de facto cultural heritage/community related)':
    'Local Culture and Traditions',
  '603 performing arts (e.g. folk music and dance)': 'Entertainment',
  '702 convention': 'Convention',
  '703 sports event': 'Sports Event',
  '799 other events': 'Other Events',
  '803 spa': 'Hot Spring',
  '804 hospital/clinics/medical tourism facilities': 'Others',
  '901 others (please specify)': 'Others',
  'arts and craft': 'Arts and Craft',
  'church, mosque, temples or other religious sites':
    'Church or Mosque or Temples or Other Religious Sites',
  'churches, temples, and places of worship':
    'Church or Mosque or Temples or Other Religious Sites',
  'customs and traditions': 'Local Culture and Traditions',
  'education tourism': 'Education Tourism',
  'farm / ranch': 'Farm or Ranch',
  'festivals (e.g. official or de facto cultural heritage/community related)':
    'Local Culture and Traditions',
  golf: 'Golf',
  'government structures, private structures, and commercial establishments':
    'Structures and Buildings',
  'heritage houses/vernacular architecture': 'Unique Cultural Heritage',
  'historical site': 'Archaeological or Historic Sites',
  'local specialty restaurant': 'Local Specialty Restaurant',
  'malls, department stores': 'Malls or Department Stores',
  'monuments and markers': 'Historic Monuments',
  museum: 'Museum',
  'natural geological and physiographical / land formations':
    'Unique Natural Landscape or Seascape',
  'other sports and recreational activities': 'Other Sports and Recreational Activities',
  park: 'Parks',
  parks: 'Parks',
  'special events': 'Other Events',
  'burial site': 'Other Historical or Cultural Attractions',
  'rehearsal studio': 'Entertainment',
};

/** Excel NTDP typos / near-duplicates → existing ntdp_categories labels. */
export const NTDP_ALIASES = {
  'heatlh, wellness, and retirement tourism': 'Health, Wellness, and Retirement Tourism',
  'health, wellness, and retirement tourism': 'Health, Wellness, and Retirement Tourism',
  'leasure and entertainment tourism': 'Leisure and Entertainment Tourism',
  'leisure and entertainment tourism': 'Leisure and Entertainment Tourism',
  'customs and traditions': 'Cultural Tourism',
  'education tourism': 'Others',
};

function indexByFold(labels) {
  const byExact = new Map();
  const byCityKey = new Map();
  const byLoose = new Map();
  const byCode = new Map();
  for (const label of labels) {
    const raw = String(label ?? '').trim();
    if (!raw) continue;
    byExact.set(foldLabel(raw), raw);
    byCityKey.set(normalizeCityKey(raw), raw);
    byLoose.set(normalizeLoose(raw), raw);
    const code = foldLabel(raw).match(/^(\d{3})\b/);
    if (code) byCode.set(code[1], raw);
  }
  return { byExact, byCityKey, byLoose, byCode, labels: [...byExact.values()] };
}

/**
 * @param {{ cities: string[], ta_categories: string[], ntdp_categories?: string[], type_codes?: string[] }} snapshot
 */
export function createStaLookupMatcher(snapshot) {
  const cityIdx = indexByFold(snapshot.cities ?? []);
  const taIdx = indexByFold(snapshot.ta_categories ?? []);
  const ntdpIdx = indexByFold(snapshot.ntdp_categories ?? []);
  const typeIdx = indexByFold(snapshot.type_codes ?? []);

  // Prefer alias target that exists in the table (handle "Others" vs "Others ")
  function resolveAliasTarget(aliasTarget, idx) {
    if (!aliasTarget) return null;
    const exact = idx.byExact.get(foldLabel(aliasTarget));
    if (exact) return exact;
    const loose = idx.byLoose.get(normalizeLoose(aliasTarget));
    if (loose) return loose;
    // Table may have trailing space on "Others "
    for (const label of idx.labels) {
      if (foldLabel(label) === foldLabel(aliasTarget)) return label;
      if (normalizeLoose(label) === normalizeLoose(aliasTarget)) return label;
    }
    return null;
  }

  function matchCity(raw) {
    const input = String(raw ?? '').trim();
    if (!input) return { matched: null, unmatched: false, input: '' };

    const aliasHit = CITY_ALIASES[foldLabel(input)] ?? CITY_ALIASES[normalizeCityKey(input)];
    if (aliasHit) {
      const resolved = resolveAliasTarget(aliasHit, cityIdx);
      if (resolved) return { matched: resolved, unmatched: false, input };
    }

    const exact = cityIdx.byExact.get(foldLabel(input));
    if (exact) return { matched: exact, unmatched: false, input };

    const cityKey = cityIdx.byCityKey.get(normalizeCityKey(input));
    if (cityKey) return { matched: cityKey, unmatched: false, input };

    return { matched: null, unmatched: true, input };
  }

  function matchTaCategory(raw) {
    const input = String(raw ?? '').trim();
    if (!input) return { matched: null, unmatched: false, input: '' };

    const aliasHit = TA_CATEGORY_ALIASES[foldLabel(input)];
    if (aliasHit) {
      const resolved = resolveAliasTarget(aliasHit, taIdx);
      if (resolved) return { matched: resolved, unmatched: false, input };
    }

    const exact = taIdx.byExact.get(foldLabel(input));
    if (exact) return { matched: exact, unmatched: false, input };

    const code = foldLabel(input).match(/^(\d{3})\b/);
    if (code) {
      // Prefer table row that starts with same code, else loose text after code
      const byCode = taIdx.byCode.get(code[1]);
      if (byCode) return { matched: byCode, unmatched: false, input };
      const looseAfterCode = taIdx.byLoose.get(normalizeLoose(input));
      if (looseAfterCode) return { matched: looseAfterCode, unmatched: false, input };
    }

    const loose = taIdx.byLoose.get(normalizeLoose(input));
    if (loose) return { matched: loose, unmatched: false, input };

    return { matched: null, unmatched: true, input };
  }

  function matchNtdpCategory(raw) {
    const input = String(raw ?? '').trim();
    if (!input) return { matched: null, unmatched: false, input: '' };

    const aliasHit = NTDP_ALIASES[foldLabel(input)];
    if (aliasHit) {
      const resolved = resolveAliasTarget(aliasHit, ntdpIdx);
      if (resolved) return { matched: resolved, unmatched: false, input };
    }

    const exact = ntdpIdx.byExact.get(foldLabel(input));
    if (exact) return { matched: exact, unmatched: false, input };

    const loose = ntdpIdx.byLoose.get(normalizeLoose(input));
    if (loose) return { matched: loose, unmatched: false, input };

    return { matched: null, unmatched: true, input };
  }

  function matchTypeCode(raw) {
    const input = String(raw ?? '').trim();
    if (!input) return { matched: null, unmatched: false, input: '' };
    const exact = typeIdx.byExact.get(foldLabel(input));
    if (exact) return { matched: exact, unmatched: false, input };
    const loose = typeIdx.byLoose.get(normalizeLoose(input));
    if (loose) return { matched: loose, unmatched: false, input };
    return { matched: null, unmatched: true, input };
  }

  return { matchCity, matchTaCategory, matchNtdpCategory, matchTypeCode };
}

/**
 * Apply matcher to a STA row (mutates copies).
 * @returns {{ row: object, cityUnmatched: string|null, taUnmatched: string|null, ntdpUnmatched: string|null }}
 */
export function remapStaRowLookups(row, matcher) {
  const next = { ...row };
  let cityUnmatched = null;
  let taUnmatched = null;
  let ntdpUnmatched = null;

  const city = matcher.matchCity(row.city_mun);
  if (city.matched) next.city_mun = city.matched;
  else if (city.unmatched) cityUnmatched = city.input;

  const ta = matcher.matchTaCategory(row.ta_category);
  if (ta.matched) next.ta_category = ta.matched;
  else if (ta.unmatched) taUnmatched = ta.input;

  if (matcher.matchNtdpCategory) {
    const ntdp = matcher.matchNtdpCategory(row.ntdp_category);
    if (ntdp.matched) next.ntdp_category = ntdp.matched;
    else if (ntdp.unmatched) ntdpUnmatched = ntdp.input;
  }

  if (matcher.matchTypeCode) {
    const tc = matcher.matchTypeCode(row.type_code);
    if (tc.matched) next.type_code = tc.matched;
  }

  return { row: next, cityUnmatched, taUnmatched, ntdpUnmatched };
}
