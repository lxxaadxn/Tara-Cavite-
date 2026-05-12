/**
 * Mirrors apps/mobile/lib/commuterRouteNarration.ts
 */

import { formatDistanceM } from './fetchOsrmRoute';

function useRoadHint(roadName) {
  if (!roadName?.trim()) return null;
  const n = roadName.trim();
  if (n.length < 3) return null;
  const lower = n.toLowerCase();
  if (/^(unnamed|way|null)$/.test(lower)) return null;
  return n;
}

function isUnnamedInstruction(ins) {
  const lower = ins.trim().toLowerCase();
  return !lower || /unnamed|^null$|^way$/.test(lower) || /^continue[, ]*$/i.test(lower);
}

export function humanizeOsrmInstructionPhrase(raw, road, maneuverType) {
  const t = raw.trim();
  const m = maneuverType?.toLowerCase() ?? '';

  const newNameOn = /^new name on\s+(.+)$/i.exec(t);
  if (newNameOn) {
    return `Continue onto ${newNameOn[1].replace(/\.$/, '')}`;
  }
  if (m === 'new name' && road) {
    return `Continue onto ${road}`;
  }

  if (/^turn on\s+/i.test(t)) {
    return t.replace(/^turn on\s+/i, 'Turn onto ').replace(/\.$/, '');
  }

  return t.replace(/\.$/, '');
}

export function commuterDirectStepInstruction(step, index, total, destinationLabel) {
  const distStr = formatDistanceM(step.distanceM);
  const road = useRoadHint(step.roadName);
  const raw = step.instruction.trim();
  const last = total > 0 && index === total - 1;

  if (last && step.distanceM < 30) {
    return `Arrive at ${destinationLabel}.`;
  }

  if (!isUnnamedInstruction(raw)) {
    const human = humanizeOsrmInstructionPhrase(raw, road, step.maneuverType);
    const lead = human.charAt(0).toLowerCase() + human.slice(1);
    return `In ${distStr}, ${lead}.`;
  }

  if (road) {
    return last
      ? `In ${distStr}, continue on ${road} toward ${destinationLabel}.`
      : `In ${distStr}, continue on ${road}.`;
  }

  if (index === 0) {
    return `In ${distStr}, head toward ${destinationLabel}.`;
  }
  if (last) {
    return `In ${distStr}, approach ${destinationLabel}.`;
  }
  return `In ${distStr}, continue toward ${destinationLabel}.`;
}

export function buildCommuterNarrativeFromOsrmSteps(steps, destinationLabel) {
  if (!steps.length) {
    return `Turn on location to build steps from where you are.\n\nOpen the full map to find ${destinationLabel}.`;
  }
  const head = `Toward ${destinationLabel} — follow the road path; confirm signs locally.`;
  const body = steps
    .map((s, i) => `${i + 1}. ${commuterDirectStepInstruction(s, i, steps.length, destinationLabel)}`)
    .join('\n\n');
  return `${head}\n\n${body}`;
}

export function commuterStepHint(index, total, stepDistanceM) {
  if (total <= 0 || stepDistanceM < 200) return '';
  if (index === total - 1) {
    return 'PUVs may stop before narrow streets — ask to alight at a main corner if needed.';
  }
  return 'If your ride leaves this road, transfer at a crossing or terminal.';
}
