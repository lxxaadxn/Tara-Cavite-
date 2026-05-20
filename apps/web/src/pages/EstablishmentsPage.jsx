import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { fetchAllPlacesFromSupabase, logPlacesFetchError, rowToPlace } from '../lib/placesFromSupabase';
import { mapDemoEstablishmentRows } from 'cavitour-shared/demoPlaces';
import { AppHeader } from '../components/AppHeader';
import { formatNtdpCategoryTagLabel } from '../lib/ntdpDisplayLabels';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

export function EstablishmentsPage() {
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        let list = await fetchAllPlacesFromSupabase(supabase, 1000);
        if (!list.length) {
          list = mapDemoEstablishmentRows((row) => rowToPlace(row)).filter(Boolean);
        }
        if (!cancelled) setPlaces(list);
      } catch (err) {
        if (!cancelled) {
          logPlacesFetchError('EstablishmentsPage', err);
          const demo = mapDemoEstablishmentRows((row) => rowToPlace(row)).filter(Boolean);
          if (demo.length) {
            setPlaces(demo);
            setError('');
          } else {
            setError(err instanceof Error ? err.message : 'Could not load establishments.');
            setPlaces([]);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...places].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    if (!q) return sorted;
    return sorted.filter((p) => {
      const hay = `${p.name} ${p.address ?? ''} ${p.city_mun ?? ''} ${p.ntdp_category ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [places, search]);

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Inter',sans-serif]">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
        <div className="mb-6">
          <h1 className="font-['Poppins',sans-serif] text-2xl font-semibold tracking-tight text-neutral-900">
            All establishments
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Demo catalog — tap any row to open its <strong>About establishment</strong> page (photos, description,
            and directions).
          </p>
          {!loading && !error ? (
            <p className="mt-1 text-xs font-medium text-[#7ea00e]">
              {filtered.length} of {places.length} shown
            </p>
          ) : null}
        </div>

        <label className="mb-4 block">
          <span className="sr-only">Search establishments</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, city, or category…"
            className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-900 outline-none ring-[#7ea00e]/30 focus:border-[#7ea00e] focus:ring-2"
          />
        </label>

        {loading ? (
          <p className="py-12 text-center text-sm text-neutral-500">Loading Cavite establishments…</p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
        ) : null}

        {!loading && !error ? (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            {filtered.map((place) => (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/place/${place.id}`)}
                  className="flex w-full gap-3 px-3 py-3 text-left transition hover:bg-neutral-50 sm:gap-4 sm:px-4 sm:py-3.5"
                >
                  <img
                    src={place.imageUrl || PLACEHOLDER_IMG}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg object-cover bg-neutral-100 sm:h-16 sm:w-16"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-neutral-900">{place.name}</span>
                    <span className="mt-0.5 block text-xs text-neutral-500 line-clamp-2">
                      {place.city_mun ? `${place.city_mun} · ` : ''}
                      {place.address || 'Cavite'}
                    </span>
                    {place.ntdp_category ? (
                      <span className="mt-1.5 inline-block rounded-full bg-[#7ea00e]/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#5a7a0a]">
                        {formatNtdpCategoryTagLabel(place.ntdp_category)}
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 self-center text-xs font-semibold text-[#7ea00e]">About →</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-neutral-500">No establishments match your search.</li>
            ) : null}
          </ul>
        ) : null}

        <p className="mt-6 text-center text-xs text-neutral-400">
          Also browse on the{' '}
          <Link to="/search" className="font-medium text-[#7ea00e] hover:underline">
            Search
          </Link>{' '}
          map.
        </p>
      </main>
    </div>
  );
}
