import { DEMO_ESTABLISHMENT_ROWS } from './demoCatalog.js';

/** Single demo row by id (for About pages when offline or non-UUID ids). */
export function getDemoEstablishmentById(id) {
  const key = String(id ?? '').trim();
  if (!key) return null;
  return DEMO_ESTABLISHMENT_ROWS.find((r) => r.id === key) ?? null;
}

/** Map shared demo rows through app-specific `rowToPlace` (web or mobile). */
export function mapDemoEstablishmentRows(mapRow) {
  const out = [];
  for (const row of DEMO_ESTABLISHMENT_ROWS) {
    const mapped = mapRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}
