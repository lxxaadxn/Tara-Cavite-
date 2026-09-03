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

/** Directions when coords exist; otherwise a Maps search for the place name. */
export function googleMapsPlaceUrl(lat, lng, query) {
  const directions = googleMapsDirectionsUrl(lat, lng);
  if (directions && directions !== '#') return directions;
  const q = String(query || '').trim();
  if (!q) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/**
 * Multi-stop directions: last point is destination, earlier points are waypoints (max 9).
 * Origin is omitted so Maps can use the traveler’s location.
 *
 * @param {{ lat: number; lng: number }[]} points
 * @param {'driving'|'walking'|'bicycling'|'transit'} [mode]
 */
export function googleMapsItineraryUrl(points, mode = 'driving') {
  const coords = (points || [])
    .map((p) => ({ lat: Number(p?.lat), lng: Number(p?.lng) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (!coords.length) return null;

  const dest = coords[coords.length - 1];
  const travelMode = ['driving', 'walking', 'bicycling', 'transit'].includes(mode) ? mode : 'driving';
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

