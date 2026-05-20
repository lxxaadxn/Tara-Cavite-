import { isCommuteTourRouteId, isMallTerminalId } from 'cavitour-shared/terminalCatalogPolicy';
import { isSupabaseConfigured, supabase } from './supabase';
import { getRoutesForTerminalId, type TerminalRouteRow } from './caviteRouteCatalog';

type RpcRow = {
  terminal_route_id: number;
  route_id: number;
  route_name: string;
  origin: string;
  destination: string;
  transport_type_id: number;
  transport_name: string;
};

function mapRpcRow(r: RpcRow): TerminalRouteRow {
  return {
    terminalRouteId: String(r.terminal_route_id),
    routeId: String(r.route_id),
    routeName: r.route_name,
    origin: r.origin,
    destination: r.destination,
    transportTypeId: String(r.transport_type_id),
    transportName: r.transport_name,
  };
}

/**
 * Loads routes for a terminal from Supabase RPC `cavitour_routes_for_terminal`.
 * Falls back to bundled JSON if RPC fails, returns empty, or anon lacks permission.
 */
function filterShowcasedRoutes(rows: TerminalRouteRow[]): TerminalRouteRow[] {
  return rows.filter((r) => isCommuteTourRouteId(r.routeId));
}

export async function fetchRoutesForTerminalId(terminalId: string): Promise<TerminalRouteRow[]> {
  const n = parseInt(terminalId, 10);
  if (!Number.isFinite(n) || !isMallTerminalId(n)) return [];
  const local = filterShowcasedRoutes(getRoutesForTerminalId(terminalId));
  if (!isSupabaseConfigured) return local;

  try {
    const { data, error } = await supabase.rpc('cavitour_routes_for_terminal', {
      p_terminal_id: n,
    });
    if (error) {
      console.warn('[fetchRoutesForTerminalId] Supabase:', error.message);
      return local;
    }
    if (!Array.isArray(data)) return local;
    /** Live rows from Postgres replace bundled JSON when at least one row exists. */
    if (data.length > 0) return filterShowcasedRoutes((data as RpcRow[]).map(mapRpcRow));
    return local;
  } catch (e) {
    console.warn('[fetchRoutesForTerminalId]', e);
    return local;
  }
}
