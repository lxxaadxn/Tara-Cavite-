import { kiraChatJson, type KiraChatMessage } from './kiraAi';
import type { ChatMessage } from './adminItineraryChats';
import type { AdminItinerary, AdminItineraryStop } from './adminItineraries';
import { normalizeTimeInput, type DraftEdit, type StopRef } from './itineraryDraftEdits';

/**
 * Reads what the admin asked for. Kira writes the reply and extracts the
 * parameters from the conversation so far; the regex parsers below take over
 * whenever Kira is unavailable or answers off-format.
 *
 * Kira never picks places — venue selection stays deterministic in
 * adminItineraryGenerator.ts.
 */

export type ChatTurn = {
  reply: string;
  intent: 'generate' | 'edit' | 'chat' | 'clarify';
  days: 1 | 2 | 3;
  count: number;
  location: string | null;
  /** Every place mentioned for a generation, first-mentioned first (1–3). */
  locations: string[];
  /** Only meaningful for intent 'edit'; applied to the newest unsaved draft. */
  edits: DraftEdit[];
  /**
   * For intent 'clarify': a single focused question with no changes applied.
   * The UI keeps the previous turn's edits around for the answer that follows.
   */
  question: string | null;
};

/** The Edge Function rejects prompts over 24k chars, so only recent turns are replayed. */
const HISTORY_TURNS = 12;
const MAX_TURN_CHARS = 600;
/** The draft the model sees, stop lines capped so one preview can't eat the budget. */
const MAX_DRAFT_STOPS = 13;
const MAX_DRAFT_CHARS = 1600;

const DAY_WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
};

const COUNT_WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

/** Strip day-count phrases so they don't become itinerary counts or location text. */
function stripDayPhrases(text: string): string {
  return text
    .replace(/\b(\d+|one|two|three)\s*-?\s*days?\b/gi, ' ')
    .replace(/\b(\d+|one|two|three)\s*-?\s*day\s+(?:trip|tour|itinerary|itineraries)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseDays(text: string): 1 | 2 | 3 {
  const numeric = text.match(/\b(\d+)\s*-?\s*days?\b/i);
  if (numeric) {
    const n = Number.parseInt(numeric[1], 10);
    if (n >= 1 && n <= 3) return n as 1 | 2 | 3;
  }

  const worded = text.match(/\b(one|two|three)\s*-?\s*days?\b/i);
  if (worded) {
    const n = DAY_WORD_TO_NUM[worded[1].toLowerCase()];
    if (n === 1 || n === 2 || n === 3) return n;
  }

  return 1;
}

/** ~4–5 stops per day, capped for 1–3 day trips. */
export function stopsForDays(days: 1 | 2 | 3): number {
  if (days === 1) return 5;
  if (days === 2) return 9;
  return 13;
}

export function parseCount(text: string): number {
  const forCount = stripDayPhrases(text);

  const explicit =
    forCount.match(/\b(\d+)\s*(?:itinerar(?:y|ies)|route?s?|trip?s?|draft?s?)\b/i) ||
    forCount.match(/\bgenerate\s+(\d+)\b/i) ||
    forCount.match(/\bcreate\s+(\d+)\b/i) ||
    forCount.match(/\bmake\s+(\d+)\b/i) ||
    forCount.match(
      /\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:itinerar(?:y|ies)|route?s?|trip?s?|draft?s?)\b/i
    );

  if (explicit) {
    const raw = explicit[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : COUNT_WORD_TO_NUM[raw];
    if (Number.isFinite(n)) return clampCount(n);
  }

  // No count stated → generate one itinerary.
  return 1;
}

export function parseLocationHint(text: string): string | null {
  const withoutDays = stripDayPhrases(text);
  const match = withoutDays.match(
    /\b(?:around|near|in|for|focused on|featuring|about|covering)\s+([^,.!?]+)/i
  );
  if (match) {
    const hint = match[1]
      .replace(
        /\b(itinerar(?:y|ies)|viewpoints?|spots?|places?|drafts?|attractions?|trip|trips)\b/gi,
        ' '
      )
      .replace(/\s+/g, ' ')
      .trim();
    if (hint.length > 2) return hint;
  }
  return null;
}

/**
 * All place mentions in one prompt: "Tagaytay and Silang" → two hints. Split on
 * and/or/comma, cap at three so a runaway list can't dominate the batch.
 */
export function parseLocationHints(text: string): string[] {
  const withoutDays = stripDayPhrases(text);
  const match = withoutDays.match(
    /\b(?:around|near|in|for|focused on|featuring|about|covering)\s+([^!?]+)/i
  );
  if (!match) return [];

  const rawList = match[1]
    .replace(
      /\b(itinerar(?:y|ies)|viewpoints?|spots?|places?|drafts?|attractions?|trip|trips)\b/gi,
      ' '
    )
    .replace(/\s+/g, ' ');

  const parts = rawList
    .split(/,|\s+and\s+|\s+or\s+|\s*\+\s*|\s*&\s*/i)
    .map((p) => p.replace(/[.]+$/, '').trim())
    .filter((p) => p.length > 2);

  // De-dup on a folded key ("Tagaytay" vs "tagaytay").
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const key = p.toLowerCase().replace(/\s+/g, ' ').trim();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
    if (out.length >= 3) break;
  }
  return out;
}

function clampCount(value: number): number {
  return Math.min(Math.max(Math.round(value), 1), 10);
}

function clampDays(value: unknown): 1 | 2 | 3 {
  const n = Math.round(Number(value));
  return n === 2 || n === 3 ? n : 1;
}

export function dayLabel(days: 1 | 2 | 3): string {
  return `${days}-day`;
}

/** Title-cases a location the parser lifted from a lowercase prompt ("tagaytay" → "Tagaytay"). */
function titleCaseLocation(value: string): string {
  return String(value ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Reply used whenever Kira is unreachable or answers off-format. */
function templateReply(turn: Omit<ChatTurn, 'reply' | 'question'>): string {
  if (turn.intent === 'edit') return 'On it — updating the draft above.';
  if (turn.intent === 'clarify') return 'Could you tell me a bit more about what you want changed?';
  if (turn.intent === 'chat') {
    return 'Tell me where to go and how long — e.g. "Generate a 2-day itinerary around Tagaytay". Mention several places for a mixed route ("Tagaytay and Silang"). Once a draft is up you can say "change stop 2 to 11am", "replace stop 3 with Ilog Maria", "remove stop 4" or "add a coffee shop after stop 2".';
  }
  const place = turn.locations.length
    ? `${turn.locations.map(titleCaseLocation).join(' and ')} `
    : '';
  return turn.count === 1
    ? `Got it. Drafting a ${dayLabel(turn.days)} ${place}itinerary…`
    : `Got it. Drafting ${turn.count} ${dayLabel(turn.days)} ${place}itineraries…`;
}

/** "stop 3" → index, anything else → a name to match against the draft. */
function stopRefFrom(raw: string): StopRef {
  const text = raw.trim();
  const numbered = text.match(/^(?:the\s+)?(\d+)(?:st|nd|rd|th)?$|^stop\s*#?\s*(\d+)$/i);
  if (numbered) return { index: Number(numbered[1] ?? numbered[2]) };
  return { name: text.replace(/^stop\s+/i, '').trim() };
}

const STOP_TARGET = String.raw`(?:stop\s*#?\s*\d+|[^,.!?]+?)`;
/** A clock time only — needs am/pm or a colon, so "3 days" is never read as "3:00". */
const TIME_TOKEN = String.raw`(\d{1,2}:\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?|\d{1,2}\s*(?:a\.?m\.?|p\.?m\.?))`;

/** Words that mean "build me a fresh itinerary", not "edit the current one". */
const NEW_ITINERARY_HINT = /\b(generate|create|draft|build|plan|another|one more|new itinerary)\b/i;
/** Any sign the message asks for a generation at all (vs. a greeting or a question). */
const GENERATE_HINT =
  /\b(generat|creat|make|build|draft|plan|itinerar|trip|tour|route|weekend|getaway|another|more)\b/i;

/** A message with none of these is small talk, not a generation request. */
function looksLikeGenerate(text: string): boolean {
  return (
    GENERATE_HINT.test(text) ||
    /\b\d+\s*-?\s*days?\b/i.test(text) ||
    parseLocationHint(text) != null
  );
}

/** Sanitizes the model's or regex's locations list into 0–3 clean strings. */
function clampLocations(raw: unknown, fallback: string[]): string[] {
  let list: string[] = [];
  if (Array.isArray(raw)) {
    list = raw
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean);
  } else if (typeof raw === 'string' && raw.trim()) {
    list = [raw.trim()];
  }
  if (!list.length) list = fallback;
  return list.slice(0, 3);
}

/**
 * Splits one message into command clauses so several edits can be requested
 * at once: "remove stop 2, add a coffee shop after stop 4 and set stop 1 to 9am".
 * Plain comma splitting would break "set stop 3 to 2pm, not 3pm" — but time
 * expressions rarely survive clause splitting as valid commands anyway, and
 * false negatives are safe (no edit is made).
 */
function splitClauses(text: string): string[] {
  const withoutConj = text.replace(/\s+and\s+then\s+/gi, '; ');
  return withoutConj
    .split(/[;,\n]|\s+and\s+(?=(?:change|set|move|reschedule|shift|make|replace|swap|remove|delete|drop|take out|get rid of|add|insert|include|put)\b)/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * CRUD commands the regex layer understands. Used whenever Kira is unavailable,
 * and to overrule the model when it misfiles a clear command as a generation.
 * One edit per clause, clauses accumulate — medium-complex requests work.
 */
export function parseEditCommands(text: string): DraftEdit[] {
  const edits: DraftEdit[] = [];

  for (const clause of splitClauses(text)) {
    const input = clause.trim();
    let claimed = false;

    const timeMatch = input.match(
      new RegExp(
        String.raw`\b(?:change|set|move|reschedule|shift|make)\s+(${STOP_TARGET})\s+(?:start\s+)?(?:time\s+)?(?:to|at)\s+${TIME_TOKEN}(?:\s*(?:-|–|—|to|until|till)\s*${TIME_TOKEN})?`,
        'i'
      )
    );
    if (timeMatch && normalizeTimeInput(timeMatch[2])) {
      edits.push({
        kind: 'setTime',
        stop: stopRefFrom(timeMatch[1]),
        start: timeMatch[2].trim(),
        end: timeMatch[3]?.trim() || undefined,
      });
      claimed = true;
    }

    const replaceMatch = input.match(
      new RegExp(
        String.raw`\b(?:replace|swap|change)\s+(${STOP_TARGET})\s+(?:with|for|to)\s+([^,.!?]+)`,
        'i'
      )
    );
    if (replaceMatch && !claimed) {
      edits.push({
        kind: 'replaceStop',
        stop: stopRefFrom(replaceMatch[1]),
        venueQuery: replaceMatch[2].trim(),
      });
      claimed = true;
    }

    const removeMatch = input.match(
      new RegExp(
        String.raw`\b(?:remove|delete|drop|take out|get rid of)\s+(${STOP_TARGET})(?:$|[,.!?])`,
        'i'
      )
    );
    if (removeMatch && !claimed) {
      edits.push({ kind: 'removeStop', stop: stopRefFrom(removeMatch[1]) });
      claimed = true;
    }

    // Insert needs an explicit anchor ("after stop 2") — a bare "add X" is too
    // easily confused with "add an itinerary".
    const insertMatch = input.match(
      new RegExp(
        String.raw`\b(?:add|insert|include|put)\s+([^,.!?]+?)\s+(after|following|before)\s+(${STOP_TARGET})(?:$|[,.!?])`,
        'i'
      )
    );
    if (insertMatch && !claimed) {
      const ref = stopRefFrom(insertMatch[3]);
      const before = /^before$/i.test(insertMatch[2]);
      const afterStop =
        before && typeof ref.index === 'number'
          ? ref.index > 1
            ? { index: ref.index - 1 }
            : null
          : ref;
      edits.push({ kind: 'insertStop', venueQuery: insertMatch[1].trim(), afterStop });
    }
  }

  return edits.slice(0, 8);
}

function fallbackTurn(userText: string): ChatTurn {
  const edits = parseEditCommands(userText);
  if (edits.length && !NEW_ITINERARY_HINT.test(userText)) {
    const base = {
      intent: 'edit' as const,
      days: 1 as const,
      count: 1,
      location: null,
      locations: [],
      edits,
      question: null,
    };
    return { ...base, reply: templateReply(base) };
  }

  if (!looksLikeGenerate(userText)) {
    const base = {
      intent: 'chat' as const,
      days: 1 as const,
      count: 1,
      location: null,
      locations: [],
      edits: [],
      question: null,
    };
    return { ...base, reply: templateReply(base) };
  }

  const locations = parseLocationHints(userText);
  const base = {
    intent: 'generate' as const,
    days: parseDays(userText),
    count: parseCount(userText),
    location: locations[0] ?? null,
    locations,
    edits: [],
    question: null,
  };
  return { ...base, reply: templateReply(base) };
}

/** The draft itself is stripped to the line the model needs to answer edits. */
function draftStopLine(stop: AdminItineraryStop, index: number): string {
  const window = stop.timeWindow.replace(/^Day\s+\d+\s*·\s*/i, '');
  const city = stop.establishment?.placeId ? '' : '';
  const bits = [stop.name || stop.venueName, window, stop.costType, stop.expectTag]
    .filter(Boolean)
    .join(' · ');
  return `${city}${index + 1}. ${bits}`;
}

/**
 * The newest unsaved draft is replayed in full (numbered stops) so the model
 * can see what "stop 3" and "the museum" actually are. Older drafts and
 * published ones stay one-liners — prompt budget.
 */
function draftContext(draft: AdminItinerary | null): string {
  if (!draft) return '';
  const lines = draft.stopList
    .slice(0, MAX_DRAFT_STOPS)
    .map((stop, i) => draftStopLine(stop, i));
  const stopsBlock = lines.join('\n');
  const head = `[current unsaved draft: "${draft.title}"${draft.durationLabel ? ` (${draft.durationLabel})` : ''}]`;
  const body = `${head}\n${stopsBlock}`;
  return body.length > MAX_DRAFT_CHARS
    ? `${body.slice(0, MAX_DRAFT_CHARS)}\n…draft truncated`
    : body;
}

/** Drafts replay as one line — the full itinerary JSON would blow the prompt budget. */
function historyLine(message: ChatMessage): string {
  if (message.itineraryDraft) {
    const { title, route } = message.itineraryDraft;
    const state = message.savedItineraryId ? 'published' : 'unsaved draft';
    return `[itinerary preview · ${state}] ${title}${route ? ` — ${route}` : ''}`;
  }
  return message.message.slice(0, MAX_TURN_CHARS);
}

function replayHistory(history: ChatMessage[], currentDraft: AdminItinerary | null): KiraChatMessage[] {
  const lines: KiraChatMessage[] = history
    .slice(-HISTORY_TURNS)
    .map<KiraChatMessage>((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: historyLine(m),
    }))
    .filter((m) => m.content.trim().length > 0);

  const context = draftContext(currentDraft);
  if (context) {
    // The draft rides along as a system note so the model never mistakes it
    // for something the admin said.
    const lastSystem = [...lines].reverse().findIndex((m) => m.role === 'system');
    if (lastSystem === -1) {
      lines.push({ role: 'system', content: context });
    } else {
      lines.splice(lines.length - lastSystem, 0, { role: 'system', content: context });
    }
  }
  return lines;
}

const SYSTEM_PROMPT = [
  'You are the assistant inside the CaviTour admin AI Itinerary Generator.',
  'The admin describes itineraries they want for Cavite, Philippines, and a deterministic',
  'engine then builds them from the published establishment catalog. You do not choose places.',
  '',
  'Your job each turn: write a short friendly reply and extract the parameters.',
  'Set intent to "generate" when the admin is asking for itineraries to be built,',
  'including follow-ups like "make it three days instead" or "one more for Silang".',
  'Set intent to "edit" when they are changing the latest draft: a stop time, or',
  'swapping, removing or adding an establishment. The current unsaved draft is listed',
  'for you as numbered stops in a system message — use those names and numbers.',
  'When an unsaved preview is in the conversation and the admin names or numbers a',
  'stop, that is almost always an edit, not a new generation.',
  'A single message may contain several commands ("remove stop 2, add a coffee shop',
  'after stop 4 and set stop 1 to 9am") — extract one edit per command into edits[].',
  'Set intent to "clarify" when the admin wants an edit but the request is too vague',
  'to act on (e.g. a venue name you cannot match to the draft or catalog, or "stop',
  'after the good one") — put a single specific question in "question" and leave',
  'edits empty. Do not guess in that case. Never use "clarify" for greetings.',
  'Set intent to "chat" for greetings, questions about the tool, or anything else.',
  'Carry unstated parameters over from earlier turns in the conversation.',
  '',
  'days: 1, 2 or 3 only. count: 1 to 10 itineraries. locations: every Cavite city or',
  'municipality the admin mentioned, as an array of names, first-mentioned first.',
  'Use it when several places appear: "Tagaytay and Silang" → ["Tagaytay","Silang"].',
  'Leave locations empty when no place was mentioned. location is the first entry',
  'of locations (or null) — include both for compatibility.',
  'Keep reply under 240 characters. Never promise the itineraries are published —',
  'the admin reviews each preview and clicks "Publish to Itineraries" themselves.',
  '',
  'For intent "edit", fill edits with one or more of these, and leave it empty otherwise.',
  'A stop is addressed by {"index":3} (1-based, per the numbered draft listing) or by',
  '{"name":"Pedro Farms"}:',
  '{"kind":"setTime","stop":{"index":3},"start":"2:00 PM","end":"3:30 PM"}',
  '{"kind":"replaceStop","stop":{"index":2},"venueQuery":"Ilog Maria Honeybee Farms"}',
  '{"kind":"removeStop","stop":{"name":"Pedro Farms"}}',
  '{"kind":"insertStop","afterStop":{"index":1},"venueQuery":"Cornerstone Pottery"}',
  'venueQuery is what the admin typed, verbatim — it may be a name ("Ilog Maria") or',
  'a description ("a coffee shop in Silang"); the engine resolves it, not you.',
  'end is optional; omit it to keep the stop its current length.',
  'Never invent an establishment name the admin did not say.',
  '',
  'Return JSON only (no markdown), shaped exactly like:',
  '{"reply":"...","intent":"generate","days":2,"count":1,"location":"Tagaytay","locations":["Tagaytay","Silang"],"edits":[]}',
].join('\n');

const EDIT_KINDS = new Set(['setTime', 'replaceStop', 'removeStop', 'insertStop']);

function asStopRef(raw: unknown): StopRef | null {
  if (raw == null) return null;
  if (typeof raw === 'number' && Number.isFinite(raw)) return { index: Math.round(raw) };
  if (typeof raw === 'string') return raw.trim() ? { name: raw.trim() } : null;
  if (typeof raw !== 'object') return null;

  const r = raw as { index?: unknown; name?: unknown };
  const index = Number(r.index);
  const name = typeof r.name === 'string' ? r.name.trim() : '';
  if (Number.isFinite(index) && index > 0) return name ? { index, name } : { index };
  return name ? { name } : null;
}

/** The model's edit list is untrusted: keep only well-formed commands. */
function sanitizeEdits(raw: unknown): DraftEdit[] {
  if (!Array.isArray(raw)) return [];

  const out: DraftEdit[] = [];
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Record<string, unknown>;
    const kind = String(e.kind ?? '');
    if (!EDIT_KINDS.has(kind)) continue;

    const stop = asStopRef(e.stop);
    const venueQuery = typeof e.venueQuery === 'string' ? e.venueQuery.trim() : '';

    if (kind === 'setTime') {
      const start = typeof e.start === 'string' ? e.start.trim() : '';
      if (!stop || !normalizeTimeInput(start)) continue;
      const end = typeof e.end === 'string' ? e.end.trim() : '';
      out.push({ kind: 'setTime', stop, start, end: end || undefined });
    } else if (kind === 'replaceStop') {
      if (!stop || !venueQuery) continue;
      out.push({ kind: 'replaceStop', stop, venueQuery });
    } else if (kind === 'removeStop') {
      if (!stop) continue;
      out.push({ kind: 'removeStop', stop });
    } else {
      if (!venueQuery) continue;
      out.push({ kind: 'insertStop', venueQuery, afterStop: asStopRef(e.afterStop) });
    }
  }
  return out;
}

export async function interpretChatTurn(
  history: ChatMessage[],
  userText: string,
  currentDraft: AdminItinerary | null = null
): Promise<ChatTurn> {
  const fallback = fallbackTurn(userText);

  let parsed: Partial<ChatTurn> | null = null;
  try {
    parsed = await kiraChatJson<Partial<ChatTurn>>({
      temperature: 0.3,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...replayHistory(history, currentDraft),
        { role: 'user', content: userText.slice(0, MAX_TURN_CHARS) },
      ],
    });
  } catch {
    // Kira unreachable or out of credit: the regex read is good enough.
    return fallback;
  }

  if (!parsed) return fallback;

  const regexEdits = parseEditCommands(userText);
  const modelEdits = sanitizeEdits(parsed.edits);
  const editsToApply = modelEdits.length ? modelEdits : regexEdits;

  // Trust an unambiguous CRUD command even when the model labels the turn
  // "generate" — otherwise "remove stop 3" would rebuild the whole itinerary.
  const commandOverrides = regexEdits.length > 0 && !NEW_ITINERARY_HINT.test(userText);
  const question = typeof parsed.question === 'string' ? parsed.question.trim() : '';

  let intent: ChatTurn['intent'];
  if (question && parsed.intent === 'clarify') intent = 'clarify';
  else if (parsed.intent === 'clarify') intent = 'chat';
  else if (editsToApply.length && (parsed.intent === 'edit' || commandOverrides)) intent = 'edit';
  else if (parsed.intent === 'edit') intent = 'edit';
  else if (parsed.intent === 'chat') intent = 'chat';
  else if (parsed.intent === 'generate') intent = 'generate';
  else intent = fallback.intent;

  if (intent === 'edit' && editsToApply.length === 0) intent = 'clarify';

  const location = typeof parsed.location === 'string' ? parsed.location.trim() : '';
  const locations = clampLocations(parsed.locations, fallback.locations);
  const primaryLocation = location || locations[0] || null;
  const turn = {
    intent,
    days: parsed.days == null ? fallback.days : clampDays(parsed.days),
    count: intent === 'generate' ? clampCount(Number(parsed.count) || fallback.count) : 1,
    location: intent === 'generate' ? primaryLocation : null,
    locations: intent === 'generate' ? (location && !locations.length ? [location] : locations) : [],
    edits: intent === 'edit' ? editsToApply : [],
    question: intent === 'clarify' ? question || null : null,
  };
  const reply = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';

  return { ...turn, reply: reply || templateReply(turn) };
}
