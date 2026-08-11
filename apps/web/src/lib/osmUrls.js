/**
 * OpenStreetMap.org directions (FOSSGIS OSRM car engine). No Google Maps.
 * Empty start → user sets origin on the OSM site; destination is the place.
 */
export function osmDirectionsUrl(lat, lng) {
  const lo = Number(lng);
  const la = Number(lat);
  if (!Number.isFinite(lo) || !Number.isFinite(la)) return '#';
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=%3B${lo}%2C${la}`;
}

/**
 * Free Google Maps directions deep link (no Maps JS SDK / billing).
 * Omitting origin lets Maps use the device “Your location” when permitted.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {'driving'|'walking'|'bicycling'|'transit'} [mode]
 * @param {{ lat: number; lng: number } | null} [origin]
 */
export function googleMapsDirectionsUrl(lat, lng, mode = 'driving', origin = null) {
  const lo = Number(lng);
  const la = Number(lat);
  if (!Number.isFinite(lo) || !Number.isFinite(la)) return '#';
  const travelMode = ['driving', 'walking', 'bicycling', 'transit'].includes(mode) ? mode : 'driving';

  const params = new URLSearchParams({
    api: '1',
    destination: `${la},${lo}`,
    travelmode: travelMode,
  });

  if (origin && Number.isFinite(Number(origin.lat)) && Number.isFinite(Number(origin.lng))) {
    params.set('origin', `${Number(origin.lat)},${Number(origin.lng)}`);
  }

  return `https://www.google.com/maps/dir/?api=1&${params.toString()}`;
}

