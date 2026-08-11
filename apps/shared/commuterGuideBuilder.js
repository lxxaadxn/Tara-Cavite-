/**
 * Builds numbered commute guide steps from OSRM road corridor hints
 * (GPS → destination). No terminal hubs.
 */

function fold(v) {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function useRoadHint(roadName) {
  if (!roadName?.trim()) return null;
  const n = roadName.trim();
  if (n.length < 4) return null;
  const lower = n.toLowerCase();
  if (/^(unnamed|way|null)$/.test(lower)) return null;
  return n;
}

/**
 * Major roads along the mapped corridor, longest segments first (unique names).
 * @param {{ roadName?: string | null; distanceM: number }[]} osrmSteps
 */
export function extractMainRoadCorridorHints(osrmSteps, max = 5) {
  if (!osrmSteps?.length) return [];
  const ranked = [];
  const seen = new Set();
  for (const s of osrmSteps) {
    const name = useRoadHint(s.roadName);
    if (!name) continue;
    const key = fold(name);
    if (seen.has(key)) continue;
    seen.add(key);
    ranked.push({ name, distanceM: s.distanceM ?? 0 });
  }
  ranked.sort((a, b) => b.distanceM - a.distanceM);
  return ranked.slice(0, max).map((r) => r.name);
}

/**
 * @param {{
 *   userPt: { lat: number; lng: number } | null;
 *   destPt?: { lat: number; lng: number } | null;
 *   destinationName: string;
 *   destMunicipality?: string | null;
 *   osrmSteps?: { roadName?: string | null; distanceM: number }[];
 * }} input
 * @returns {{ title: string; body: string; signboards?: string[]; hint?: string }[]}
 */
export function buildCommuterGuideSteps(input) {
  const {
    userPt,
    destPt,
    destinationName,
    destMunicipality,
    osrmSteps = [],
  } = input;

  const destMun = destMunicipality?.trim() || 'the destination area';

  if (!userPt) {
    return [
      {
        title: 'Enable location',
        body: `Turn on location for a commute guide tailored to ${destinationName} — main roads from your area toward the place.`,
      },
    ];
  }

  const steps = [];
  const corridor = extractMainRoadCorridorHints(osrmSteps, 5);
  const primaryRoad = corridor[0] ?? null;
  const otherRoads = corridor.slice(1);

  if (primaryRoad) {
    steps.push({
      title: `Main road toward ${destinationName}`,
      body: otherRoads.length
        ? `From your area, the mapped corridor toward ${destinationName} (${destMun}) usually follows ${primaryRoad}, then ${otherRoads.join(', ')}.`
        : `From your area, the mapped corridor toward ${destinationName} in ${destMun} runs along ${primaryRoad}.`,
      hint: 'This is the road path from the map, not a live schedule. Confirm fares and stops locally.',
    });
  } else {
    steps.push({
      title: `Head toward ${destinationName}`,
      body: `Make your way toward ${destMun} using major roads locals use for ${destinationName}. Open the Map tab for the full corridor once the route loads.`,
      hint: 'Without road names from the map yet, ask at the nearest crossing which ride goes toward your destination.',
    });
  }

  steps.push({
    title: `Arrive at ${destinationName}`,
    body:
      primaryRoad && destPt
        ? `From ${primaryRoad}, complete the last leg to ${destinationName}. Ask to alight at the nearest corner to the entrance if you are on a PUV.`
        : `Finish the trip to ${destinationName} in ${destMun}. Use the map for the exact last meters if the site is inside a mall or subdivision.`,
    hint: 'Hours, fees, and access rules may vary — check on site or with the operator.',
  });

  return steps;
}
