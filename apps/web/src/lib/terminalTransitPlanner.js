/**
 * Cavite terminal-to-terminal transit planning (aligned with apps/mobile/lib/terminalTransitPlanner.ts).
 * Builds a graph from cavitour_terminal_routes + cavitour_routes + cavitour_transport_types, then BFS.
 */
import { haversineDistanceKm } from './placesFromSupabase';
import { fetchTerminalsFromSupabase } from './terminalsFromSupabase';

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

function bfsPath(graph, startId, goalId) {
  if (startId === goalId) return [];
  const queue = [startId];
  const visited = new Set([startId]);
  const prev = new Map();

  while (queue.length) {
    const cur = queue.shift();
    for (const edge of graph.get(cur) ?? []) {
      if (visited.has(edge.toId)) continue;
      visited.add(edge.toId);
      prev.set(edge.toId, { from: cur, edge });
      if (edge.toId === goalId) {
        const rev = [];
        let walk = goalId;
        while (walk !== startId) {
          const p = prev.get(walk);
          if (!p) break;
          rev.push({ toId: walk, edge: p.edge });
          walk = p.from;
        }
        return rev.reverse();
      }
      queue.push(edge.toId);
    }
  }
  return null;
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
  const pushEdge = (from, to, routeName, transportName) => {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from).push({ toId: to, routeName, transportName });
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
        pushEdge(a.terminalId, b.terminalId, group.routeName, a.transportName);
        pushEdge(b.terminalId, a.terminalId, group.routeName, b.transportName);
      }
    }
  }

  return { terminals, terminalById, graph };
}

function legsFromPath(originTerminal, rawPath) {
  const legs = [];
  let fromId = originTerminal.id;
  for (const step of rawPath) {
    legs.push({
      fromTerminalId: fromId,
      toTerminalId: step.toId,
      routeName: step.edge.routeName,
      transportName: step.edge.transportName,
    });
    fromId = step.toId;
  }
  return legs;
}

/**
 * Same as mobile: nearest terminal to user vs nearest to destination, then BFS path.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {{ lat: number; lng: number }} userPt
 * @param {{ lat: number; lng: number }} destPt
 */
export async function planTerminalTransit(client, userPt, destPt) {
  const { terminals, graph } = await buildGraphAndNodes(client);
  if (!terminals.length) return null;

  const originTerminal = nearestTerminal(terminals, userPt.lat, userPt.lng);
  const destinationTerminal = nearestTerminal(terminals, destPt.lat, destPt.lng);
  if (!originTerminal || !destinationTerminal) return null;

  const rawPath = bfsPath(graph, originTerminal.id, destinationTerminal.id);
  if (!rawPath) return null;

  return {
    originTerminal,
    destinationTerminal,
    legs: legsFromPath(originTerminal, rawPath),
  };
}

/**
 * Explicit terminal A → B (same graph + BFS as mobile).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} fromTerminalId
 * @param {string} toTerminalId
 */
export async function planTerminalTransitBetween(client, fromTerminalId, toTerminalId) {
  const { terminals, graph } = await buildGraphAndNodes(client);
  if (!terminals.length) return null;

  const fromId = String(fromTerminalId);
  const toId = String(toTerminalId);
  const originTerminal = terminals.find((t) => t.id === fromId);
  const destinationTerminal = terminals.find((t) => t.id === toId);
  if (!originTerminal || !destinationTerminal) return null;

  const rawPath = bfsPath(graph, fromId, toId);
  if (!rawPath) return null;

  return {
    originTerminal,
    destinationTerminal,
    legs: legsFromPath(originTerminal, rawPath),
  };
}
