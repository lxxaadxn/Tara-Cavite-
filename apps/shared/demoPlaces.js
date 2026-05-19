import { DEMO_ESTABLISHMENT_ROWS } from './demoCatalog.js';

/** Map shared demo rows through app-specific `rowToPlace` (web or mobile). */
export function mapDemoEstablishmentRows(mapRow) {
  const out = [];
  for (const row of DEMO_ESTABLISHMENT_ROWS) {
    const mapped = mapRow(row);
    if (mapped) out.push(mapped);
  }
  return out;
}
