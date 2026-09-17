import {
  durationHintFromTimes,
  formatTimeWindow,
  parseTimeWindow,
  type AdminItinerary,
  type AdminItineraryStop,
} from './adminItineraries';
import {
  buildStopFromVenue,
  categoriesFromVenues,
  fetchCatalogVenues,
  resolveVenueSmart,
  routeFromVenues,
  scheduleForStops,
  type VenueCandidate,
} from './adminItineraryGenerator';

/**
 * CRUD edits an admin can ask for in the chat ("change stop 3 to 2pm",
 * "replace Pedro Farms with Ilog Maria"). Applied to an unsaved draft only —
 * once saved, the itinerary editor owns the row.
 *
 * Venue queries resolve against the catalog up front. When several places
 * match equally (three coffee shops, "the museum"…) nothing is applied yet:
 * the caller gets a clarification with numbered candidates and asks the
 * admin to pick — or to say "you pick" and take the best-scored one.
 */

/** A stop is addressed by 1-based position or by name; the AI may send either. */
export type StopRef = { index?: number; name?: string };

export type DraftEdit =
  | { kind: 'setTime'; stop: StopRef; start: string; end?: string }
  | { kind: 'replaceStop'; stop: StopRef; venueQuery: string }
  | { kind: 'removeStop'; stop: StopRef }
  | { kind: 'insertStop'; afterStop: StopRef | null; venueQuery: string };

/** One venue query the admin must disambiguate before the batch can apply. */
export type EditClarification = {
  /** The query that produced several plausible places. */
  venueQuery: string;
  /** Numbered choices the UI shows; best-scored first. */
  candidates: VenueCandidate[];
  /** Which edit kinds are waiting on this pick (for the plan summary). */
  editKinds: string[];
};

export type DraftEditResult = {
  draft: AdminItinerary;
  /** One line per edit, applied or refused, for the assistant to read back. */
  notes: string[];
  changed: boolean;
  /** Set when a venue was ambiguous — nothing changed until the admin picks. */
  clarification: EditClarification | null;
  /**
   * Set when the admin answered a pending clarification. The resolved venue
   * re-enters the pipeline as the pick for that query.
   */
  resolvedPick: ResolvedPick | null;
};

export type ResolvedPick = {
  venueQuery: string;
  venue: VenueCandidate;
  /** True when the admin said "you pick"/"any" instead of choosing. */
  autoPicked: boolean;
};

const DAY_PREFIX = /^(Day\s+\d+\s*·\s*)/i;
const MAX_CLARIFY_CHOICES = 4;

function fold(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitDayPrefix(value: string): { prefix: string; rest: string } {
  const match = String(value ?? '').match(DAY_PREFIX);
  if (!match) return { prefix: '', rest: String(value ?? '').trim() };
  return { prefix: match[1], rest: value.slice(match[1].length).trim() };
}

/** "2pm", "2:30 PM", "14:00" → "14:00". Returns '' when it isn't a time. */
export function normalizeTimeInput(raw: string): string {
  const s = String(raw ?? '').trim().toLowerCase().replace(/\./g, '');
  const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return '';

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3];
  if (!Number.isFinite(hour) || minute > 59) return '';

  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  // A bare "2" almost always means the afternoon in a day-trip schedule.
  if (!suffix && hour >= 1 && hour <= 7) hour += 12;
  if (hour > 23) return '';

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function minutesOf(hhmm: string): number | null {
  const m = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function addMinutes(hhmm: string, delta: number): string {
  const base = minutesOf(hhmm);
  if (base == null) return '';
  const next = ((base + delta) % 1440 + 1440) % 1440;
  return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`;
}

function stopLabel(stop: AdminItineraryStop, index: number): string {
  return stop.name || stop.venueName || `stop ${index + 1}`;
}

/** Resolves a stop reference to an index, or -1 when it matches nothing. */
function resolveStop(stops: AdminItineraryStop[], ref: StopRef | null | undefined): number {
  if (!ref) return -1;

  if (typeof ref.index === 'number' && Number.isFinite(ref.index)) {
    const i = Math.round(ref.index) - 1;
    if (i >= 0 && i < stops.length) return i;
  }

  const needle = fold(ref.name ?? '');
  if (needle.length >= 3) {
    const exact = stops.findIndex(
      (s) => fold(s.name) === needle || fold(s.venueName) === needle
    );
    if (exact !== -1) return exact;
    return stops.findIndex(
      (s) => fold(s.name).includes(needle) || fold(s.venueName).includes(needle)
    );
  }

  return -1;
}

function refLabel(ref: StopRef | null | undefined): string {
  if (!ref) return 'that stop';
  if (ref.name) return `"${ref.name}"`;
  if (typeof ref.index === 'number') return `stop ${ref.index}`;
  return 'that stop';
}

function daysOf(draft: AdminItinerary): 1 | 2 | 3 {
  const fromLabel = draft.durationLabel.match(/^(\d)\s*day/i);
  if (fromLabel) {
    const n = Number(fromLabel[1]);
    if (n === 2 || n === 3) return n;
    if (n === 1) return 1;
  }
  const days = new Set(
    draft.stopList
      .map((s) => s.timeWindow.match(/^Day\s+(\d+)/i)?.[1])
      .filter((d): d is string => Boolean(d))
  );
  return days.size === 3 ? 3 : days.size === 2 ? 2 : 1;
}

/** Re-times every stop, used after the stop count changes. */
function reflowSchedule(stops: AdminItineraryStop[], days: 1 | 2 | 3): AdminItineraryStop[] {
  const schedule = scheduleForStops(stops.length, days);
  return stops.map((stop, i) => ({
    ...stop,
    timeWindow: schedule[i]?.timeWindow ?? stop.timeWindow,
    durationHint: schedule[i]?.durationHint ?? stop.durationHint,
  }));
}

/** A stop keeps its catalog identity, so the route and tags can be rebuilt from it. */
function venueOfStop(stop: AdminItineraryStop): VenueCandidate {
  return {
    id: stop.establishment?.placeId ?? '',
    name: stop.venueName || stop.name,
    city: '',
    category: stop.costType || stop.expectTag || '',
    description: stop.description,
    lat: stop.venueLat ?? 0,
    lng: stop.venueLng ?? 0,
  };
}

function recomputeRouteAndTags(
  draft: AdminItinerary,
  cityById: Map<string, VenueCandidate>
): AdminItinerary {
  const venues = draft.stopList.map((stop) => {
    const known = stop.establishment?.placeId
      ? cityById.get(stop.establishment.placeId)
      : undefined;
    return known ?? venueOfStop(stop);
  });

  const route = routeFromVenues(venues);
  const tags = categoriesFromVenues(venues);
  return {
    ...draft,
    route,
    subtitle: draft.subtitle.trim() ? draft.subtitle : route,
    tags: tags.length ? tags : draft.tags,
  };
}

/** "you pick", "any of them", "whatever works" → the admin defers the choice. */
export function isYouPickAnswer(text: string): boolean {
  const s = fold(text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return false;
  return (
    /^(you pick|u pick|you choose|you decide|your choice|any|any one|anyone|anyplace|whatever|whichever|it doesn t matter|doesn t matter|dont care|don t care|surprise me)( .*)?$/.test(
      s
    ) || /\b(you pick|you choose|whichever|whatever s best|whatever is best)\b/.test(s)
  );
}

/** True when the answer names one of the offered candidates. */
export function pickFromCandidates(
  text: string,
  candidates: VenueCandidate[]
): { index: number; venue: VenueCandidate } | null {
  if (!candidates.length) return null;
  const s = fold(text);

  // A bare number, possibly with punctuation or a lead like "option 2".
  const num = s.match(/^(?:option\s+|number\s+|#)?(\d+)$/);
  if (num) {
    const i = Number(num[1]) - 1;
    if (i >= 0 && i < candidates.length) return { index: i, venue: candidates[i] };
    return null;
  }

  // Otherwise try the text as a name against the candidates.
  const matches = candidates
    .map((venue, index) => ({ index, venue, name: fold(venue.name) }))
    .filter((c) => c.name === s || c.name.includes(s) || s.includes(c.name));
  if (matches.length === 1) return { index: matches[0].index, venue: matches[0].venue };

  return null;
}

export async function applyDraftEdits(
  input: AdminItinerary,
  edits: DraftEdit[],
  resolvedPick: ResolvedPick | null = null
): Promise<DraftEditResult> {
  const notes: string[] = [];
  const empty: DraftEditResult = {
    draft: input,
    notes,
    changed: false,
    clarification: null,
    resolvedPick: null,
  };

  if (edits.length === 0) {
    notes.push('No changes were requested.');
    return empty;
  }

  // Any edit but a time change moves venues around, and the route and tags are
  // rebuilt from catalog cities afterwards.
  const needsCatalog = edits.some((e) => e.kind !== 'setTime') || Boolean(resolvedPick);
  const catalog: VenueCandidate[] = needsCatalog ? await fetchCatalogVenues() : [];

  // A pending clarification never blocks re-running its own batch: the pick
  // resolves the query it was asked about.
  let draft: AdminItinerary = { ...input, stopList: [...input.stopList] };
  const days = daysOf(draft);
  let changed = false;
  let stopCountChanged = false;
  let venueSetChanged = false;

  // Pre-pass: resolve every venue query, collecting the first ambiguity.
  let clarification: EditClarification | null = null;

  const editsWithVenues: (
    | { kind: 'setTime'; index: number; start: string; end?: string }
    | { kind: 'removeStop'; index: number }
    | { kind: 'replaceStop'; index: number; venue: VenueCandidate }
    | { kind: 'insertStop'; afterIndex: number; venue: VenueCandidate }
  )[] = [];

  for (const edit of edits) {
    if (edit.kind === 'setTime') {
      const i = resolveStop(draft.stopList, edit.stop);
      if (i === -1) {
        notes.push(`Could not find ${refLabel(edit.stop)} in this itinerary.`);
        continue;
      }
      const start = normalizeTimeInput(edit.start);
      if (!start) {
        notes.push(`"${edit.start}" is not a time I can read.`);
        continue;
      }
      editsWithVenues.push({ kind: 'setTime', index: i, start, end: edit.end });
      continue;
    }

    if (edit.kind === 'removeStop') {
      const i = resolveStop(draft.stopList, edit.stop);
      if (i === -1) {
        notes.push(`Could not find ${refLabel(edit.stop)} in this itinerary.`);
        continue;
      }
      editsWithVenues.push({ kind: 'removeStop', index: i });
      continue;
    }

    // replaceStop / insertStop: resolve the venue first.
    const resolution = resolveVenueSmart(catalog, edit.venueQuery);
    if (resolution.candidates.length === 0) {
      if (resolution.cityLabel) {
        notes.push(`No published place matching "${edit.venueQuery}" in ${resolution.cityLabel}.`);
      } else {
        notes.push(`No published catalog place matches "${edit.venueQuery}".`);
      }
      continue;
    }

    if (resolvedPick && fold(resolvedPick.venueQuery) === fold(edit.venueQuery)) {
      // The admin just answered; apply their pick without asking again.
      const i =
        edit.kind === 'replaceStop' ? resolveStop(draft.stopList, edit.stop) : -1;
      if (edit.kind === 'replaceStop' && i === -1) {
        notes.push(`Could not find ${refLabel(edit.stop)} in this itinerary.`);
        continue;
      }
      const afterIndex =
        edit.kind === 'insertStop'
          ? edit.afterStop
            ? resolveStop(draft.stopList, edit.afterStop)
            : -1
          : -1;
      if (
        edit.kind === 'insertStop' &&
        edit.afterStop &&
        afterIndex === -1
      ) {
        notes.push(`Could not find ${refLabel(edit.afterStop)}, so it will go last.`);
      }
      editsWithVenues.push(
        edit.kind === 'replaceStop'
          ? { kind: 'replaceStop', index: i, venue: resolvedPick.venue }
          : { kind: 'insertStop', afterIndex, venue: resolvedPick.venue }
      );
      continue;
    }

    const first = resolution.candidates[0];
    const second = resolution.candidates[1];
    const ambiguous =
      resolution.descriptive ||
      (resolution.candidates.length > 1 && fold(first.name) !== fold(edit.venueQuery));

    if (ambiguous && second) {
      // Only pause when the runner-up is genuinely plausible.
      clarification = {
        venueQuery: edit.venueQuery,
        candidates: resolution.candidates.slice(0, MAX_CLARIFY_CHOICES),
        editKinds: edits
          .filter((e) => 'venueQuery' in e && fold(e.venueQuery) === fold(edit.venueQuery))
          .map((e) => e.kind),
      };
      break;
    }

    const i = edit.kind === 'replaceStop' ? resolveStop(draft.stopList, edit.stop) : -1;
    if (edit.kind === 'replaceStop' && i === -1) {
      notes.push(`Could not find ${refLabel(edit.stop)} in this itinerary.`);
      continue;
    }
    const afterIndex =
      edit.kind === 'insertStop'
        ? edit.afterStop
          ? resolveStop(draft.stopList, edit.afterStop)
          : -1
        : -1;
    if (edit.kind === 'insertStop' && edit.afterStop && afterIndex === -1) {
      notes.push(`Could not find ${refLabel(edit.afterStop)}, so it will go last.`);
    }
    editsWithVenues.push(
      edit.kind === 'replaceStop'
        ? { kind: 'replaceStop', index: i, venue: first }
        : { kind: 'insertStop', afterIndex, venue: first }
    );
  }

  if (clarification) {
    return {
      draft: input,
      notes: [],
      changed: false,
      clarification,
      resolvedPick: null,
    };
  }

  for (const edit of editsWithVenues) {
    if (edit.kind === 'setTime') {
      const stop = draft.stopList[edit.index];
      const { prefix, rest } = splitDayPrefix(stop.timeWindow);
      const current = parseTimeWindow(rest);
      const currentStart = minutesOf(current.start);
      const currentEnd = minutesOf(current.end);
      const length =
        currentStart != null && currentEnd != null
          ? (currentEnd - currentStart + 1440) % 1440
          : 90;

      const end = edit.end ? normalizeTimeInput(edit.end) : addMinutes(edit.start, length);
      const window = formatTimeWindow(edit.start, end);
      const hint = durationHintFromTimes(edit.start, end);

      draft.stopList[edit.index] = {
        ...stop,
        timeWindow: `${prefix}${window}`,
        durationHint: prefix ? `${prefix}${hint}` : hint,
      };
      notes.push(`${stopLabel(stop, edit.index)} moved to ${window}.`);
      changed = true;
      continue;
    }

    if (edit.kind === 'removeStop') {
      if (draft.stopList.length <= 1) {
        notes.push('An itinerary needs at least one stop, so nothing was removed.');
        continue;
      }
      const [removed] = draft.stopList.splice(edit.index, 1);
      notes.push(`Removed ${stopLabel(removed, edit.index)}.`);
      changed = true;
      stopCountChanged = true;
      venueSetChanged = true;
      continue;
    }

    if (edit.kind === 'replaceStop') {
      const stop = draft.stopList[edit.index];
      draft.stopList[edit.index] = buildStopFromVenue(edit.venue, stop.timeWindow, stop.durationHint);
      notes.push(`Swapped ${stopLabel(stop, edit.index)} for ${edit.venue.name}.`);
      changed = true;
      venueSetChanged = true;
      continue;
    }

    // insertStop
    const at = edit.afterIndex === -1 ? draft.stopList.length : edit.afterIndex + 1;
    draft.stopList.splice(at, 0, buildStopFromVenue(edit.venue, '', ''));
    notes.push(`Added ${edit.venue.name} as stop ${at + 1}.`);
    changed = true;
    stopCountChanged = true;
    venueSetChanged = true;
  }

  if (!changed) return { ...empty, notes };

  if (stopCountChanged) {
    draft.stopList = reflowSchedule(draft.stopList, days);
    notes.push('Times were re-flowed to fit the new stop list.');
  }

  if (venueSetChanged) {
    draft = recomputeRouteAndTags(draft, new Map(catalog.map((v) => [v.id, v])));
  }

  return {
    draft,
    notes,
    changed: true,
    clarification: null,
    resolvedPick: resolvedPick ?? null,
  };
}
