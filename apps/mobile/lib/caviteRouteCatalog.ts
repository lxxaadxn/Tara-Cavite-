import transportTypesRows from '../data/transport_types_rows.json';
import routesRows from '../data/routes_cavite_rows.json';
import terminalRoutesRows from '../data/terminal_routes_cavite_rows.json';

export type TerminalRouteRow = {
  terminalRouteId: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  transportTypeId: string;
  transportName: string;
};

type TT = { Transport_Type_Id: string; Transport_Name: string };
type R = { Route_Id: string; Route_Name: string; Origin: string; Destination: string };
type TR = {
  Terminal_Route_Id: string;
  Terminal_Id: string;
  Route_Id: string;
  Transport_Type_Id: string;
};

const transportById = new Map<string, string>(
  (transportTypesRows as TT[]).map((t) => [t.Transport_Type_Id, t.Transport_Name])
);

const routeById = new Map<string, R>(
  (routesRows as R[]).map((r) => [r.Route_Id, r])
);

/** Resolves sheet `Terminal_Id` from Directions navigation params. */
export function terminalIdFromDirectionsPlace(
  place: Record<string, unknown> | undefined
): string | null {
  if (!place) return null;
  const tid = place.terminalId;
  if (typeof tid === 'string' && /^\d+$/.test(tid)) return tid;
  const id = place.id;
  if (place.type === 'Terminal' && typeof id === 'string' && /^\d+$/.test(id) && !id.startsWith('hub-')) {
    return id;
  }
  return null;
}

/**
 * Routes linked to a terminal (from Terminal_Routes + Routes + Transport_Types),
 * matching your sheet model. Used on Terminal detail and Directions.
 */
export function getRoutesForTerminalId(terminalId: string): TerminalRouteRow[] {
  const links = (terminalRoutesRows as TR[]).filter((tr) => tr.Terminal_Id === String(terminalId));
  const out: TerminalRouteRow[] = [];
  for (const tr of links) {
    const r = routeById.get(tr.Route_Id);
    if (!r) continue;
    out.push({
      terminalRouteId: tr.Terminal_Route_Id,
      routeId: tr.Route_Id,
      routeName: r.Route_Name,
      origin: r.Origin,
      destination: r.Destination,
      transportTypeId: tr.Transport_Type_Id,
      transportName: transportById.get(tr.Transport_Type_Id) ?? 'Jeepney',
    });
  }
  return out;
}
