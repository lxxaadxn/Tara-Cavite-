import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  buildItinerariesFromTouristAttractionsBatch,
  publishGeneratedItinerary,
  type VenueCandidate,
} from '../lib/adminItineraryGenerator';
import {
  appendChatMessage,
  chatTitleFromPrompt,
  createChatSession,
  fetchChatMessages,
  markDraftSaved,
  renameChatSession,
  updateChatMessageDraft,
  type ChatMessage,
} from '../lib/adminItineraryChats';
import { interpretChatTurn, stopsForDays } from '../lib/itineraryChatAi';
import {
  applyDraftEdits,
  isYouPickAnswer,
  pickFromCandidates,
  type DraftEdit,
  type EditClarification,
} from '../lib/itineraryDraftEdits';
import { useAdminHref } from '../contexts/AdminPathPrefixContext';
import type { AdminItinerary, AdminItineraryStop } from '../lib/adminItineraries';
import styles from './ItineraryAiChat.module.css';

const WELCOME = [
  'Hi! Describe the itineraries you want me to draft.',
  'Try: "Generate a 2-day itinerary around Tagaytay" — you review each draft before it is published.',
];

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

/** Multi-day schedules arrive as "Day 2 · 09:00 AM – 10:30 AM"; the day becomes a group header. */
function splitDayPrefix(value: string): { day: string | null; rest: string } {
  const match = String(value ?? '').match(/^Day\s+(\d+)\s*·\s*/i);
  if (!match) return { day: null, rest: String(value ?? '').trim() };
  return { day: `Day ${match[1]}`, rest: value.slice(match[0].length).trim() };
}

type StopGroup = {
  day: string | null;
  stops: { stop: AdminItineraryStop; index: number }[];
};

function groupStopsByDay(stops: AdminItineraryStop[]): StopGroup[] {
  const groups: StopGroup[] = [];
  stops.forEach((stop, index) => {
    const { day } = splitDayPrefix(stop.timeWindow);
    const current = groups[groups.length - 1];
    if (current && current.day === day) current.stops.push({ stop, index });
    else groups.push({ day, stops: [{ stop, index }] });
  });
  return groups;
}

/**
 * One pending interaction the admin must answer before the chat continues
 * normally: a clarification pick or a plan confirmation. Ephemeral — it lives
 * only in this component, never in chat_messages.
 */
type Pending =
  | { kind: 'clarify'; edits: DraftEdit[]; clarification: EditClarification }
  | { kind: 'confirm'; edits: DraftEdit[] };

const YES_RE = /^(y|yes|yeah|yep|ok|okay|go|go ahead|do it|apply|apply it|confirm|sure|proceed|sounds good|looks good|fine)\b/i;
const NO_RE = /^(n|no|nope|nah|cancel|stop|don'?t|do not|abort|never mind|forget it)\b/i;

function isYes(text: string): boolean {
  return YES_RE.test(text.trim());
}
function isNo(text: string): boolean {
  return NO_RE.test(text.trim());
}

/** Human phrasing for a proposed edit — the plan the admin confirms. */
function editPlanLine(edit: DraftEdit): string {
  const stop = edit.kind === 'setTime' || edit.kind === 'replaceStop' || edit.kind === 'removeStop'
    ? edit.stop
    : null;
  const where =
    stop == null
      ? ''
      : typeof stop.index === 'number'
        ? `stop ${stop.index}`
        : `"${stop.name}"`;
  switch (edit.kind) {
    case 'setTime':
      return `Move ${where} to ${edit.start}${edit.end ? `–${edit.end}` : ''}`;
    case 'replaceStop':
      return `Replace ${where} with "${edit.venueQuery}"`;
    case 'removeStop':
      return `Remove ${where}`;
    case 'insertStop': {
      const anchor =
        edit.afterStop == null
          ? 'the end'
          : typeof edit.afterStop.index === 'number'
            ? `stop ${edit.afterStop.index}`
            : `"${edit.afterStop.name}"`;
      return `Add "${edit.venueQuery}" after ${anchor}`;
    }
  }
}

function clarifyMessage(clarification: EditClarification): string {
  const lines = clarification.candidates.map(
    (v, i) => `${i + 1}. ${v.name}${v.city ? ` (${v.city})` : ''}`
  );
  return [
    `"${clarification.venueQuery}" can mean several places:`,
    ...lines,
    'Reply with a number or the full name — or say "you pick" and I will choose the closest match.',
  ].join('\n');
}

function ItineraryDraftCard({
  message,
  draft,
  onPublished,
}: {
  message: ChatMessage;
  draft: AdminItinerary;
  onPublished: (messageId: string, itineraryId: string) => void;
}) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editHref = useAdminHref(`/web/itineraries/created/${message.savedItineraryId ?? ''}/edit`);
  const published = Boolean(message.savedItineraryId);
  // The generator falls back to route for an unusable subtitle, which reads as a duplicate.
  const showSubtitle =
    Boolean(draft.subtitle.trim()) &&
    draft.subtitle.trim().toLowerCase() !== draft.route.trim().toLowerCase();

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const itineraryId = await publishGeneratedItinerary(draft);
      await markDraftSaved(message.id, itineraryId);
      onPublished(message.id, itineraryId);
    } catch (e) {
      setError(errorText(e, 'Could not publish this itinerary.'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <article className={styles.card}>
      <header className={styles.cardHead}>
        <span className={published ? styles.badgeSaved : styles.badge}>
          {published ? 'Published' : 'Draft · AI generated'}
        </span>
        <div className={styles.titleRow}>
          <h4 className={styles.cardTitle}>{draft.title}</h4>
          {draft.durationLabel ? (
            <span className={styles.durationPill}>{draft.durationLabel}</span>
          ) : null}
        </div>
        {showSubtitle ? <p className={styles.cardSub}>{draft.subtitle}</p> : null}
        {draft.route ? <p className={styles.cardRoute}>{draft.route}</p> : null}
        {draft.tags.length ? (
          <ul className={styles.tagRow}>
            {draft.tags.map((tag) => (
              <li key={tag} className={styles.tag}>
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className={styles.schedule}>
        {groupStopsByDay(draft.stopList).map((group) => (
          <section key={group.day ?? 'all'} className={styles.dayGroup}>
            {group.day ? <h5 className={styles.dayHead}>{group.day}</h5> : null}
            <ol className={styles.stops}>
              {group.stops.map(({ stop, index }) => {
                const time = splitDayPrefix(stop.timeWindow).rest;
                const meta = [
                  splitDayPrefix(stop.durationHint).rest,
                  stop.costType,
                  stop.expectTag,
                ].filter(Boolean);
                return (
                  <li key={stop.clientId || `${stop.name}-${index}`} className={styles.stop}>
                    <span className={styles.stopIndex} aria-hidden>
                      {index + 1}
                    </span>
                    <div className={styles.stopBody}>
                      <span className={styles.stopName}>{stop.name || stop.venueName}</span>
                      <span className={styles.stopMeta}>
                        {time ? <span className={styles.stopTime}>{time}</span> : null}
                        {meta.length ? <span>{meta.join(' · ')}</span> : null}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      {error ? <p className={styles.cardError}>{error}</p> : null}

      <footer className={styles.cardFoot}>
        {published ? (
          <Link to={editHref} className={styles.savedLink}>
            Open in Itineraries
          </Link>
        ) : (
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => void publish()}
            disabled={publishing}
          >
            {publishing ? 'Publishing…' : 'Publish to Itineraries'}
          </button>
        )}
      </footer>
    </article>
  );
}

/**
 * The updated draft as a centered modal, opened automatically whenever an edit
 * changes the draft so the admin never scrolls back to review it. The same
 * ItineraryDraftCard renders inside, so publishing works from either place.
 */
function DraftModal({
  message,
  draft,
  onClose,
  onPublished,
}: {
  message: ChatMessage;
  draft: AdminItinerary;
  onClose: () => void;
  onPublished: (messageId: string, itineraryId: string) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={styles.modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-label="Updated itinerary draft"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalDialog}>
        <header className={styles.modalHead}>
          <h3 className={styles.modalTitle}>Updated draft</h3>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close draft preview">
            ×
          </button>
        </header>
        <ItineraryDraftCard message={message} draft={draft} onPublished={onPublished} />
      </div>
    </div>
  );
}

type Props = {
  /** Null until the first message creates one. */
  sessionId: string | null;
  onSessionCreated?: (sessionId: string) => void;
  /** Fires after each turn so the history rail can re-sort. */
  onActivity?: () => void;
  fullPage?: boolean;
};

export function ItineraryAiChat({ sessionId, onSessionCreated, onActivity, fullPage = false }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  /** Ephemeral: never written to chat_messages. */
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** A clarify pick or a plan confirmation awaiting the admin's answer. */
  const [pending, setPending] = useState<Pending | null>(null);
  /** The draft modal, opened automatically after a successful edit. */
  const [modalDraft, setModalDraft] = useState<{ message: ChatMessage; draft: AdminItinerary } | null>(
    null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  /** Guards the reload that would otherwise wipe an in-flight turn when a session is born. */
  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (sessionId === loadedIdRef.current) return;
    loadedIdRef.current = sessionId;
    setError(null);
    setProgress(null);
    setPending(null);
    setModalDraft(null);

    if (!sessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchChatMessages(sessionId)
      .then((rows) => {
        if (!cancelled) setMessages(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e, 'Could not load this conversation.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, progress]);

  const ensureSession = async (firstPrompt: string): Promise<string> => {
    if (sessionId) return sessionId;
    const created = await createChatSession(chatTitleFromPrompt(firstPrompt));
    loadedIdRef.current = created;
    onSessionCreated?.(created);
    return created;
  };

  const push = async (
    id: string,
    input: { sender: 'user' | 'assistant'; message: string; itineraryDraft?: AdminItinerary | null }
  ) => {
    const row = await appendChatMessage(id, input);
    setMessages((prev) => [...prev, row]);
    return row;
  };

  /** The newest preview that has not been published yet, if any. */
  const unsavedDraft = (): ChatMessage | null => {
    const drafts = messages.filter((m) => m.itineraryDraft);
    return [...drafts].reverse().find((m) => !m.savedItineraryId) ?? null;
  };

  /** Applies an edit batch to the newest unsaved draft and reads the changes back. */
  const runEdits = async (
    id: string,
    edits: DraftEdit[],
    options: {
      resolvedPick?: { venueQuery: string; venue: VenueCandidate; autoPicked: boolean } | null;
    } = {}
  ) => {
    const target = unsavedDraft();

    if (!target) {
      const drafts = messages.filter((m) => m.itineraryDraft);
      await push(id, {
        sender: 'assistant',
        message: drafts.length
          ? 'That itinerary is already published, so edits belong in the itinerary editor — open it from the card above.'
          : "There's no itinerary draft in this chat yet. Ask me to generate one, then I can move stops around or swap places.",
      });
      return;
    }

    setProgress('Updating the draft…');
    let result;
    try {
      result = await applyDraftEdits(
        target.itineraryDraft as AdminItinerary,
        edits,
        options.resolvedPick ?? null
      );
    } finally {
      setProgress(null);
    }

    if (result.clarification) {
      setPending({ kind: 'clarify', edits, clarification: result.clarification });
      await push(id, { sender: 'assistant', message: clarifyMessage(result.clarification) });
      return;
    }

    if (result.changed) {
      await updateChatMessageDraft(target.id, result.draft);
      const updated: ChatMessage = {
        ...target,
        itineraryDraft: result.draft,
        message: result.draft.title,
      };
      setMessages((prev) => prev.map((m) => (m.id === target.id ? updated : m)));
      // The fresh draft pops up so the admin reviews it without scrolling back.
      setModalDraft({ message: updated, draft: result.draft });
      if (options.resolvedPick?.autoPicked) {
        result.notes.unshift(`Picked ${options.resolvedPick.venue.name} as the closest match.`);
      } else if (options.resolvedPick) {
        result.notes.unshift(`Using ${options.resolvedPick.venue.name} for "${options.resolvedPick.venueQuery}".`);
      }
    }

    await push(id, {
      sender: 'assistant',
      message: result.notes.join(' ') || 'Nothing in the draft changed.',
    });
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    setInput('');
    setBusy(true);
    setError(null);

    try {
      const id = await ensureSession(text);
      const history = messages;
      await push(id, { sender: 'user', message: text });

      // A pending interaction owns the next plain-language answer.
      if (pending) {
        const active = pending;
        setPending(null);

        if (active.kind === 'confirm') {
          if (isYes(text)) {
            await runEdits(id, active.edits);
          } else if (isNo(text)) {
            await push(id, {
              sender: 'assistant',
              message: 'Plan discarded — the draft is unchanged.',
            });
          } else {
            await push(id, {
              sender: 'assistant',
              message:
                'I did not catch that. Say "yes" to apply the plan or "no" to drop it — you can also describe the changes again.',
            });
            setPending(active);
          }
          return;
        }

        // Pending clarify: number, name, "you pick", or cancel.
        const candidates = active.clarification.candidates;
        const picked = pickFromCandidates(text, candidates);
        if (isNo(text)) {
          await push(id, {
            sender: 'assistant',
            message: 'No problem — nothing was changed. Describe the edit again when ready.',
          });
          return;
        }
        if (picked || isYouPickAnswer(text)) {
          const resolvedPick = picked
            ? {
                venueQuery: active.clarification.venueQuery,
                venue: picked.venue,
                autoPicked: false,
              }
            : {
                venueQuery: active.clarification.venueQuery,
                venue: candidates[0],
                autoPicked: true,
              };
          await runEdits(id, active.edits, { resolvedPick });
          return;
        }
        // Not an answer to the clarification — fall through to a normal turn,
        // but keep the pending question alive unless the admin clearly moved on
        // to a new request.
        setPending(active);
      }

      const draft = unsavedDraft();
      const turn = await interpretChatTurn(
        history,
        text,
        draft ? (draft.itineraryDraft as AdminItinerary) : null
      );

      // An edit's confirmation is the change summary from runEdits, so it does
      // not also get the generic acknowledgement bubble.
      if (turn.intent === 'edit') {
        // Plan-then-apply: multi-edit or destructive batches wait for a "yes".
        const needsConfirm = turn.edits.length >= 2 || turn.edits.some((e) => e.kind === 'removeStop');
        if (needsConfirm) {
          const plan = turn.edits.map((e, i) => `${i + 1}. ${editPlanLine(e)}`).join('\n');
          setPending({ kind: 'confirm', edits: turn.edits });
          await push(id, {
            sender: 'assistant',
            message: `Here is what I will do:\n${plan}\nReply "yes" to apply or "no" to cancel.`,
          });
          return;
        }
        await runEdits(id, turn.edits);
        return;
      }

      if (turn.intent === 'clarify' && turn.question) {
        await push(id, { sender: 'assistant', message: turn.question });
        return;
      }

      await push(id, { sender: 'assistant', message: turn.reply });

      if (turn.intent === 'chat') return;

      setProgress(`Drafting 1/${turn.count}…`);
      const { rows, matchedLocations, matchedLocation, spellingCorrected } =
        await buildItinerariesFromTouristAttractionsBatch({
          count: turn.count,
          stopsPerItinerary: stopsForDays(turn.days),
          days: turn.days,
          status: 'draft',
          locationHint: turn.location,
          locationHints: turn.locations,
          onProgress: (p) => setProgress(`Drafting ${Math.min(p.built + 1, p.total)}/${p.total}…`),
        });
      setProgress(null);

      if (rows.length === 0) {
        await push(id, {
          sender: 'assistant',
          message:
            'No itineraries could be drafted. Check that enough published establishments have map coordinates.',
        });
        return;
      }

      // The rail reads better as the itinerary than as the raw prompt. Only the
      // session's first generation renames it, so later batches leave it alone.
      if (!history.some((m) => m.itineraryDraft)) {
        await renameChatSession(id, rows[0].title);
      }

      for (const row of rows) {
        await push(id, { sender: 'assistant', message: row.title, itineraryDraft: row });
      }

      const places = matchedLocations?.length ? matchedLocations : matchedLocation ? [matchedLocation] : [];
      const matchNote = places.length
        ? ` Drawn from ${places.join(' and ')}.${spellingCorrected ? ' (Matched from your spelling.)' : ''}`
        : '';
      await push(id, {
        sender: 'assistant',
        message: `${rows.length} preview${rows.length === 1 ? '' : 's'} ready.${matchNote} Review each one and click Publish to Itineraries to add it to the live catalog.`,
      });
    } catch (e) {
      setError(errorText(e, 'Could not generate itineraries.'));
    } finally {
      setProgress(null);
      setBusy(false);
      onActivity?.();
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

  const onPublished = (messageId: string, itineraryId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, savedItineraryId: itineraryId } : m))
    );
  };

  const showWelcome = !loading && messages.length === 0;

  return (
    <section
      className={`${styles.panel} ${fullPage ? styles.fullPage : ''}`}
      aria-label="AI itinerary generator"
    >
      <header className={styles.header}>
        <span className={styles.headerIcon} aria-hidden>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </span>
        <div className={styles.headerText}>
          <h3>AI Itinerary Generator</h3>
          <p>Describe what to build — each draft is published only when you say so.</p>
        </div>
      </header>

      <div ref={scrollRef} className={styles.messages} role="log" aria-live="polite">
        {loading ? <div className={`${styles.bubble} ${styles.bot}`}>Loading conversation…</div> : null}

        {showWelcome
          ? WELCOME.map((text) => (
              <div key={text} className={`${styles.bubble} ${styles.bot}`}>
                {text}
              </div>
            ))
          : null}

        {messages.map((m) =>
          m.itineraryDraft ? (
            <ItineraryDraftCard
              key={m.id}
              message={m}
              draft={m.itineraryDraft}
              onPublished={onPublished}
            />
          ) : (
            <div
              key={m.id}
              className={`${styles.bubble} ${m.sender === 'user' ? styles.user : styles.bot}`}
            >
              {m.message}
            </div>
          )
        )}

        {progress ? <div className={`${styles.bubble} ${styles.bot}`}>{progress}</div> : null}
        {error ? <div className={`${styles.bubble} ${styles.bot} ${styles.error}`}>{error}</div> : null}
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          placeholder={
            busy
              ? 'Drafting…'
              : pending?.kind === 'clarify'
                ? 'Reply with a number, a name, or "you pick"'
                : pending?.kind === 'confirm'
                  ? 'Say "yes" to apply, or "no" to cancel'
                  : 'e.g. Generate a 2-day itinerary around Tagaytay'
          }
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Describe itineraries to generate"
        />
        <button type="submit" className={styles.sendBtn} disabled={busy || !input.trim()}>
          Send
        </button>
      </form>

      {modalDraft ? (
        <DraftModal
          message={modalDraft.message}
          draft={modalDraft.draft}
          onClose={() => setModalDraft(null)}
          onPublished={onPublished}
        />
      ) : null}
    </section>
  );
}
