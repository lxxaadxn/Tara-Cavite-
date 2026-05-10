/**
 * Driving / walking directions via public OSRM demo (no API key).
 * Mirrors apps/mobile/lib/fetchOsrmRoute.ts
 */

function stepInstruction(step) {
  const ins = step.maneuver?.instruction?.trim();
  if (ins) return ins;
  const type = step.maneuver?.type ?? 'Continue';
  const name = step.name?.trim();
  if (name) return `${type} on ${name}`;
  return type;
}

/**
 * @param {'driving'|'foot'} profile
 * @param {{ lat: number; lng: number }} from
 * @param {{ lat: number; lng: number }} to
 */
export async function fetchOsrmRoute(profile, from, to) {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route || data.code === 'NoRoute' || !route.geometry || route.geometry.type !== 'LineString') {
    return null;
  }
  const coords = route.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const steps = [];
  const legSteps = route.legs?.[0]?.steps;
  if (legSteps) {
    for (const s of legSteps) {
      const rn = s.name?.trim();
      steps.push({
        instruction: stepInstruction(s),
        distanceM: s.distance ?? 0,
        durationS: s.duration ?? 0,
        roadName: rn && rn.length >= 2 ? rn : null,
        maneuverType: s.maneuver?.type?.trim() ? String(s.maneuver.type) : null,
      });
    }
  }

  return {
    geometry: { type: 'LineString', coordinates: coords },
    distanceM: route.distance ?? 0,
    durationS: route.duration ?? 0,
    steps,
  };
}

export function fetchDrivingRoute(from, to) {
  return fetchOsrmRoute('driving', from, to);
}

export function fetchFootRoute(from, to) {
  return fetchOsrmRoute('foot', from, to);
}

export function formatDistanceM(meters) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDurationS(seconds) {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} h ${rm} min` : `${h} h`;
}
