function fold(v) {
  return String(v ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useRoadHint(roadName) {
  if (!roadName?.trim()) return null;
  const n = roadName.trim();
  if (n.length < 4) return null;
  const lower = n.toLowerCase();
  if (/^(unnamed|way|null)$/.test(lower)) return null;
  return n;
}

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

export function filterRoutesTowardDestination(routes, destMunicipality, destinationLabel) {
  if (!routes?.length) return [];
  const destFold = fold(destMunicipality);
  const nameFold = fold(destinationLabel);
  const tokens = nameFold.split(' ').filter((t) => t.length > 3);

  const scored = routes
    .map((r) => {
      const routeFold = fold(r.routeName);
      const oFold = fold(r.origin);
      const dFold = fold(r.destination);
      let score = 0;
      if (destFold && (dFold.includes(destFold) || routeFold.includes(destFold) || oFold.includes(destFold))) {
        score += 3;
      }
      for (const t of tokens) {
        if (routeFold.includes(t) || dFold.includes(t)) score += 1;
      }
      return { r, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const picked = scored.length ? scored : routes.map((r) => ({ r, score: 0 }));
  return picked.slice(0, 5).map((x) => x.r);
}

export function buildCommuterGuideSteps(input) {
  const {
    userPt,
    destPt,
    destinationName,
    destMunicipality,
    terminalPlan,
    boardingRoutes = [],
    osrmSteps = [],
  } = input;

  const destMun =
    destMunicipality?.trim() ||
    terminalPlan?.destinationTerminal?.municipality?.trim() ||
    'the destination area';

  if (!userPt) {
    return [
      {
        title: 'Enable location',
        body: `Turn on location for a commute guide tailored to ${destinationName} — main roads from your area, then local jeep or bus lines.`,
      },
    ];
  }

  if (!terminalPlan) {
    return [];
  }

  const { originTerminal, destinationTerminal, legs } = terminalPlan;
  const nearbyUser =
    terminalPlan.nearbyUserTerminals?.length > 0
      ? terminalPlan.nearbyUserTerminals
      : [
          {
            ...originTerminal,
            distanceKm: haversineKm(userPt.lat, userPt.lng, originTerminal.latitude, originTerminal.longitude),
          },
        ];

  const steps = [];
  const corridor = extractMainRoadCorridorHints(osrmSteps, 5);
  const primaryRoad = corridor[0] ?? null;
  const otherRoads = corridor.slice(1);

  if (primaryRoad) {
    steps.push({
      title: `Main road toward ${destinationName}`,
      body: otherRoads.length
        ? `From your area, rides toward ${destinationName} (${destMun}) usually follow ${primaryRoad}, then ${otherRoads.join(', ')}. Use these as your corridor — ask drivers which jeep or bus stays on this route.`
        : `From your area, the mapped corridor toward ${destinationName} in ${destMun} runs along ${primaryRoad}. Look for PUVs that serve this road or ask locally before boarding.`,
      hint: 'This is the road path from the map, not a live schedule. Fares and signboards change — confirm with the konduktor.',
    });
  } else {
    steps.push({
      title: `Head toward ${destinationName}`,
      body: `Make your way toward ${destMun} using major roads locals use for ${destinationName}. Open the Map tab for the full corridor once the route loads.`,
      hint: 'Without road names from the map yet, ask at the nearest crossing which ride goes toward your destination.',
    });
  }

  const terminalLines = nearbyUser
    .map((t, i) => `${i + 1}. ${t.name} (${t.municipality}) — ~${t.distanceKm.toFixed(1)} km from you`)
    .join('\n');

  steps.push({
    title: 'Terminals nearest you (board here first)',
    body: `For ${destinationName}, start from the hub closest to your GPS:\n${terminalLines}\n\nWe recommend ${originTerminal.name} unless staff at another nearby terminal point you to a faster line.`,
    hint: 'Distances are straight-line hints; actual ride time depends on traffic and transfers.',
  });

  const walkOriginKm = haversineKm(
    userPt.lat,
    userPt.lng,
    originTerminal.latitude,
    originTerminal.longitude
  );

  steps.push({
    title: `Go to ${originTerminal.name}`,
    body: `~${walkOriginKm.toFixed(1)} km from your location. This is your primary boarding terminal for trips to ${destinationName}.`,
    hint: 'Tricycle or e‑jeep from your street to the terminal bay is common for the first leg.',
  });

  if (legs.length > 0) {
    legs.forEach((leg, i) => {
      const sign = leg.routeName?.trim();
      steps.push({
        title: `Toward ${destinationName}: board “${sign || leg.transportName || 'PUV'}”`,
        body: `At ${leg.fromTerminalName}, ride the line${sign ? ` with signboard “${sign}”` : ''} heading to ${leg.toMunicipality || leg.toTerminalName}. Alight at ${leg.toTerminalName}${i < legs.length - 1 ? ' to transfer.' : ` — closer to ${destinationName}.`}`,
        signboards: sign ? [sign] : [],
        hint: `Tell the konduktor you are going to ${destinationName} or ${destMun} before you pay.`,
      });
    });
  } else if (originTerminal.id !== destinationTerminal.id) {
    const toward = filterRoutesTowardDestination(boardingRoutes, destMun, destinationName);
    const signs = toward.map((r) => r.routeName).filter(Boolean);
    steps.push({
      title: `Choose a ride to ${destMun}`,
      body: `At ${originTerminal.name}, board a jeepney or bus toward ${destinationName}. Match a sign below or ask the dispatcher for the ${destMun} line.`,
      signboards: signs.length ? signs : boardingRoutes.slice(0, 4).map((r) => r.routeName).filter(Boolean),
      hint: 'If no sign matches, describe your destination by name — drivers often know landmarks.',
    });
  } else {
    steps.push({
      title: `Routes at ${originTerminal.name} for ${destinationName}`,
      body: `This terminal is the closest hub to both you and ${destinationName}. Check boards inside for lines toward ${destMun}, then take a tricycle for the last segment if needed.`,
      signboards: filterRoutesTowardDestination(boardingRoutes, destMun, destinationName)
        .map((r) => r.routeName)
        .filter(Boolean)
        .slice(0, 5),
    });
  }

  if (destPt && destinationTerminal.id !== originTerminal.id) {
    const walkDestKm = haversineKm(
      destPt.lat,
      destPt.lng,
      destinationTerminal.latitude,
      destinationTerminal.longitude
    );
    steps.push({
      title: `Alight near ${destinationTerminal.name}`,
      body: `For ${destinationName}, get off at or near ${destinationTerminal.name} (${destinationTerminal.municipality}) — about ${walkDestKm.toFixed(1)} km from the attraction. Finish by tricycle or walk.`,
      hint: 'PUVs often stop at the terminal or a main corner — not at the gate of the site.',
    });
  }

  steps.push({
    title: `Arrive at ${destinationName}`,
    body:
      primaryRoad && destPt
        ? `From ${primaryRoad} or the terminal area, complete the last leg to ${destinationName}. If you are already on the main corridor, ask to alight at the nearest corner to the entrance.`
        : `From the terminal or main road, finish the trip to ${destinationName} in ${destMun}. Use the map for the exact last meters if the site is inside a mall or subdivision.`,
    hint: 'Hours, fees, and access rules may vary — check on site or with the operator.',
  });

  return steps;
}
