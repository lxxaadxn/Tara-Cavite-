import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  announcementNotificationSummary,
  fetchPublishedAnnouncements,
  groupAnnouncementsByDay,
  markAnnouncementsRead,
} from 'cavitour-shared/announcements';
import { supabase } from '../lib/supabase';

function NotificationGlyph({ kind }) {
  const common = {
    className: 'h-5 w-5',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.85,
  };
  if (kind === 'advisory') {
    return (
      <svg {...common} className="h-5 w-5 text-[#E76365]">
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

function Skel({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

const NOTIFICATION_BODY_WORD_LIMIT = 28;

function truncateWords(text, limit) {
  const raw = String(text ?? '').trim();
  if (!raw) return { text: '', truncated: false };
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= limit) return { text: raw, truncated: false };
  return { text: words.slice(0, limit).join(' '), truncated: true };
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading notifications">
      {[0, 1].map((group) => (
        <section key={group}>
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <Skel className="h-4 w-20" />
            <Skel className="h-3 w-16" />
          </div>
          <ul className="space-y-2">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-start gap-3 rounded-[16px] bg-white px-3 py-3">
                <Skel className="mt-0.5 h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skel className="h-4 w-full" />
                  <Skel className="h-3 w-40 max-w-full" />
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function NotificationsPopover({ onClose }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const rows = await fetchPublishedAnnouncements(supabase);
        if (cancelled) return;
        setGroups(groupAnnouncementsByDay(rows));
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (userId && rows.length) {
          await markAnnouncementsRead(
            supabase,
            userId,
            rows.map((row) => row.id)
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load notifications.');
          setGroups([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="fixed inset-x-3 top-[4.75rem] z-50 overflow-hidden rounded-2xl bg-[#F1F7F6] font-['Poppins',sans-serif] text-[#16352E] shadow-[0_16px_40px_rgba(22,53,46,0.16)] ring-1 ring-neutral-200/80 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[420px] sm:max-w-[min(420px,calc(100vw-2rem))]"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between border-b border-neutral-200/70 px-4 py-3">
        <h2 className="text-base font-semibold">Notifications</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full px-2 py-1 text-xs font-medium text-[#707D7D] hover:bg-white hover:text-[#16352E]"
        >
          Close
        </button>
      </div>

      <div className="max-h-[min(70vh,28rem)] overflow-y-auto px-3 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {loading ? (
          <NotificationsSkeleton />
        ) : error ? (
          <p className="px-1 py-6 text-center text-sm text-red-600">{error}</p>
        ) : groups.length === 0 ? (
          <p className="px-1 py-6 text-center text-sm text-[#707D7D]">No announcements yet.</p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <section key={group.group}>
                <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                  <h3 className="text-sm font-semibold text-[#1B8A70]">{group.group}</h3>
                  <p className="text-[11px] font-medium text-[#707D7D]">{group.timeLabel}</p>
                </div>
                <ul className="space-y-2">
                  {group.items.map((item) => {
                    const bodyPreview = item.body
                      ? truncateWords(item.body, NOTIFICATION_BODY_WORD_LIMIT)
                      : null;
                    return (
                    <li key={item.id}>
                      <Link
                        to={`/announcements#${item.id}`}
                        onClick={onClose}
                        className="flex items-start gap-3 rounded-[16px] bg-white px-3 py-3 transition hover:bg-white/80"
                      >
                        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F7F6]">
                          <NotificationGlyph kind={item.kind} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-normal text-[#16352E]">
                            {announcementNotificationSummary(item)}
                          </p>
                          {bodyPreview ? (
                            <p className="mt-0.5 text-xs font-normal leading-relaxed text-[#707D7D]">
                              {bodyPreview.text}
                              {bodyPreview.truncated ? (
                                <span className="font-semibold text-[#1B8A70]"> see more..</span>
                              ) : null}
                            </p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
