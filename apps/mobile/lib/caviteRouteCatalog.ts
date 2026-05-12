export type TerminalRouteRow = {
  terminalRouteId: string;
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  transportTypeId: string;
  transportName: string;
};

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
 * Local fallback catalog.
 * This intentionally returns empty so the app relies on Supabase RPC as source of truth.
 * If RPC is unavailable, Terminal detail still renders and can fall back to static route labels.
 */
export function getRoutesForTerminalId(terminalId: string): TerminalRouteRow[] {
  void terminalId;
  return [];
}
