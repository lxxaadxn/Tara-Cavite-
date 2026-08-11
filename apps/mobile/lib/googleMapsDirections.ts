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
