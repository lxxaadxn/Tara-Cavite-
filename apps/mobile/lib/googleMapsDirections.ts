/**
 * Free Google Maps directions deep link (no Maps JS SDK / billing).
 * Omitting origin lets Maps use the device “Your location” when permitted.
 */
export function googleMapsDirectionsUrl(
  destLat: number,
  destLng: number,
  options?: {
    mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
    originLat?: number | null;
    originLng?: number | null;
  }
): string | null {
  const la = Number(destLat);
  const lo = Number(destLng);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;

  const mode = options?.mode ?? 'driving';
  const travelMode = ['driving', 'walking', 'bicycling', 'transit'].includes(mode)
    ? mode
    : 'driving';

  const params = new URLSearchParams({
    api: '1',
    destination: `${la},${lo}`,
    travelmode: travelMode,
  });

  const oLat = options?.originLat != null ? Number(options.originLat) : NaN;
  const oLng = options?.originLng != null ? Number(options.originLng) : NaN;
  if (Number.isFinite(oLat) && Number.isFinite(oLng)) {
    params.set('origin', `${oLat},${oLng}`);
  }

  return `https://www.google.com/maps/dir/?api=1&${params.toString()}`;
}

export function googleMapsPlaceUrl(
  destLat: number | null | undefined,
  destLng: number | null | undefined,
  query?: string
): string | null {
  const directions = googleMapsDirectionsUrl(Number(destLat), Number(destLng));
  if (directions) return directions;
  const q = String(query || '').trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Multi-stop directions: last point is destination, earlier points are waypoints (max 9). */
export function googleMapsItineraryUrl(
  points: { lat: number; lng: number }[] | null | undefined,
  mode: 'driving' | 'walking' | 'bicycling' | 'transit' = 'driving'
): string | null {
  const coords = (points || [])
    .map((p) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!coords.length) return null;

  const dest = coords[coords.length - 1];
  const travelMode = ['driving', 'walking', 'bicycling', 'transit'].includes(mode)
    ? mode
    : 'driving';
  const params = new URLSearchParams({
    api: '1',
    destination: `${dest.lat},${dest.lng}`,
    travelmode: travelMode,
  });
  const earlier = coords.slice(0, -1).slice(0, 9);
  if (earlier.length) {
    params.set('waypoints', earlier.map((p) => `${p.lat},${p.lng}`).join('|'));
  }
  return `https://www.google.com/maps/dir/?api=1&${params.toString()}`;
}
