import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { supabase } from '../lib/supabase';
import { fetchProfileActivity } from '../lib/profileActivity';

function formatVisitDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const d = raw.length <= 10 ? new Date(`${raw}T00:00:00`) : new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function TravelHistoryPage() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data?.user?.id;
        if (!userId) {
          if (!cancelled) setVisits([]);
          return;
        }
        const activity = await fetchProfileActivity(supabase, userId);
        if (!cancelled) setVisits(activity.visits ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load travel history.');
          setVisits([]);
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
    <div className="min-h-screen bg-[#F1F7F6] font-['Poppins',sans-serif]">
      <AppHeader />
      <main className="mx-auto w-full max-w-[1150px] px-4 py-7 sm:px-6 lg:px-8">
        <p className="text-sm">
          <Link to="/profile" className="font-semibold text-[#1B8A70] hover:underline">
            Back to profile
          </Link>
        </p>
        <h1 className="mt-3 font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">Travel history</h1>
        <p className="mt-1 text-sm text-neutral-500">Destinations you reached or checked in to.</p>

        <section className="mt-5 rounded-[28px] bg-white p-5 sm:p-6">
          {loading ? (
            <p className="text-sm text-neutral-500">Loading visits…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : visits.length === 0 ? (
            <p className="text-sm text-neutral-500">No visits yet. Reach a destination or check in to start your history.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {visits.map((visit) => (
                <li key={visit.id}>
                  <Link
                    to={`/place/${encodeURIComponent(visit.placeId)}`}
                    className="flex items-start justify-between gap-3 rounded-[16px] px-1 py-3 transition hover:bg-[#F1F7F6]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{visit.placeName}</p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {[visit.cityMun || 'Cavite', formatVisitDate(visit.createdAt)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        visit.checkedIn ? 'bg-[#D4EFE8] text-[#1B8A70]' : 'bg-[#F1F7F6] text-neutral-600'
                      }`}
                    >
                      {visit.checkedIn ? 'Checked in' : 'Reached'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
