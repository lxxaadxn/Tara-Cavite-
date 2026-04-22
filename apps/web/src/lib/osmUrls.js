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
 * Google Maps directions deep link (no JS API required).
 * Uses destination coordinates directly for better pin accuracy.
 */
export function googleMapsDirectionsUrl(lat, lng, mode = 'driving') {
  const lo = Number(lng);
  const la = Number(lat);
  if (!Number.isFinite(lo) || !Number.isFinite(la)) return '#';
  const travelMode = ['driving', 'walking', 'bicycling', 'transit'].includes(mode) ? mode : 'driving';
  return `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}&travelmode=${travelMode}`;
}
