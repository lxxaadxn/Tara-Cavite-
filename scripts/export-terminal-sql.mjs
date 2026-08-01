/**
 * Emits supabase/terminal_dataset_seed.sql (truncate + insert) from JSON row files.
 * Run after: node scripts/build-terminal-sheets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function sqlStr(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const terminals = JSON.parse(fs.readFileSync(path.join(root, 'data', 'terminals_cavite_rows.json'), 'utf8'));
const transportTypes = JSON.parse(
  fs.readFileSync(path.join(root, 'data', 'transport_types_rows.json'), 'utf8')
);
const routes = JSON.parse(fs.readFileSync(path.join(root, 'data', 'routes_cavite_rows.json'), 'utf8'));
const terminalRoutes = JSON.parse(
  fs.readFileSync(path.join(root, 'data', 'terminal_routes_cavite_rows.json'), 'utf8')
);

const lines = [];
lines.push('-- Tara, Cavite! terminal dataset (matches data/sheets/*.csv column semantics)');
lines.push('-- Tables are prefixed to avoid collisions with existing public tables.');
lines.push('BEGIN;');
lines.push(
  'TRUNCATE cavitour_terminal_routes, cavitour_routes, cavitour_terminals, cavitour_transport_types RESTART IDENTITY CASCADE;'
);

lines.push('');
lines.push(
  'INSERT INTO cavitour_transport_types (transport_type_id, transport_name) VALUES'
);
lines.push(
  transportTypes
    .map((t) => `  (${t.Transport_Type_Id}, ${sqlStr(t.Transport_Name)})`)
    .join(',\n') + ';'
);

lines.push('');
lines.push(
  'INSERT INTO cavitour_terminals (terminal_id, terminal_name, terminal_province, terminal_city, terminal_brgy, first_trip, last_trip) VALUES'
);
lines.push(
  terminals
    .map(
      (x) =>
        `  (${x.Terminal_Id}, ${sqlStr(x.Terminal_Name)}, ${sqlStr(x.Terminal_Province)}, ${sqlStr(x.Terminal_City)}, ${sqlStr(x.Terminal_Brgy)}, ${sqlStr(x.First_Trip)}, ${sqlStr(x.Last_Trip)})`
    )
    .join(',\n') + ';'
);

lines.push('');
lines.push('INSERT INTO cavitour_routes (route_id, route_name, origin, destination) VALUES');
lines.push(
  routes
    .map(
      (r) =>
        `  (${r.Route_Id}, ${sqlStr(r.Route_Name)}, ${sqlStr(r.Origin)}, ${sqlStr(r.Destination)})`
    )
    .join(',\n') + ';'
);

for (const batch of chunk(terminalRoutes, 80)) {
  lines.push('');
  lines.push(
    'INSERT INTO cavitour_terminal_routes (terminal_route_id, terminal_id, route_id, transport_type_id) VALUES'
  );
  lines.push(
    batch
      .map(
        (tr) =>
          `  (${tr.Terminal_Route_Id}, ${tr.Terminal_Id}, ${tr.Route_Id}, ${tr.Transport_Type_Id})`
      )
      .join(',\n') + ';'
);
}

lines.push('COMMIT;');

const outPath = path.join(root, 'supabase', 'terminal_dataset_seed.sql');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', path.relative(root, outPath));
