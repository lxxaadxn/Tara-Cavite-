/**
 * Builds sheet CSVs (Terminals, Transport_Types, Routes, Terminal_Routes) + JSON for the app.
 * Run: node scripts/build-terminal-sheets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const sheetsDir = path.join(root, 'data', 'sheets');
fs.mkdirSync(sheetsDir, { recursive: true });

const terminalsSrc = path.join(root, 'data', 'terminals_cavite_updated.csv');
const terminalsRowsPath = path.join(root, 'data', 'terminals_cavite_rows.json');

const TRANSPORT_TYPES = [
  { Transport_Type_Id: 1, Transport_Name: 'Bus' },
  { Transport_Type_Id: 2, Transport_Name: 'Jeepney' },
  { Transport_Type_Id: 3, Transport_Name: 'Multicab' },
  { Transport_Type_Id: 4, Transport_Name: 'Tricycle' },
  { Transport_Type_Id: 5, Transport_Name: 'UV Express' },
  { Transport_Type_Id: 6, Transport_Name: 'Shuttle' },
];

/** Trunk / common corridor routes (Origin & Destination match Terminal_City spelling in CSV). */
const ROUTES = [
  ['Kawit', 'Bacoor'],
  ['Kawit', 'Imus'],
  ['Noveleta', 'Bacoor'],
  ['Bacoor', 'Imus'],
  ['Bacoor', 'Dasmarinas'],
  ['Imus', 'Dasmarinas'],
  ['Imus', 'General Trias'],
  ['Dasmarinas', 'General Trias'],
  ['Dasmarinas', 'Trece Martires'],
  ['Dasmarinas', 'Tagaytay'],
  ['Dasmarinas', 'Silang'],
  ['General Trias', 'Trece Martires'],
  ['General Trias', 'Dasmarinas'],
  ['Trece Martires', 'Indang'],
  ['Trece Martires', 'Naic'],
  ['Rosario', 'Dasmarinas'],
  ['Rosario', 'Bacoor'],
  ['Tanza', 'Rosario'],
  ['Tanza', 'Naic'],
  ['Naic', 'Ternate'],
  ['Naic', 'Maragondon'],
  ['Silang', 'Tagaytay'],
  ['Carmona', 'Silang'],
  ['Carmona', 'Dasmarinas'],
  ['Tagaytay', 'Mendez'],
  ['Tagaytay', 'Alfonso'],
  ['Cavite City', 'Kawit'],
  ['Cavite City', 'Bacoor'],
  ['General Mariano Alvarez', 'Dasmarinas'],
  ['General Mariano Alvarez', 'General Trias'],
  ['Maragondon', 'Ternate'],
  ['Magallanes', 'Maragondon'],
  ['Indang', 'Dasmarinas'],
  ['Amadeo', 'Tagaytay'],
  ['Mendez', 'Tagaytay'],
  ['Alfonso', 'Tagaytay'],
  ['General Emilio Aguinaldo', 'Indang'],
  ['Bacoor', 'Rosario'],
  ['Imus', 'Tagaytay'],
  ['Trece Martires', 'Tagaytay'],
  ['Dasmarinas', 'Naic'],
  ['Kawit', 'Dasmarinas'],
  ['Bacoor', 'Tagaytay'],
  ['Rosario', 'Tagaytay'],
  ['Tanza', 'Dasmarinas'],
  ['Silang', 'Dasmarinas'],
];

function routeTransportTypeId(origin, dest) {
  const long = ['Tagaytay', 'Maragondon', 'Ternate', 'Naic', 'Magallanes', 'Alfonso'].some(
    (x) => origin.includes(x) || dest.includes(x)
  );
  if (long) return 1; // Bus
  return 2; // Jeepney
}

function csvEscape(s) {
  const t = String(s ?? '');
  if (/[",\n]/.test(t)) return `"${t.replace(/"/g, '""')}"`;
  return t;
}

function toCsv(headers, rows) {
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  }
  return lines.join('\r\n');
}

// --- Routes with ids ---
const routeRows = ROUTES.map(([origin, dest], i) => {
  const Route_Id = String(i + 1);
  const Route_Name = `${origin} - ${dest}`;
  return { Route_Id, Route_Name, Origin: origin, Destination: dest };
});

// --- Load terminals ---
const terminalsJson = JSON.parse(fs.readFileSync(terminalsRowsPath, 'utf8'));
const terminalRows = terminalsJson.map((t) => ({
  Terminal_Id: t.Terminal_Id,
  Terminal_Name: t.Terminal_Name,
  Terminal_Province: t.Terminal_Province,
  Terminal_City: t.Terminal_City,
  Terminal_Brgy: t.Terminal_Brgy,
  First_Trip: t.First_Trip,
  Last_Trip: t.Last_Trip,
}));

function routeServesCity(route, cityRaw) {
  const city = cityRaw.trim();
  const o = route.Origin.trim();
  const d = route.Destination.trim();
  return o === city || d === city;
}

let trId = 1;
const terminalRouteRows = [];
const MAX_ROUTES_PER_TERMINAL = 10;

for (const term of terminalRows) {
  const city = term.Terminal_City;
  const matched = routeRows.filter((r) => routeServesCity(r, city)).slice(0, MAX_ROUTES_PER_TERMINAL);
  for (const r of matched) {
    const tid = routeTransportTypeId(r.Origin, r.Destination);
    terminalRouteRows.push({
      Terminal_Route_Id: String(trId++),
      Terminal_Id: term.Terminal_Id,
      Route_Id: r.Route_Id,
      Transport_Type_Id: String(tid),
    });
  }
}

// --- Write CSVs into data/sheets (Excel-importable; one file per sheet) ---
fs.copyFileSync(terminalsSrc, path.join(sheetsDir, 'Terminals.csv'));

const ttCsv = toCsv(
  ['Transport_Type_Id', 'Transport_Name'],
  TRANSPORT_TYPES.map((x) => ({
    Transport_Type_Id: String(x.Transport_Type_Id),
    Transport_Name: x.Transport_Name,
  }))
);
fs.writeFileSync(path.join(sheetsDir, 'Transport_Types.csv'), ttCsv, 'utf8');

const routesCsv = toCsv(
  ['Route_Id', 'Route_Name', 'Origin', 'Destination'],
  routeRows.map((r) => ({
    Route_Id: r.Route_Id,
    Route_Name: r.Route_Name,
    Origin: r.Origin,
    Destination: r.Destination,
  }))
);
fs.writeFileSync(path.join(sheetsDir, 'Routes.csv'), routesCsv, 'utf8');

const trCsv = toCsv(
  ['Terminal_Route_Id', 'Terminal_Id', 'Route_Id', 'Transport_Type_Id'],
  terminalRouteRows
);
fs.writeFileSync(path.join(sheetsDir, 'Terminal_Routes.csv'), trCsv, 'utf8');

// --- JSON for app ---
fs.writeFileSync(
  path.join(root, 'data', 'transport_types_rows.json'),
  JSON.stringify(
    TRANSPORT_TYPES.map((x) => ({
      Transport_Type_Id: String(x.Transport_Type_Id),
      Transport_Name: x.Transport_Name,
    })),
    null,
    2
  ),
  'utf8'
);
fs.writeFileSync(path.join(root, 'data', 'routes_cavite_rows.json'), JSON.stringify(routeRows, null, 2), 'utf8');
fs.writeFileSync(
  path.join(root, 'data', 'terminal_routes_cavite_rows.json'),
  JSON.stringify(terminalRouteRows, null, 2),
  'utf8'
);

console.log('Sheets written to', path.relative(root, sheetsDir));
console.log('Routes:', routeRows.length, 'Terminal_Routes:', terminalRouteRows.length);
