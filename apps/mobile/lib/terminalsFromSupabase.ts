import type { SupabaseClient } from '@supabase/supabase-js';
import type { Terminal } from '../data/mockData';

type TerminalRow = {
  terminal_id: number;
  terminal_name: string;
  terminal_province: string | null;
  terminal_city: string | null;
  terminal_brgy: string | null;
  first_trip: string | null;
  last_trip: string | null;
};

type TerminalRouteTypeRow = {
  terminal_id: number;
  cavitour_transport_types:
    | {
        transport_name: string | null;
      }
    | {
        transport_name: string | null;
      }[]
    | null;
};

function to12h(raw: string | null): string {
  if (!raw || !raw.includes(':')) return raw ?? '—';
  const [hs, ms] = raw.split(':');
  const h = parseInt(hs, 10);
  const m = parseInt(ms, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return raw;
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${m.toString().padStart(2, '0')} ${period}`;
}

function operatingHours(firstTrip: string | null, lastTrip: string | null): string {
  return `${to12h(firstTrip)} - ${to12h(lastTrip)}`;
}

function municipalityLabel(city: string | null): string {
  if (!city) return 'Cavite';
  return city === 'Dasmarinas' ? 'Dasmariñas' : city;
}

function addressLine(row: TerminalRow): string {
  const city = row.terminal_city ?? '';
  const province = row.terminal_province ?? 'Cavite';
  const brgy = (row.terminal_brgy ?? '').trim();
  return brgy ? `${brgy}, ${city}, ${province}` : `${city}, ${province}`;
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

function coordsForRow(row: TerminalRow): { latitude: number; longitude: number } {
  const city = row.terminal_city?.trim() ?? '';
  const base = CITY_CENTERS[city] ?? DEFAULT_CENTER;
  const idNum = row.terminal_id;
  const t = idNum * 2.3999632297286533;
  const r = 0.004 + (idNum % 7) * 0.0014;
  return {
    latitude: base[0] + Math.sin(t) * r,
    longitude: base[1] + Math.cos(t) * r,
  };
}

function mapTransportByTerminal(rows: TerminalRouteTypeRow[]): Map<number, string[]> {
  const out = new Map<number, Set<string>>();
  for (const row of rows) {
    const raw = row.cavitour_transport_types;
    const entries = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (!out.has(row.terminal_id)) out.set(row.terminal_id, new Set<string>());
    const bucket = out.get(row.terminal_id)!;
    for (const tt of entries) {
      const name = tt?.transport_name?.trim();
      if (name) bucket.add(name);
    }
  }
  const normalized = new Map<number, string[]>();
  for (const [id, set] of out.entries()) {
    normalized.set(id, Array.from(set.values()).sort((a, b) => a.localeCompare(b)));
  }
  return normalized;
}

function rowToTerminal(row: TerminalRow, transportTypes: string[]): Terminal | null {
  const coords = coordsForRow(row);
  return {
    id: String(row.terminal_id),
    name: row.terminal_name,
    municipality: municipalityLabel(row.terminal_city),
    addressLine: addressLine(row),
    description: undefined,
    category: row.terminal_city === 'Dasmarinas' ? 'dasma-bayan' : 'other',
    transportTypes: transportTypes.length ? transportTypes : ['Jeepney'],
    status: 'OPEN',
    operatingHours: operatingHours(row.first_trip, row.last_trip),
    averageFare: 'PHP 12 - 100',
    paymentType: 'Cash',
    primaryRoutes: [],
    reminders: [],
    latitude: coords.latitude,
    longitude: coords.longitude,
  };
}

export async function fetchTerminalsFromSupabase(client: SupabaseClient): Promise<Terminal[]> {
  const { data: terminals, error: terminalsError } = await client
    .from('cavitour_terminals')
    .select(
      'terminal_id, terminal_name, terminal_province, terminal_city, terminal_brgy, first_trip, last_trip'
    )
    .order('terminal_name', { ascending: true });
  if (terminalsError) throw new Error(terminalsError.message);

  const { data: routeTypes, error: routeTypesError } = await client
    .from('cavitour_terminal_routes')
    .select('terminal_id, cavitour_transport_types(transport_name)');
  if (routeTypesError) throw new Error(routeTypesError.message);

  const ttByTerminal = mapTransportByTerminal((routeTypes ?? []) as TerminalRouteTypeRow[]);
  const out: Terminal[] = [];
  for (const row of (terminals ?? []) as TerminalRow[]) {
    const t = rowToTerminal(row, ttByTerminal.get(row.terminal_id) ?? []);
    if (t) out.push(t);
  }
  return out;
}

export function filterTerminalsByText(terminals: Terminal[], rawQuery: string, limit = 25): Terminal[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return [];
  const ranked = terminals
    .map((t) => {
      const haystack = `${t.name} ${t.municipality} ${t.addressLine ?? ''}`.toLowerCase();
      const idx = haystack.indexOf(q);
      return { terminal: t, idx: idx < 0 ? Number.MAX_SAFE_INTEGER : idx };
    })
    .filter((x) => x.idx !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.idx - b.idx || a.terminal.name.localeCompare(b.terminal.name))
    .slice(0, limit)
    .map((x) => x.terminal);
  return ranked;
}
