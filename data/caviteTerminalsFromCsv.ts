import type { Terminal } from '../lib/terminalTypes';
import terminalRows from './terminals_cavite_rows.json';

type CsvRow = {
  Terminal_Id: string;
  Terminal_Name: string;
  Terminal_Province: string;
  Terminal_City: string;
  Terminal_Brgy: string;
  First_Trip: string;
  Last_Trip: string;
};

/** Map CSV city spelling to in-app municipality labels (matches location filters). */
function municipalityFromCity(city: string): string {
  const c = city.trim();
  if (c === 'Dasmarinas') return 'Dasmariñas';
  return c;
}

const CITY_CENTERS: Record<string, [number, number]> = {
  Dasmarinas: [14.3297, 120.9367],
  Bacoor: [14.4594, 120.9597],
  Imus: [14.4297, 120.9367],
  Rosario: [14.4221, 120.8531],
  'Trece Martires': [14.2833, 120.8667],
  Tanza: [14.3933, 120.8533],
  'General Trias': [14.3864, 120.8803],
  Kawit: [14.4432, 120.9018],
  Tagaytay: [14.1153, 120.9621],
  Silang: [14.2158, 120.9711],
  Carmona: [14.3132, 121.0576],
  Naic: [14.3189, 120.7653],
  Maragondon: [14.2733, 120.7325],
  Ternate: [14.2867, 120.7167],
  Indang: [14.1958, 120.8769],
  Noveleta: [14.4339, 120.9375],
  'Cavite City': [14.4793, 120.8969],
  'General Mariano Alvarez': [14.2983, 120.9978],
  Magallanes: [14.1883, 120.7572],
  'General Emilio Aguinaldo': [14.1792, 120.8056],
  Alfonso: [14.1396, 120.8558],
  Mendez: [14.1286, 120.9058],
  Amadeo: [14.1706, 120.9247],
};

const DEFAULT_CENTER: [number, number] = [14.33, 120.94];

function coordsForRow(city: string, idNum: number): { latitude: number; longitude: number } {
  const key = city.trim();
  const base = CITY_CENTERS[key] ?? DEFAULT_CENTER;
  const t = idNum * 2.3999632297286533;
  const r = 0.004 + (idNum % 7) * 0.0014;
  return {
    latitude: base[0] + Math.sin(t) * r,
    longitude: base[1] + Math.cos(t) * r,
  };
}

function to12h(trip: string): string {
  const t = trip.trim();
  if (!t || !t.includes(':')) return trip || '—';
  const [hs, ms] = t.split(':');
  const h = parseInt(hs, 10);
  const m = parseInt(ms, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return trip;
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${m.toString().padStart(2, '0')} ${period}`;
}

function operatingHours(first: string, last: string): string {
  return `${to12h(first)} – ${to12h(last)}`;
}

function inferTransportTypes(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('pitx')) return ['Bus', 'Modern Jeepney', 'Jeepney', 'Van'];
  const has = (s: string) => n.includes(s);
  if (has('sm ') || has('robinsons') || has('vista mall') || has('waltermart') || has('nomo'))
    return ['Jeepney', 'Bus', 'Tricycle', 'Van'];
  if (has('pala-pala') || has('strike') || has('transport terminal') || has('city terminal'))
    return ['Jeepney', 'Bus', 'Tricycle'];
  return ['Jeepney', 'Bus', 'Tricycle'];
}

function categoryFor(row: CsvRow): 'dasma-bayan' | 'other' {
  const city = row.Terminal_City.trim();
  const n = row.Terminal_Name.toLowerCase();
  if (city !== 'Dasmarinas') return 'other';
  if (
    n.includes('pala-pala') ||
    n.includes('sm city dasmarinas') ||
    n.includes('robinsons place dasmarinas') ||
    n.includes('vista mall dasmarinas') ||
    n.includes('the district dasmarinas') ||
    n.includes('waltermart dasmarinas')
  ) {
    return 'dasma-bayan';
  }
  return 'other';
}

function rowToTerminal(row: CsvRow): Terminal {
  const idNum = parseInt(row.Terminal_Id, 10);
  const municipality = municipalityFromCity(row.Terminal_City);
  const brgy = row.Terminal_Brgy.trim();
  const addressLine = brgy
    ? `${brgy}, ${row.Terminal_City}, ${row.Terminal_Province}`
    : `${row.Terminal_City}, ${row.Terminal_Province}`;
  const { latitude, longitude } = coordsForRow(row.Terminal_City, idNum);

  return {
    id: String(row.Terminal_Id),
    name: row.Terminal_Name.trim(),
    municipality,
    addressLine,
    category: categoryFor(row),
    transportTypes: inferTransportTypes(row.Terminal_Name),
    status: 'OPEN',
    operatingHours: operatingHours(row.First_Trip, row.Last_Trip),
    averageFare: 'PHP 12 – 100',
    paymentType: 'Cash',
    primaryRoutes: [],
    reminders: [
      'First/last trip times are typical windows; operators may vary by day.',
      'Keep Student / Senior / PWD ID ready if applicable.',
    ],
    latitude,
    longitude,
  };
}

/** Loads Cavite terminals from `terminals_cavite_rows.json` (built from `terminals_cavite_updated.csv`). */
export function caviteTerminalsFromCsv(): Terminal[] {
  const rows = terminalRows as CsvRow[];
  return rows.map(rowToTerminal);
}
