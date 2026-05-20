/** Normalize lat/lng from Supabase (decimal as string) or mock data (number). */
export function parsePlaceCoords(place: {
  latitude?: unknown;
  longitude?: unknown;
  lat?: unknown;
  lng?: unknown;
}): { lat: number; lng: number } | null {
  const latRaw = place.latitude ?? place.lat;
  const lngRaw = place.longitude ?? place.lng;
  const lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw ?? ''));
  const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw ?? ''));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
