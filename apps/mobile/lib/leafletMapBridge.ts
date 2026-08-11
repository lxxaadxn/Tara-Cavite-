import type { LeafletMarker } from '../components/leafletMapTypes';

export function buildLeafletMapPayload(
  markers: LeafletMarker[],
  userLocation: { lat: number; lng: number } | null
) {
  return {
    markers: markers.map((m) => ({ id: m.id, name: m.name, lat: m.lat, lng: m.lng })),
    userLat: userLocation?.lat ?? null,
    userLng: userLocation?.lng ?? null,
  };
}

/** iOS / Android WebView */
export function leafletInjectUpdateScript(payload: ReturnType<typeof buildLeafletMapPayload>): string {
  return `window.__cavitourUpdateMap(${JSON.stringify(payload)}); true;`;
}

/** Expo web iframe — same payload shape as native inject */
export function leafletHostPostMessageData(payload: ReturnType<typeof buildLeafletMapPayload>): string {
  return JSON.stringify({ type: 'cavitourHostUpdate', payload });
}
