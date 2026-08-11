import { DEMO_ESTABLISHMENT_ROWS } from './demoCatalog.js';

export function getDemoEstablishmentById(id) {
  const key = String(id ?? '').trim();
  if (!key) return null;
  return DEMO_ESTABLISHMENT_ROWS.find((r) => r.id === key) ?? null;
}

export function mapDemoEstablishmentRows(mapRow) {
  const out = [];
  for (const row of DEMO_ESTABLISHMENT_ROWS) {
    const mapped = mapRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}
