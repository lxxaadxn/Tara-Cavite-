/**
 * Plain-language guidance for commuters: modes allowed at a hub vs map routing (driving).
 */

export function parseTransportTypesFromParams(place: Record<string, unknown> | undefined): string[] {
  if (!place) return [];
  const raw = place.transportTypes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

export function isTerminalPlace(place: Record<string, unknown> | undefined): boolean {
  const t = place?.type;
  return typeof t === 'string' && t.toLowerCase() === 'terminal';
}

/** Short bullets shown on terminal detail / directions. */
export function terminalTransportBullets(transportTypes: string[]): string[] {
  const modes =
    transportTypes.length > 0
      ? transportTypes.join(' · ')
      : 'Jeepney · Bus · Tricycle (typical in Cavite terminals)';
  return [
    `Vehicles usually available here: ${modes}.`,
    'At the bay, read signboards and confirm the destination with the driver or dispatcher before boarding.',
    'The in-app map uses a driving route to the terminal pin—your jeepney or bus may follow a slightly different path or stop nearby.',
  ];
}
