import { useEffect, useState } from 'react';
import { fetchPublishedAnnouncements } from 'cavitour-shared/announcements';
import { AppHeader } from '../components/AppHeader';
import { AnnouncementCard, AnnouncementDetailModal } from '../components/announcementCards';
import { supabase } from '../lib/supabase';

function Skel({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

function AnnouncementsGridSkeleton() {
  return (
    <ul
      className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-4"
      aria-busy="true"
      aria-label="Loading announcements"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <li key={i} className="min-w-0">
          <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80">
            <div className="flex flex-1 flex-col px-3 pb-2.5 pt-2.5 sm:px-3.5 sm:pt-3">
              <Skel className="h-10 w-20" />
              <Skel className="mt-2 h-3 w-28" />
              <Skel className="mt-3 h-5 w-full" />
              <Skel className="mt-1.5 h-5 w-36" />
            </div>
            <Skel className="aspect-[4/3] w-full rounded-none" />
            <Skel className="h-10 w-full rounded-none" />
          </article>
        </li>
      ))}
    </ul>
  );
}

export function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);

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

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {loading ? (
          <AnnouncementsGridSkeleton />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-neutral-500">No announcements yet. Check back soon.</p>
        ) : (
          <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {items.map((item) => (
              <li key={item.id} id={`announcement-${item.id}`} className="min-w-0">
                <AnnouncementCard item={item} onSeeMore={setDetail} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <AnnouncementDetailModal item={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
