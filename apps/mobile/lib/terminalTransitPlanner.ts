import type { SupabaseClient } from '@supabase/supabase-js';
import { haversineDistanceKm } from './placesFromSupabase';
import { fetchTerminalsFromSupabase } from './terminalsFromSupabase';

type RouteJoin = {
  route_id: number;
  route_name: string;
  origin: string;
  destination: string;
};

type TransportJoin = {
  transport_name: string | null;
};

type LinkRow = {
  terminal_id: number;
  route_id: number;
  cavitour_routes: RouteJoin | RouteJoin[] | null;
  cavitour_transport_types: TransportJoin | TransportJoin[] | null;
};

type TerminalNode = {
  id: string;
  name: string;
  municipality: string;
  latitude: number;
  longitude: number;
};

export type TerminalTransitLeg = {
  fromTerminalId: string;
  toTerminalId: string;
  fromTerminalName: string;
  toTerminalName: string;
  fromMunicipality: string;
  toMunicipality: string;
  fromLatitude: number;
  fromLongitude: number;
  toLatitude: number;
  toLongitude: number;
  routeName: string;
  transportName: string;
};

export type TerminalTransitPlan = {
  originTerminal: TerminalNode;
  destinationTerminal: TerminalNode;
  legs: TerminalTransitLeg[];
};

function fold(v: string): string {
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractOne<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

/** Extra km added per transfer leg so paths prefer fewer, shorter hops. */
const TRANSFER_BASE_KM = 5;

/** How many nearby terminals to try as start / end (crow-flies to user vs destination). */
const ORIGIN_CANDIDATES = 10;
const DEST_CANDIDATES = 6;

/** Weight on walking/driving to first terminal and from last terminal. */
const ACCESS_WEIGHT = 1.35;

/**
 * `cavitour_routes` lists Trece↔Tagaytay, but through-traffic to Tagaytay normally goes via
 * Dasmariñas (Aguinaldo) or Silang. Treating Trece→Tagaytay as a direct edge makes BFS pick
 * Gen Tri → Trece → Tagaytay instead of Gen Tri → Dasma → Tagaytay. Omit this pair from the graph.
 */
function isExcludedTransferRoute(routeName: string): boolean {
  return fold(routeName) === fold('Trece Martires - Tagaytay');
}

function nearestTerminal(terminals: TerminalNode[], lat: number, lng: number): TerminalNode | null {
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

function topNearestTerminals(terminals: TerminalNode[], lat: number, lng: number, k: number): TerminalNode[] {
  return [...terminals]
    .map((t) => ({ t, km: haversineDistanceKm(lat, lng, t.latitude, t.longitude) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, Math.max(1, k))
    .map((x) => x.t);
}

type GraphEdge = {
  toId: string;
  routeName: string;
  transportName: string;
  weight: number;
};

function dijkstraPath(
  graph: Map<string, GraphEdge[]>,
  startId: string,
  goalId: string,
  terminalById: Map<string, TerminalNode>
): { toId: string; edge: GraphEdge }[] | null {
  if (startId === goalId) return [];

  const nodes = new Set<string>(terminalById.keys());
  for (const k of graph.keys()) nodes.add(k);
  for (const edges of graph.values()) {
    for (const e of edges) nodes.add(e.toId);
  }

  const dist = new Map<string, number>();
  const prev = new Map<string, { from: string; edge: GraphEdge }>();
  for (const id of nodes) dist.set(id, Infinity);
  dist.set(startId, 0);
  const visited = new Set<string>();

  while (visited.size < nodes.size) {
    let u: string | null = null;
    let bestD = Infinity;
    for (const id of nodes) {
      if (visited.has(id)) continue;
      const d = dist.get(id) ?? Infinity;
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

  const rev: { toId: string; edge: GraphEdge }[] = [];
  let walk = goalId;
  while (walk !== startId) {
    const p = prev.get(walk);
    if (!p) return null;
    rev.push({ toId: walk, edge: p.edge });
    walk = p.from;
  }
  return rev.reverse();
}

function legsFromPath(
  originTerminal: TerminalNode,
  rawPath: { toId: string; edge: GraphEdge }[],
  terminalById: Map<string, TerminalNode>
): TerminalTransitLeg[] {
  const legs: TerminalTransitLeg[] = [];
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

type BuiltGraph = {
  terminals: TerminalNode[];
  terminalById: Map<string, TerminalNode>;
  graph: Map<string, GraphEdge[]>;
};

async function buildGraph(client: SupabaseClient): Promise<BuiltGraph | null> {
  const terminalsRaw = await fetchTerminalsFromSupabase(client);
  const terminals: TerminalNode[] = terminalsRaw.map((t) => ({
    id: t.id,
    name: t.name,
    municipality: t.municipality,
    latitude: t.latitude,
    longitude: t.longitude,
  }));
  if (!terminals.length) return null;

  const { data, error } = await client
    .from('cavitour_terminal_routes')
    .select(
      'terminal_id, route_id, cavitour_routes(route_id, route_name, origin, destination), cavitour_transport_types(transport_name)'
    );
  if (error) throw new Error(error.message);

  const byRoute = new Map<
    number,
    {
      routeName: string;
      origin: string;
      destination: string;
      links: { terminalId: string; municipality: string; transportName: string }[];
    }
  >();
  const terminalById = new Map<string, TerminalNode>(terminals.map((t) => [t.id, t]));

  for (const row of (data ?? []) as LinkRow[]) {
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
    byRoute.get(row.route_id)!.links.push({
      terminalId,
      municipality: terminal.municipality,
      transportName: transport?.transport_name?.trim() || 'Jeepney',
    });
  }

  const graph = new Map<string, GraphEdge[]>();
  const pushEdge = (fromN: TerminalNode, toN: TerminalNode, routeName: string, transportName: string) => {
    const weight =
      haversineDistanceKm(fromN.latitude, fromN.longitude, toN.latitude, toN.longitude) + TRANSFER_BASE_KM;
    if (!graph.has(fromN.id)) graph.set(fromN.id, []);
    graph.get(fromN.id)!.push({
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

export async function planTerminalTransit(
  client: SupabaseClient,
  userPt: { lat: number; lng: number },
  destPt: { lat: number; lng: number }
): Promise<TerminalTransitPlan | null> {
  const built = await buildGraph(client);
  if (!built) return null;
  const { terminals, terminalById, graph } = built;

  const originOptions = topNearestTerminals(terminals, userPt.lat, userPt.lng, ORIGIN_CANDIDATES);
  const destOptions = topNearestTerminals(terminals, destPt.lat, destPt.lng, DEST_CANDIDATES);

  let bestScore = Infinity;
  let bestOrigin: TerminalNode | null = null;
  let bestDest: TerminalNode | null = null;
  let bestPath: { toId: string; edge: GraphEdge }[] | null = null;

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

  const fallbackOrigin = nearestTerminal(terminals, userPt.lat, userPt.lng)!;
  const fallbackDest = nearestTerminal(terminals, destPt.lat, destPt.lng)!;

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
