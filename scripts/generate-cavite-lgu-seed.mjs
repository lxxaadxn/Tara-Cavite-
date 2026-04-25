/**
 * Build INSERT SQL from data/cavite_sta_v3_geocoded.json
 * Run: node scripts/generate-cavite-lgu-seed.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pathGeo = join(root, 'data', 'cavite_sta_v3_geocoded.json');
const outSql = join(root, 'supabase', 'seed_cavite_lgu_establishments.sql');

const rows = JSON.parse(readFileSync(pathGeo, 'utf8'));

function esc(s) {
  return String(s ?? '').replace(/'/g, "''");
}
function sqlText(v) {
  if (v == null || v === '') return 'NULL';
  return `'${esc(v)}'`;
}

const byTable = new Map();
for (const r of rows) {
  if (r.latitude == null || r.longitude == null) continue;
  const t = r.table_name;
  if (!byTable.has(t)) byTable.set(t, []);
  byTable.get(t).push(r);
}

const lines = [
  `-- STA-v3 Cavite 2025 — per-LGU establishments (generated)`,
  `-- Run after migration that creates places_* tables + v_cavite_establishments`,
  ``,
];

let total = 0;
for (const [table, list] of [...byTable.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`-- ${table} (${list.length} rows)`);
  const cols = `(ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text)`;
  const chunks = [];
  for (const r of list) {
    chunks.push(
      `(${sqlText(r.ta_name)}, ${sqlText(r.type_code)}, ${sqlText(r.ta_category)}, ${sqlText(
        r.ntdp_category
      )}, ${sqlText(r.city_mun)}, ${sqlText(r.address)}, ${r.latitude}, ${r.longitude}, ${sqlText(
        r.description
      )}, ${sqlText(r.searchable_text)})`
    );
  }
  for (let i = 0; i < chunks.length; i += 80) {
    const batch = chunks.slice(i, i + 80);
    lines.push(`INSERT INTO public.${table} ${cols} VALUES`);
    lines.push(batch.join(',\n') + ';');
    lines.push(``);
  }
  total += list.length;
}

lines.push(`-- Total inserted: ${total}`);

writeFileSync(outSql, lines.join('\n'), 'utf8');
console.log('Wrote', outSql, 'rows:', total);
