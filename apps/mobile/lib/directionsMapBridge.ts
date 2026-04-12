export type DirectionsMapPayload = {
  userLat: number | null;
  userLng: number | null;
  destLat: number;
  destLng: number;
  routeGeoJson: { type: 'LineString'; coordinates: number[][] } | null;
};

export function buildDirectionsMapPayload(p: DirectionsMapPayload) {
  return p;
}

export function directionsInjectUpdateScript(payload: DirectionsMapPayload): string {
  return `window.__cavitourUpdateDirections(${JSON.stringify(payload)}); true;`;
}

export function directionsHostPostMessageData(payload: DirectionsMapPayload): string {
  return JSON.stringify({ type: 'cavitourHostDirections', payload });
}
