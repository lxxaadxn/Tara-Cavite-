import { useEffect, useRef, useState, type FormEvent } from 'react';
import { generateItinerariesFromTouristAttractionsBatch } from '../lib/adminItineraryGenerator';
import styles from './ItineraryAiChat.module.css';

type Message = {
  key: string;
  role: 'bot' | 'user';
  text: string;
  error?: boolean;
};

const WELCOME: Message[] = [
  {
    key: 'welcome-1',
    role: 'bot',
    text: 'Hi! Describe the itineraries you want me to generate.',
  },
  {
    key: 'welcome-2',
    role: 'bot',
    text: 'Try: "Generate a 2-day itinerary around Tagaytay"',
  },
];

const DAY_WORD_TO_NUM: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
};

function nextKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Strip day-count phrases so they don't become itinerary counts or location text. */
function stripDayPhrases(text: string): string {
  return text
    .replace(/\b(\d+|one|two|three)\s*-?\s*days?\b/gi, ' ')
    .replace(/\b(\d+|one|two|three)\s*-?\s*day\s+(?:trip|tour|itinerary|itineraries)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseDays(text: string): 1 | 2 | 3 {
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
function stopsForDays(days: 1 | 2 | 3): number {
  if (days === 1) return 5;
  if (days === 2) return 9;
  return 13;
}

function parseCount(text: string, _days: 1 | 2 | 3): number {
  const forCount = stripDayPhrases(text);
  const words: Record<string, number> = {
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
    const n = /^\d+$/.test(raw) ? Number.parseInt(raw, 10) : words[raw];
    if (Number.isFinite(n)) return Math.min(Math.max(n, 1), 10);
  }

  // No count stated → generate one itinerary.
  return 1;
}

function parseLocationHint(text: string): string | null {
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

type Props = {
  onCreated?: () => void;
  fullPage?: boolean;
};

export function ItineraryAiChat({ onCreated, fullPage = false }: Props) {
  const [messages, setMessages] = useState<Message[]>(WELCOME);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const progressKeyRef = useRef<string | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const upsertProgress = (text: string) => {
    const key = progressKeyRef.current ?? nextKey('progress');
    progressKeyRef.current = key;
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.key === key);
      const next: Message = { key, role: 'bot', text };
      if (idx === -1) return [...prev, next];
      return prev.map((m, i) => (i === idx ? next : m));
    });
  };

  const send = async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;

    const days = parseDays(text);
    const count = parseCount(text, days);
    const stopsPerItinerary = stopsForDays(days);
    const location = parseLocationHint(text);
    const dayLabel = days === 1 ? '1-day' : `${days}-day`;

    setInput('');
    setBusy(true);
    progressKeyRef.current = null;

    setMessages((prev) => [...prev, { key: nextKey('user'), role: 'user', text }]);

    const intro = location
      ? `Got it. Creating ${count} draft${count === 1 ? '' : 's'} for a ${dayLabel} ${location} trip…`
      : `Got it. Creating ${count} draft${count === 1 ? '' : 's'} for a ${dayLabel} trip from the published catalog…`;

    setMessages((prev) => [...prev, { key: nextKey('bot'), role: 'bot', text: intro }]);

    try {
      const { createdIds, matchedLocation, spellingCorrected } =
        await generateItinerariesFromTouristAttractionsBatch({
          count,
          stopsPerItinerary,
          days,
          status: 'draft',
          locationHint: location,
          onProgress: (p) => upsertProgress(`Generating ${p.created}/${p.total}…`),
        });

      const progressKey = progressKeyRef.current;
      progressKeyRef.current = null;

      if (createdIds.length === 0) {
        setMessages((prev) => [
          ...prev.filter((m) => m.key !== progressKey),
          {
            key: nextKey('bot'),
            role: 'bot',
            text: 'No itineraries were generated. Check that enough published establishments have map coordinates.',
            error: true,
          },
        ]);
      } else {
        const matchNote =
          spellingCorrected && matchedLocation
            ? ` Matched ${matchedLocation} from your spelling.`
            : '';
        setMessages((prev) => [
          ...prev.filter((m) => m.key !== progressKey),
          {
            key: nextKey('bot'),
            role: 'bot',
            text: `Done! Created ${createdIds.length} draft itinerary${createdIds.length === 1 ? '' : 's'}.${matchNote} View them in the Itineraries tab.`,
          },
        ]);
        onCreated?.();
      }
    } catch (e) {
      const progressKey = progressKeyRef.current;
      progressKeyRef.current = null;
      setMessages((prev) => [
        ...prev.filter((m) => m.key !== progressKey),
        {
          key: nextKey('bot'),
          role: 'bot',
          text: e instanceof Error ? e.message : 'Could not generate itineraries.',
          error: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(input);
  };

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
          <p>Describe what to build — drafts are saved automatically.</p>
        </div>
      </header>

      <div ref={scrollRef} className={styles.messages} role="log" aria-live="polite">
        {messages.map((m) => (
          <div
            key={m.key}
            className={`${styles.bubble} ${m.role === 'user' ? styles.user : styles.bot} ${
              m.error ? styles.error : ''
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      <form className={styles.composer} onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          placeholder={busy ? 'Generating…' : 'e.g. Generate a 2-day itinerary around Tagaytay'}
          disabled={busy}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Describe itineraries to generate"
        />
        <button type="submit" className={styles.sendBtn} disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
