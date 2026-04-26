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

type GraphEdge = {
  toId: string;
  routeName: string;
  transportName: string;
};

function bfsPath(
  graph: Map<string, GraphEdge[]>,
  startId: string,
  goalId: string
): { toId: string; edge: GraphEdge }[] | null {
  if (startId === goalId) return [];
  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  const prev = new Map<string, { from: string; edge: GraphEdge }>();

  while (queue.length) {
    const cur = queue.shift()!;
    for (const edge of graph.get(cur) ?? []) {
      if (visited.has(edge.toId)) continue;
      visited.add(edge.toId);
      prev.set(edge.toId, { from: cur, edge });
      if (edge.toId === goalId) {
        const rev: { toId: string; edge: GraphEdge }[] = [];
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

export async function planTerminalTransit(
  client: SupabaseClient,
  userPt: { lat: number; lng: number },
  destPt: { lat: number; lng: number }
): Promise<TerminalTransitPlan | null> {
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
  const pushEdge = (from: string, to: string, routeName: string, transportName: string) => {
    if (!graph.has(from)) graph.set(from, []);
    graph.get(from)!.push({ toId: to, routeName, transportName });
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

  const originTerminal = nearestTerminal(terminals, userPt.lat, userPt.lng);
  const destinationTerminal = nearestTerminal(terminals, destPt.lat, destPt.lng);
  if (!originTerminal || !destinationTerminal) return null;

  const rawPath = bfsPath(graph, originTerminal.id, destinationTerminal.id);
  if (!rawPath) return null;

  const legs: TerminalTransitLeg[] = [];
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

  return { originTerminal, destinationTerminal, legs };
}
