/**
 * Driving directions via public OSRM demo (no API key).
 * https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy
 */

export type RouteStepUi = {
  /** Raw OSRM turn-by-turn (not shown to commuters by default). */
  instruction: string;
  distanceM: number;
  durationS: number;
  /** Street/highway name when OSRM provides it; used only as optional hint in commuter copy. */
  roadName: string | null;
};

export type OsrmRouteResult = {
  geometry: { type: 'LineString'; coordinates: number[][] };
  distanceM: number;
  durationS: number;
  steps: RouteStepUi[];
};

type OsrmStep = {
  distance: number;
  duration: number;
  name?: string;
  maneuver?: { type?: string; instruction?: string };
};

type OsrmResponse = {
  routes?: {
    distance: number;
    duration: number;
    geometry?: { type: string; coordinates: number[][] };
    legs?: { steps?: OsrmStep[] }[];
  }[];
  code?: string;
};

function stepInstruction(step: OsrmStep): string {
  const ins = step.maneuver?.instruction?.trim();
  if (ins) return ins;
  const type = step.maneuver?.type ?? 'Continue';
  const name = step.name?.trim();
  if (name) return `${type} on ${name}`;
  return type;
}

export type OsrmProfile = 'driving' | 'foot';

export async function fetchOsrmRoute(
  profile: OsrmProfile,
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OsrmRouteResult | null> {
  const url = `https://router.project-osrm.org/route/v1/${profile}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as OsrmResponse;
  const route = data.routes?.[0];
  if (!route || data.code === 'NoRoute' || !route.geometry || route.geometry.type !== 'LineString') {
    return null;
  }

  const coords = route.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;

  const steps: RouteStepUi[] = [];
  const legSteps = route.legs?.[0]?.steps;
  if (legSteps) {
    for (const s of legSteps) {
      const rn = s.name?.trim();
      steps.push({
        instruction: stepInstruction(s),
        distanceM: s.distance ?? 0,
        durationS: s.duration ?? 0,
        roadName: rn && rn.length >= 2 ? rn : null,
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

/** Car / motorcycle routing (private vehicles). */
export function fetchDrivingRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OsrmRouteResult | null> {
  return fetchOsrmRoute('driving', from, to);
}

/** Walking path — useful as a corridor hint for commuters on foot between stops. */
export function fetchFootRoute(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<OsrmRouteResult | null> {
  return fetchOsrmRoute('foot', from, to);
}

export function formatDistanceM(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDurationS(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h} h ${rm} min` : `${h} h`;
}
