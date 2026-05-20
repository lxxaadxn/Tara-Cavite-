import terminalRows from '../../data/terminals_cavite_rows.json';
import { isMallTerminalId } from './terminalCatalogPolicy.js';

/**
 * Mall terminals (ids 1–25) from `data/terminals_cavite_rows.json`.
 * Used when Supabase is empty, partial, or route-link fetch fails.
 */
export function getMallTerminalSeedRows() {
  return terminalRows
    .filter((row) => isMallTerminalId(row.Terminal_Id))
    .map((row) => ({
      terminal_id: Number(row.Terminal_Id),
      terminal_name: row.Terminal_Name,
      terminal_city: row.Terminal_City,
      first_trip: row.First_Trip,
      last_trip: row.Last_Trip,
    }));
}
