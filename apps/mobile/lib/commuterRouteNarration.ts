import { formatDistanceM, formatDurationS, type RouteStepUi } from './fetchOsrmRoute';

function useRoadHint(roadName: string | null | undefined): string | null {
  if (!roadName?.trim()) return null;
  const n = roadName.trim();
  if (n.length < 3) return null;
  const lower = n.toLowerCase();
  if (/^(unnamed|way|null)$/.test(lower)) return null;
  return n;
}

/**
 * Replaces OSRM driving maneuvers with commuter/tourist copy: jeepney/bus/UV corridors toward the destination.
 */
export function commuterDirectStepInstruction(
  step: RouteStepUi,
  index: number,
  total: number,
  destinationLabel: string
): string {
  const dist = formatDistanceM(step.distanceM);
  const dur = formatDurationS(step.durationS);
  const road = useRoadHint(step.roadName);
  const along = road
    ? ` Some signboards mention ${road}—still confirm with the driver that you’re bound for the right direction.`
    : '';

  if (total <= 1) {
    return `Take a jeepney, bus, UV Express, or modern jeepney toward ${destinationLabel}, staying on this mapped corridor for about ${dist} (~${dur} if traffic is light). Ask to be dropped at the nearest safe corner to your stop.${along}`;
  }
  if (index === 0) {
    return `From your area, board public transport that follows this main corridor about ${dist} (~${dur}), heading toward ${destinationLabel}.${along}`;
  }
  if (index === total - 1) {
    return `Last segment (~${dist}, ~${dur}): stay on rides that approach ${destinationLabel}. When you’re close, ask to alight at a safe spot, then walk or take a tricycle for the final approach if needed.${along}`;
  }
  return `Continue about ${dist} (~${dur}) along this corridor toward ${destinationLabel}. If your ride turns off earlier, get off at a busy corner or terminal and transfer to another line that keeps going your way.${along}`;
}

export function buildCommuterNarrativeFromOsrmSteps(steps: RouteStepUi[], destinationLabel: string): string {
  if (!steps.length) {
    return `Turn on location to build segments from where you are standing.\n\nYou can still open the full map to find ${destinationLabel} and ask locally for jeepney or bus lines—even without steps here.`;
  }
  const head =
    `You’re commuting toward ${destinationLabel}.\n\n` +
    'Each numbered item is part of the mapped road corridor—not “turn left on…” driving directions. Use it to choose jeepneys, buses, or vans that stay on the same general route, and confirm with the driver or konduktor.\n\n' +
    'Driving? The same roads apply—watch for passenger stops and one-way signs.';
  const body = steps
    .map((s, i) => `${i + 1}. ${commuterDirectStepInstruction(s, i, steps.length, destinationLabel)}`)
    .join('\n\n');
  return `${head}\n\n${body}`;
}
