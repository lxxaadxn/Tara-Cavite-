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
