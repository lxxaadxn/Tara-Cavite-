import { useEffect, useState } from 'react';
import { fetchPublishedAnnouncements, formatAnnouncementDateLabel } from 'cavitour-shared/announcements';
import { AppHeader } from '../components/AppHeader';
import { supabase } from '../lib/supabase';

function AnnouncementGlyph({ kind }) {
  const common = {
    className: 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.85,
  };
  if (kind === 'advisory') {
    return (
      <svg {...common} className="h-5 w-5 text-[#C47B17]">
        <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
        <path
          d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg {...common} className="h-5 w-5 text-[#1B8A70]">
      <path
        d="M3 11v2a1 1 0 0 0 1 1h1l3 4h2V6H8L5 10H4a1 1 0 0 0-1 1Z"
        strokeLinejoin="round"
      />
      <path d="M15 9a4 4 0 0 1 0 6M18 7a7 7 0 0 1 0 10" strokeLinecap="round" />
    </svg>
  );
}

export function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await fetchPublishedAnnouncements(supabase);
        if (!cancelled) setItems(rows);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load announcements.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading || !items.length) return;
    const id = window.location.hash.replace(/^#/, '');
    if (!id) return;
    const el = document.getElementById(`announcement-${id}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [loading, items]);

  return (
    <div className="min-h-screen bg-neutral-50 font-['Poppins',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="max-w-2xl">
          <h1 className="font-['Poppins',sans-serif] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Announcements
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 sm:text-base">
            Events and travel notices from Cavite LGUs and tourism partners.
          </p>
        </header>

        {loading ? (
          <p className="mt-8 text-sm text-neutral-500">Loading announcements…</p>
        ) : error ? (
          <p className="mt-8 text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-500">No announcements yet. Check back soon.</p>
        ) : (
          <ul className="mt-8 grid list-none grid-cols-1 gap-3 p-0 sm:mt-10 sm:grid-cols-2 lg:grid-cols-2 lg:gap-4">
            {items.map((item) => (
              <li key={item.id} id={`announcement-${item.id}`}>
                <article className="flex h-full items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-neutral-200/90 sm:p-5">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F1F7F6]">
                    <AnnouncementGlyph kind={item.kind} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold leading-snug text-neutral-900 sm:text-base">
                        {item.title}
                      </h2>
                      <p className="text-xs font-medium text-neutral-400">
                        {formatAnnouncementDateLabel(item.publishedAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">{item.place}</p>
                    <p className="mt-2 text-sm leading-relaxed text-neutral-500">{item.body}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
