import terminalRows from '../../data/terminals_cavite_rows.json';
import { isMallTerminalId } from './terminalCatalogPolicy.js';

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
