/**
 * Parse UPDATED STA-v3 Cavite 2025 Excel → flat JSON + seed SQL for public.sta_v3_cavite_2025.
 *
 * - Stores every establishment row
 * - Parses lat/lng from Google Maps links (!3d/!4d preferred)
 * - Detects red/yellow row highlights from workbook styles
 * - is_listed = has address + maps link + highlight none
 * - Remaps city_mun / ta_category onto existing cities + ta_categories (no Excel inserts)
 * - Upserts distinct type_code / ntdp_category into lookup tables (sta_v3_lookups_seed.sql)
 *
 * Usage:
 *   node scripts/import-sta-v3-flat-table.mjs [path/to.xlsx] [--lookups path/to/snapshot.json]
 *   npm run cavite:import-sta-flat
 */
import XLSX from 'xlsx';
import {
  appendFileSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  existsSync,
} from 'fs';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  createStaLookupMatcher,
  foldLabel,
  remapStaRowLookups,
} from './lib/matchStaLookups.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DEFAULT_XLSX = join(
  root,
  'data',
  'sheets',
  'UPDATED STA-v3_CAVITE_2025 (1).xlsx'
);
const DEFAULT_LOOKUPS = join(root, 'data', 'sta_lookup_snapshots.json');

function parseCliArgs(argv) {
  let xlsxPath = DEFAULT_XLSX;
  let lookupsPath = DEFAULT_LOOKUPS;
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lookups') {
      lookupsPath = argv[++i] || lookupsPath;
      continue;
    }
    if (a.startsWith('--lookups=')) {
      lookupsPath = a.slice('--lookups='.length) || lookupsPath;
      continue;
    }
    positional.push(a);
  }
  if (positional[0]) xlsxPath = positional[0];
  return { xlsxPath, lookupsPath };
}

const EXCLUDE_SHEETS = new Set([
  'Summary',
  'Guide to TA Code',
  'STA2-City',
  'STA2-Prov',
  'Management',
]);

function escSql(s) {
  if (s == null) return 'NULL';
  return `'${String(s).replace(/'/g, "''")}'`;
}

function parseYear(v) {
  if (v === '' || v == null) return null;
  const n = typeof v === 'number' ? v : parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
}

function findHeaderRowIndex(rows) {
  for (let i = 0; i < Math.min(30, rows.length); i++) {
    const r = rows[i];
    if (!r) continue;
    if (String(r[1]).trim() === 'TA_Name' && String(r[0]).trim() === 'No.') return i;
  }
  return 11;
}

function mapHeaderIndexes(headerRow, sampleDataRow) {
  const labels = (headerRow ?? []).map((c) => String(c ?? '').trim().toLowerCase());
  const idx = (name) => {
    const i = labels.indexOf(name.toLowerCase());
    return i >= 0 ? i : -1;
  };

  let address = idx('Address');
  let mapsLink = labels.findIndex(
    (h) => h.includes('google') && h.includes('link')
  );

  // Mislabelled last column (e.g. "Barangay") that actually holds maps URLs
  if (mapsLink < 0 && sampleDataRow) {
    for (let c = labels.length - 1; c >= 0; c--) {
      const v = String(sampleDataRow[c] ?? '');
      if (isMapsLink(v)) {
        mapsLink = c;
        break;
      }
    }
  }

  return {
    no: idx('No.'),
    ta_name: idx('TA_Name'),
    type_code: idx('Type_Code'),
    ta_category: idx('TA_Category'),
    ntdp_category: idx('NTDP_Category'),
    year_est: idx('Year_Est'),
    region: idx('Region'),
    prov_huc: idx('Prov_HUC'),
    city_mun: idx('City_Mun'),
    barangay: idx('Barangay'),
    address,
    maps_link: mapsLink,
  };
}

function cell(row, i) {
  if (i < 0 || i == null) return '';
  return row[i] ?? '';
}

function isMapsLink(v) {
  return /google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(String(v ?? ''));
}

/** Prefer place pin !3dLAT!4dLNG, else /@lat,lng */
function parseCoordsFromMapsUrl(url) {
  const s = String(url ?? '').trim();
  if (!s) return null;

  const pin = s.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/i);
  if (pin) {
    const lat = parseFloat(pin[1]);
    const lng = parseFloat(pin[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const at = s.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (at) {
    const lat = parseFloat(at[1]);
    const lng = parseFloat(at[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const q = s.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (q) {
    const lat = parseFloat(q[1]);
    const lng = parseFloat(q[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  return null;
}

function classifyFillRgb(rgb) {
  if (!rgb) return null;
  const h = String(rgb).replace(/^FF/i, '').toUpperCase();
  if (h === 'FF0000') return 'red';
  if (h === 'FFFF00') return 'yellow';
  return null;
}

/**
 * sheetName → Map(excelRowNumber → 'red'|'yellow')
 * Excel row numbers are 1-based as in the workbook XML.
 */
function loadHighlightBySheet(xlsxPath) {
  const unzipDir = mkdtempSync(join(tmpdir(), 'sta-xlsx-'));
  const result = new Map();

  try {
    execSync(`tar -xf "${xlsxPath}" -C "${unzipDir}"`, { stdio: 'pipe' });

    const styles = readFileSync(join(unzipDir, 'xl', 'styles.xml'), 'utf8');
    const fills = [...styles.matchAll(/<fill>([\s\S]*?)<\/fill>/g)].map((m) => {
      const rgb = (m[1].match(/rgb="([^"]+)"/) || [])[1] || null;
      return { rgb, kind: classifyFillRgb(rgb) };
    });

    const xfBlock = (styles.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/) || [])[1] || '';
    const xfFills = [...xfBlock.matchAll(/<xf\b[^>]*>/g)].map((m) =>
      Number((m[0].match(/fillId="(\d+)"/) || [])[1] || 0)
    );

    const wbXml = readFileSync(join(unzipDir, 'xl', 'workbook.xml'), 'utf8');
    const relsXml = readFileSync(
      join(unzipDir, 'xl', '_rels', 'workbook.xml.rels'),
      'utf8'
    );
    const nameToTarget = {};
    for (const m of wbXml.matchAll(/<sheet[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
      const id = m[2];
      const t = (relsXml.match(new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`)) || [])[1];
      if (t) nameToTarget[m[1]] = t.replace(/^\//, '');
    }

    for (const [name, target] of Object.entries(nameToTarget)) {
      if (EXCLUDE_SHEETS.has(name)) continue;
      const xmlPath = join(unzipDir, 'xl', target);
      let xml;
      try {
        xml = readFileSync(xmlPath, 'utf8');
      } catch {
        continue;
      }
      const rowMap = new Map();
      for (const m of xml.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>/g)) {
        const sm = m[3].match(/s="(\d+)"/);
        if (!sm) continue;
        const fillId = xfFills[Number(sm[1])] ?? 0;
        const kind = fills[fillId]?.kind;
        if (!kind) continue;
        const row = Number(m[2]);
        // Prefer red over yellow if both appear on a row
        const prev = rowMap.get(row);
        if (prev === 'red') continue;
        rowMap.set(row, kind);
      }
      result.set(name, rowMap);
    }
  } finally {
    rmSync(unzipDir, { recursive: true, force: true });
  }

  return result;
}

function parseSheetRows(sheet, sheetName, highlightMap) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });
  const hi = findHeaderRowIndex(rows);
  const firstData = rows[hi + 1];
  const col = mapHeaderIndexes(rows[hi], firstData);
  if (col.ta_name < 0) {
    console.warn(`Skip sheet "${sheetName}": no TA_Name header`);
    return [];
  }

  // For barangay: if maps_link stole a column labelled Barangay, use first Barangay before address
  let barangayIdx = col.barangay;
  if (barangayIdx === col.maps_link) {
    const labels = (rows[hi] ?? []).map((c) => String(c ?? '').trim().toLowerCase());
    barangayIdx = labels.findIndex((h, i) => h === 'barangay' && i !== col.maps_link);
  }

  const out = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r) continue;
    const taName = String(cell(r, col.ta_name)).trim();
    if (!taName) continue;

    const excelRow = i + 1; // sheet_to_json header:1 → row 0 is Excel row 1
    const highlight = highlightMap?.get(excelRow) || 'none';

    const rowNoRaw = cell(r, col.no);
    const rowNo =
      typeof rowNoRaw === 'number'
        ? rowNoRaw
        : parseInt(String(rowNoRaw).trim(), 10);

    const address = String(cell(r, col.address)).trim() || null;
    const googleMapsLinkRaw = String(cell(r, col.maps_link)).trim();
    const googleMapsLink = isMapsLink(googleMapsLinkRaw) ? googleMapsLinkRaw : null;
    const coords = googleMapsLink ? parseCoordsFromMapsUrl(googleMapsLink) : null;

    const hasAddress = Boolean(address);
    const hasLink = Boolean(googleMapsLink);
    const isListed = hasAddress && hasLink && highlight === 'none';

    out.push({
      sheet_name: sheetName,
      row_no: Number.isFinite(rowNo) ? rowNo : null,
      ta_name: taName,
      type_code: String(cell(r, col.type_code)).trim() || null,
      ta_category: String(cell(r, col.ta_category)).trim() || null,
      ntdp_category: String(cell(r, col.ntdp_category)).trim() || null,
      year_est: parseYear(cell(r, col.year_est)),
      region: String(cell(r, col.region)).trim() || null,
      prov_huc: String(cell(r, col.prov_huc)).trim() || null,
      city_mun: String(cell(r, col.city_mun)).trim() || null,
      barangay: String(cell(r, barangayIdx)).trim() || null,
      address,
      google_maps_link: googleMapsLink,
      latitude: coords?.lat ?? null,
      longitude: coords?.lng ?? null,
      highlight,
      is_listed: isListed,
    });
  }
  return out;
}

const { xlsxPath, lookupsPath } = parseCliArgs(process.argv.slice(2));
console.log('Reading', xlsxPath);

if (!existsSync(lookupsPath)) {
  console.error(
    `Missing lookup snapshot: ${lookupsPath}\n` +
      'Refresh from Supabase (cities.city_name, ta_categories.category_name) into data/sta_lookup_snapshots.json'
  );
  process.exit(1);
}

const lookupSnapshot = JSON.parse(readFileSync(lookupsPath, 'utf8'));
const matcher = createStaLookupMatcher(lookupSnapshot);
console.log(
  `Lookup snapshot: ${(lookupSnapshot.cities ?? []).length} cities, ${(lookupSnapshot.ta_categories ?? []).length} ta_categories, ${(lookupSnapshot.ntdp_categories ?? []).length} ntdp, ${(lookupSnapshot.type_codes ?? []).length} type_codes (${lookupsPath})`
);

const highlights = loadHighlightBySheet(xlsxPath);
const buf = readFileSync(xlsxPath);
const wb = XLSX.read(buf, { type: 'buffer' });

const citySheets = wb.SheetNames.filter((n) => !EXCLUDE_SHEETS.has(n));
const allRows = [];
const unmatchedCities = new Map();
const unmatchedTaCategories = new Map();
const unmatchedNtdp = new Map();

for (const sheetName of citySheets) {
  const parsed = parseSheetRows(wb.Sheets[sheetName], sheetName, highlights.get(sheetName));
  for (const raw of parsed) {
    const { row, cityUnmatched, taUnmatched, ntdpUnmatched } = remapStaRowLookups(raw, matcher);
    if (cityUnmatched) {
      unmatchedCities.set(cityUnmatched, (unmatchedCities.get(cityUnmatched) || 0) + 1);
    }
    if (taUnmatched) {
      unmatchedTaCategories.set(
        taUnmatched,
        (unmatchedTaCategories.get(taUnmatched) || 0) + 1
      );
    }
    if (ntdpUnmatched) {
      unmatchedNtdp.set(ntdpUnmatched, (unmatchedNtdp.get(ntdpUnmatched) || 0) + 1);
    }
    allRows.push(row);
  }
}

mkdirSync(join(root, 'data'), { recursive: true });
const jsonPath = join(root, 'data', 'sta_v3_cavite_2025_rows.json');
const listed = allRows.filter((r) => r.is_listed).length;
const hidden = allRows.length - listed;
const byHighlight = { none: 0, red: 0, yellow: 0 };
for (const r of allRows) byHighlight[r.highlight] = (byHighlight[r.highlight] || 0) + 1;

writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      source: xlsxPath,
      count: allRows.length,
      listed,
      hidden,
      byHighlight,
      rows: allRows,
    },
    null,
    2
  ),
  'utf8'
);

function distinctLabels(key) {
  const seen = new Set();
  const out = [];
  for (const row of allRows) {
    const v = String(row[key] ?? '').trim();
    if (!v) continue;
    const fold = v.toLowerCase();
    if (seen.has(fold)) continue;
    seen.add(fold);
    out.push(v);
  }
  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  return out;
}

const existingTypeFolds = new Set(
  (lookupSnapshot.type_codes ?? []).map((n) => foldLabel(n))
);
const existingNtdpFolds = new Set(
  (lookupSnapshot.ntdp_categories ?? []).map((n) => foldLabel(n))
);

// After remapping, only seed-insert labels that are still missing from the live tables.
const typeCodesToInsert = distinctLabels('type_code').filter(
  (n) => !existingTypeFolds.has(foldLabel(n))
);
const ntdpCategoriesToInsert = distinctLabels('ntdp_category').filter(
  (n) => !existingNtdpFolds.has(foldLabel(n))
);

// #region agent log
appendFileSync(
  join(root, 'debug-5d21a4.log'),
  `${JSON.stringify({
    sessionId: '5d21a4',
    timestamp: Date.now(),
    location: 'import-sta-v3-flat-table.mjs:lookups-seed',
    message: 'ntdp/type seed insert plan',
    hypothesisId: 'A',
    runId: 'post-fix',
    data: {
      existingNtdpCount: existingNtdpFolds.size,
      existingTypeCount: existingTypeFolds.size,
      ntdpToInsert: ntdpCategoriesToInsert,
      typeToInsert: typeCodesToInsert,
      unmatchedNtdp: [...unmatchedNtdp.entries()],
      willEmitSetval: true,
    },
  })}\n`
);
// #endregion

const lookupsSeedPath = join(root, 'supabase', 'sta_v3_lookups_seed.sql');
const lookupLines = [];
lookupLines.push('-- Upsert STA Excel type_code / ntdp_category into lookup tables (import-sta-v3-flat-table.mjs)');
lookupLines.push('-- Does NOT insert cities or ta_categories — those come from your existing tables.');
lookupLines.push('-- Sync serial sequences first (avoids ntdp_categories_pkey / type_codes_pkey 23505).');
lookupLines.push('-- Case-insensitive match; does not truncate existing lookup rows.');
lookupLines.push('BEGIN;');
lookupLines.push('');
lookupLines.push(
  `SELECT setval(
  pg_get_serial_sequence('public.type_codes', 'type_code_id'),
  COALESCE((SELECT MAX(type_code_id) FROM public.type_codes), 1),
  true
);`
);
lookupLines.push('');
lookupLines.push(
  `SELECT setval(
  pg_get_serial_sequence('public.ntdp_categories', 'ntdp_category_id'),
  COALESCE((SELECT MAX(ntdp_category_id) FROM public.ntdp_categories), 1),
  true
);`
);
lookupLines.push('');

for (const name of typeCodesToInsert) {
  lookupLines.push(
    [
      'INSERT INTO public.type_codes (type_code)',
      `SELECT ${escSql(name)}`,
      'WHERE NOT EXISTS (',
      '  SELECT 1 FROM public.type_codes tc',
      `  WHERE lower(trim(tc.type_code)) = lower(trim(${escSql(name)}))`,
      ');',
    ].join('\n')
  );
  lookupLines.push('');
}

for (const name of ntdpCategoriesToInsert) {
  lookupLines.push(
    [
      'INSERT INTO public.ntdp_categories (ntdp_category_name)',
      `SELECT ${escSql(name)}`,
      'WHERE NOT EXISTS (',
      '  SELECT 1 FROM public.ntdp_categories nc',
      `  WHERE lower(trim(nc.ntdp_category_name)) = lower(trim(${escSql(name)}))`,
      ');',
    ].join('\n')
  );
  lookupLines.push('');
}

lookupLines.push('COMMIT;');
writeFileSync(lookupsSeedPath, lookupLines.join('\n'), 'utf8');

const seedPath = join(root, 'supabase', 'sta_v3_cavite_2025_seed.sql');
const lines = [];
lines.push('-- Seed public.sta_v3_cavite_2025 from UPDATED STA Excel (import-sta-v3-flat-table.mjs)');
lines.push('-- is_listed gates web/mobile visibility.');
lines.push('-- city_mun / ta_category remapped to existing cities + ta_categories labels.');
lines.push('-- Run supabase/sta_v3_lookups_seed.sql first for type_codes / ntdp_categories.');
lines.push('BEGIN;');
lines.push('TRUNCATE public.sta_v3_cavite_2025;');
lines.push('');

for (const row of allRows) {
  lines.push(
    [
      'INSERT INTO public.sta_v3_cavite_2025',
      '  (sheet_name, row_no, ta_name, type_code, ta_category, ntdp_category, year_est, region, prov_huc, city_mun, barangay,',
      '   address, google_maps_link, latitude, longitude, highlight, is_listed)',
      'VALUES (',
      `  ${escSql(row.sheet_name)},`,
      `  ${row.row_no == null ? 'NULL' : row.row_no},`,
      `  ${escSql(row.ta_name)},`,
      `  ${escSql(row.type_code)},`,
      `  ${escSql(row.ta_category)},`,
      `  ${escSql(row.ntdp_category)},`,
      `  ${row.year_est == null ? 'NULL' : row.year_est},`,
      `  ${escSql(row.region)},`,
      `  ${escSql(row.prov_huc)},`,
      `  ${escSql(row.city_mun)},`,
      `  ${escSql(row.barangay)},`,
      `  ${escSql(row.address)},`,
      `  ${escSql(row.google_maps_link)},`,
      `  ${row.latitude == null ? 'NULL' : row.latitude},`,
      `  ${row.longitude == null ? 'NULL' : row.longitude},`,
      `  ${escSql(row.highlight)},`,
      `  ${row.is_listed ? 'TRUE' : 'FALSE'}`,
      ');',
    ].join('\n')
  );
  lines.push('');
}

lines.push('COMMIT;');
writeFileSync(seedPath, lines.join('\n'), 'utf8');

console.log(
  `Parsed ${allRows.length} rows (${listed} listed, ${hidden} hidden) from ${citySheets.length} LGU sheets`
);
console.log('Highlights:', byHighlight);
console.log(
  `Lookups seed inserts: ${typeCodesToInsert.length} type_codes, ${ntdpCategoriesToInsert.length} ntdp_categories (cities/TA categories not inserted; sequences synced)`
);
if (unmatchedCities.size) {
  console.warn('Unmatched cities (kept Excel text):');
  for (const [name, count] of [...unmatchedCities.entries()].sort()) {
    console.warn(`  ${count}× ${name}`);
  }
} else {
  console.log('All city_mun values matched to cities table labels.');
}
if (unmatchedTaCategories.size) {
  console.warn('Unmatched ta_category values (kept Excel text):');
  for (const [name, count] of [...unmatchedTaCategories.entries()].sort()) {
    console.warn(`  ${count}× ${name}`);
  }
} else {
  console.log('All ta_category values matched to ta_categories table labels.');
}
if (unmatchedNtdp.size) {
  console.warn('Unmatched ntdp_category values (kept Excel text; may be seed-inserted):');
  for (const [name, count] of [...unmatchedNtdp.entries()].sort()) {
    console.warn(`  ${count}× ${name}`);
  }
} else {
  console.log('All ntdp_category values matched to ntdp_categories table labels.');
}
console.log('Wrote', jsonPath);
console.log('Wrote', lookupsSeedPath);
console.log('Wrote', seedPath);
