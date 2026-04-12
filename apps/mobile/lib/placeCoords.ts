/** Normalize lat/lng from Supabase (decimal as string) or mock data (number). */
export function parsePlaceCoords(place: {
  latitude?: unknown;
  longitude?: unknown;
}): { lat: number; lng: number } | null {
  const latRaw = place.latitude;
  const lngRaw = place.longitude;
  const lat = typeof latRaw === 'number' ? latRaw : parseFloat(String(latRaw ?? ''));
  const lng = typeof lngRaw === 'number' ? lngRaw : parseFloat(String(lngRaw ?? ''));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
