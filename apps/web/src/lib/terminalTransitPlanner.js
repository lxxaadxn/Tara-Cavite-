/**
 * Cavite terminal-to-terminal transit planning (aligned with apps/mobile/lib/terminalTransitPlanner.ts).
 * - Omits unrealistic Trece↔Tagaytay direct edges (through-traffic uses Dasma / Silang corridor).
 * - Dijkstra on distance-weighted edges + multi-candidate origin/destination terminals near user/place.
 */
import { haversineDistanceKm } from './placesFromSupabase';
import { fetchTerminalsFromSupabase } from './terminalsFromSupabase';

const TRANSFER_BASE_KM = 5;
const ORIGIN_CANDIDATES = 10;
const DEST_CANDIDATES = 6;
const ACCESS_WEIGHT = 1.35;

function fold(v) {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOne(v) {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

function isExcludedTransferRoute(routeName) {
  return fold(routeName) === fold('Trece Martires - Tagaytay');
}

function nearestTerminal(terminals, lat, lng) {
  if (!terminals.length) return null;
  let best = terminals[0];
  let bestKm = haversineDistanceKm(lat, lng, best.latitude, best.longitude);
  for (let i = 1; i < terminals.length; i += 1) {
    const t = terminals[i];
    const km = haversineDistanceKm(lat, lng, t.latitude, t.longitude);
    if (km < bestKm) {
      best = t;
      bestKm = km;
    }
  }
  return best;
}

function topNearestTerminals(terminals, lat, lng, k) {
  return [...terminals]
    .map((t) => ({ t, km: haversineDistanceKm(lat, lng, t.latitude, t.longitude) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, Math.max(1, k))
    .map((x) => x.t);
}

function dijkstraPath(graph, startId, goalId, terminalById) {
  if (startId === goalId) return [];

  const nodes = new Set(terminalById.keys());
  for (const k of graph.keys()) nodes.add(k);
  for (const edges of graph.values()) {
    for (const e of edges) nodes.add(e.toId);
  }

  const dist = new Map();
  const prev = new Map();
  for (const id of nodes) dist.set(id, Infinity);
  dist.set(startId, 0);
  const visited = new Set();

  while (visited.size < nodes.size) {
    let u = null;
    let bestD = Infinity;
    for (const id of nodes) {
      if (visited.has(id)) continue;
      const d = dist.get(id);
      if (d < bestD) {
        bestD = d;
        u = id;
      }
    }
    if (u == null || bestD === Infinity) break;
    visited.add(u);
    if (u === goalId) break;

    for (const edge of graph.get(u) ?? []) {
      const v = edge.toId;
      const nd = bestD + edge.weight;
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd);
        prev.set(v, { from: u, edge });
      }
    }
  }

  if ((dist.get(goalId) ?? Infinity) === Infinity) return null;

  const rev = [];
  let walk = goalId;
  while (walk !== startId) {
    const p = prev.get(walk);
    if (!p) return null;
    rev.push({ toId: walk, edge: p.edge });
    walk = p.from;
  }
  return rev.reverse();
}

function cardToNode(t) {
  return {
    id: String(t.id),
    name: t.name,
    municipality: t.city ?? t.municipality ?? '',
    latitude: t.lat,
    longitude: t.lng,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 */
async function buildGraphAndNodes(client) {
  const terminalsRaw = await fetchTerminalsFromSupabase(client);
  const terminals = terminalsRaw.map(cardToNode);
  if (!terminals.length) return { terminals, terminalById: new Map(), graph: new Map() };

  const { data, error } = await client.from('cavitour_terminal_routes').select(
    'terminal_id, route_id, cavitour_routes(route_id, route_name, origin, destination), cavitour_transport_types(transport_name)'
  );
  if (error) throw new Error(error.message);

  const terminalById = new Map(terminals.map((t) => [t.id, t]));

  /** @type {Map<number, { routeName: string; origin: string; destination: string; links: { terminalId: string; municipality: string; transportName: string }[] }>} */
  const byRoute = new Map();

  for (const row of data ?? []) {
    const route = extractOne(row.cavitour_routes);
    const transport = extractOne(row.cavitour_transport_types);
    if (!route) continue;
    if (isExcludedTransferRoute(route.route_name)) continue;

    const terminalId = String(row.terminal_id);
    const terminal = terminalById.get(terminalId);
    if (!terminal) continue;

    if (!byRoute.has(row.route_id)) {
      byRoute.set(row.route_id, {
        routeName: route.route_name,
        origin: route.origin,
        destination: route.destination,
        links: [],
      });
    }
    byRoute.get(row.route_id).links.push({
      terminalId,
      municipality: terminal.municipality,
      transportName: transport?.transport_name?.trim() || 'Jeepney',
    });
  }

  const graph = new Map();
  const pushEdge = (fromN, toN, routeName, transportName) => {
    const weight =
      haversineDistanceKm(fromN.latitude, fromN.longitude, toN.latitude, toN.longitude) + TRANSFER_BASE_KM;
    if (!graph.has(fromN.id)) graph.set(fromN.id, []);
    graph.get(fromN.id).push({
      toId: toN.id,
      routeName,
      transportName,
      weight,
    });
  };

  for (const group of byRoute.values()) {
    const originFold = fold(group.origin);
    const destinationFold = fold(group.destination);
    const origins = group.links.filter((l) => fold(l.municipality).includes(originFold));
    const destinations = group.links.filter((l) => fold(l.municipality).includes(destinationFold));

    const left = origins.length ? origins : group.links;
    const right = destinations.length ? destinations : group.links;

    for (const a of left) {
      for (const b of right) {
        if (a.terminalId === b.terminalId) continue;
        const nodeA = terminalById.get(a.terminalId);
        const nodeB = terminalById.get(b.terminalId);
        if (!nodeA || !nodeB) continue;
        pushEdge(nodeA, nodeB, group.routeName, a.transportName);
        pushEdge(nodeB, nodeA, group.routeName, b.transportName);
      }
    }
  }

  return { terminals, terminalById, graph };
}

function legsFromPath(originTerminal, rawPath, terminalById) {
  const legs = [];
  let fromId = originTerminal.id;
  for (const step of rawPath) {
    const fromTerminal = terminalById.get(fromId);
    const toTerminal = terminalById.get(step.toId);
    legs.push({
      fromTerminalId: fromId,
      toTerminalId: step.toId,
      fromTerminalName: fromTerminal?.name ?? fromId,
      toTerminalName: toTerminal?.name ?? step.toId,
      fromMunicipality: fromTerminal?.municipality ?? '',
      toMunicipality: toTerminal?.municipality ?? '',
      fromLatitude: fromTerminal?.latitude ?? 0,
      fromLongitude: fromTerminal?.longitude ?? 0,
      toLatitude: toTerminal?.latitude ?? 0,
      toLongitude: toTerminal?.longitude ?? 0,
      routeName: step.edge.routeName,
      transportName: step.edge.transportName,
    });
    fromId = step.toId;
  }
  return legs;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ lat: number; lng: number }} userPt
 * @param {{ lat: number; lng: number }} destPt
 */
export async function planTerminalTransit(client, userPt, destPt) {
  const { terminals, graph, terminalById } = await buildGraphAndNodes(client);
  if (!terminals.length) return null;

  const originOptions = topNearestTerminals(terminals, userPt.lat, userPt.lng, ORIGIN_CANDIDATES);
  const destOptions = topNearestTerminals(terminals, destPt.lat, destPt.lng, DEST_CANDIDATES);

  let bestScore = Infinity;
  let bestOrigin = null;
  let bestDest = null;
  let bestPath = null;

  for (const o of originOptions) {
    for (const d of destOptions) {
      const rawPath = dijkstraPath(graph, o.id, d.id, terminalById);
      if (!rawPath) continue;
      const walkO = haversineDistanceKm(userPt.lat, userPt.lng, o.latitude, o.longitude);
      const walkD = haversineDistanceKm(destPt.lat, destPt.lng, d.latitude, d.longitude);
      const pathKm = rawPath.reduce((s, step) => s + step.edge.weight, 0);
      const score = walkO * ACCESS_WEIGHT + walkD * ACCESS_WEIGHT + pathKm;
      if (score < bestScore) {
        bestScore = score;
        bestOrigin = o;
        bestDest = d;
        bestPath = rawPath;
      }
    }
  }

  const fallbackOrigin = nearestTerminal(terminals, userPt.lat, userPt.lng);
  const fallbackDest = nearestTerminal(terminals, destPt.lat, destPt.lng);
  if (!fallbackOrigin || !fallbackDest) return null;

  if (!bestOrigin || !bestDest || bestPath == null) {
    const rawPath = dijkstraPath(graph, fallbackOrigin.id, fallbackDest.id, terminalById);
    if (!rawPath) {
      return { originTerminal: fallbackOrigin, destinationTerminal: fallbackDest, legs: [] };
    }
    return {
      originTerminal: fallbackOrigin,
      destinationTerminal: fallbackDest,
      legs: legsFromPath(fallbackOrigin, rawPath, terminalById),
    };
  }

  return {
    originTerminal: bestOrigin,
    destinationTerminal: bestDest,
    legs: legsFromPath(bestOrigin, bestPath, terminalById),
  };
}

/**
 * Explicit terminal A → B (same graph + Dijkstra as mobile).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} fromTerminalId
 * @param {string} toTerminalId
 */
export async function planTerminalTransitBetween(client, fromTerminalId, toTerminalId) {
  const { terminals, graph, terminalById } = await buildGraphAndNodes(client);
  if (!terminals.length) return null;

  const fromId = String(fromTerminalId);
  const toId = String(toTerminalId);
  const originTerminal = terminals.find((t) => t.id === fromId);
  const destinationTerminal = terminals.find((t) => t.id === toId);
  if (!originTerminal || !destinationTerminal) return null;

  const rawPath = dijkstraPath(graph, fromId, toId, terminalById);
  if (!rawPath) return null;

  return {
    originTerminal,
    destinationTerminal,
    legs: legsFromPath(originTerminal, rawPath, terminalById),
  };
}
