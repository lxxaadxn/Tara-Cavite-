import { getMallTerminalSeedRows } from 'cavitour-shared/mallTerminalsSeed';
import terminalCoordinates from 'cavitour-shared/terminalCoordinates.json';
import {
  isCommuteTourRouteId,
  isMallTerminalRow,
  isShowcasedTerminalRouteLink,
} from 'cavitour-shared/terminalCatalogPolicy';

const CITY_CENTERS = {
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

const DEFAULT_CENTER = [14.33, 120.94];

function cityLabel(city) {
  if (!city) return 'Cavite';
  return city === 'Dasmarinas' ? 'Dasmariñas' : city;
}

function to12h(raw) {
  if (!raw || !String(raw).includes(':')) return null;
  const [hs, ms] = String(raw).split(':');
  const h = Number.parseInt(hs, 10);
  const m = Number.parseInt(ms, 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const period = h >= 12 ? 'PM' : 'AM';
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, '0')} ${period}`;
}

function operatingStatus(firstTrip, lastTrip) {
  const start = to12h(firstTrip);
  const end = to12h(lastTrip);
  if (start && end) return `${start} - ${end}`;
  return 'Active';
}

function coordsForTerminal(row) {
  const lat = row.latitude;
  const lng = row.longitude;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng };
  }
  const cached = terminalCoordinates[String(row.terminal_id)];
  if (cached && Number.isFinite(cached.latitude) && Number.isFinite(cached.longitude)) {
    return { lat: cached.latitude, lng: cached.longitude };
  }
  const base = CITY_CENTERS[String(row.terminal_city ?? '').trim()] ?? DEFAULT_CENTER;
  const idNum = Number(row.terminal_id) || 1;
  const t = idNum * 2.4;
  const r = 0.004 + (idNum % 7) * 0.0014;
  return {
    lat: base[0] + Math.sin(t) * r,
    lng: base[1] + Math.cos(t) * r,
  };
}

function toTerminalCard(row, routeCount = 0) {
  const city = cityLabel(row.terminal_city);
  const { lat, lng } = coordsForTerminal(row);
  return {
    id: String(row.terminal_id),
    name: row.terminal_name || 'Terminal',
    subtitle: `${city}, Cavite`,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=900&q=80',
    blurb: `Mall transport terminal serving ${city} and nearby commuter routes.`,
    city,
    routes: routeCount,
    lat,
    lng,
    status: operatingStatus(row.first_trip, row.last_trip),
  };
}

function routeCountByMallTerminal(links) {
  const counts = new Map();
  for (const row of links ?? []) {
    if (!isShowcasedTerminalRouteLink(row)) continue;
    const id = String(row.terminal_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Full Cavite mall terminal list (25) for initial UI before / without Supabase. */
export function buildMallTerminalCatalog(routeCounts = new Map()) {
  return getMallTerminalSeedRows()
    .map((row) => toTerminalCard(row, routeCounts.get(String(row.terminal_id)) ?? 0))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function mergeWithSeedCatalog(liveCards, routeCounts) {
  const byId = new Map(buildMallTerminalCatalog(routeCounts).map((c) => [c.id, c]));
  for (const card of liveCards) {
    byId.set(card.id, {
      ...card,
      routes: routeCounts.get(card.id) ?? card.routes ?? byId.get(card.id)?.routes ?? 0,
    });
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchTerminalsFromSupabase(client) {
  let routeCounts = new Map();
  try {
    const { data: routeLinks, error: linksError } = await client
      .from('cavitour_terminal_routes')
      .select('terminal_id, route_id');
    if (!linksError) routeCounts = routeCountByMallTerminal(routeLinks);
  } catch {
    /* route counts optional */
  }

  let liveCards = [];
  try {
    const { data, error } = await client
      .from('cavitour_terminals')
      .select(
        'terminal_id, terminal_name, terminal_city, first_trip, last_trip, latitude, longitude'
      )
      .order('terminal_name', { ascending: true });
    if (!error) {
      liveCards = (data ?? [])
        .filter(isMallTerminalRow)
        .map((row) => toTerminalCard(row, routeCounts.get(String(row.terminal_id)) ?? 0));
    }
  } catch {
    /* use seed only */
  }

  return mergeWithSeedCatalog(liveCards, routeCounts);
}

/** Route rows linked to one terminal (for detail page). */
export async function fetchRouteRowsForTerminal(client, terminalId) {
  const tid = Number(terminalId);
  if (!Number.isFinite(tid)) return [];
  const { data, error } = await client
    .from('cavitour_terminal_routes')
    .select(
      'route_id, cavitour_routes(route_id, route_name, origin, destination), cavitour_transport_types(transport_name)'
    )
    .eq('terminal_id', tid);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((row) => isCommuteTourRouteId(row.route_id));
}
