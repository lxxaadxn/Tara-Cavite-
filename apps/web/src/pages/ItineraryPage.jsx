import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { ItineraryProductCard } from '../components/ItineraryProductCard';
import { buildEnrichedItinerary } from '../lib/itineraryPlaces';
import { fetchAllPlacesFromSupabase, logPlacesFetchError } from '../lib/placesFromSupabase';
import { supabase } from '../lib/supabase';
import { fetchPublishedItineraries, subscribeItineraries } from 'cavitour-shared/itineraries';

function Skel({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200/80 ${className}`} />;
}

function ItineraryGridSkeleton() {
  return (
    <ul
      className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-4"
      aria-busy="true"
      aria-label="Loading itineraries"
    >
      {Array.from({ length: 10 }).map((_, i) => (
        <li key={i} className="min-w-0">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/80">
            <Skel className="aspect-[4/3] w-full rounded-none" />
            <div className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-3.5">
              <Skel className="h-5 w-full" />
              <Skel className="h-4 w-32" />
              <div className="flex gap-1.5">
                <Skel className="h-5 w-14 rounded-full" />
                <Skel className="h-5 w-16 rounded-full" />
              </div>
              <Skel className="mt-auto h-10 w-full rounded-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ItineraryPage() {
  const [catalog, setCatalog] = useState([]);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [places, itineraries] = await Promise.all([
          fetchAllPlacesFromSupabase(supabase, 2000),
          fetchPublishedItineraries(supabase),
        ]);
        if (cancelled) return;
        setCatalog(places);
        setPublished(itineraries);
      } catch (err) {
        logPlacesFetchError('ItineraryPage.fetchCatalog', err);
        if (!cancelled) {
          setCatalog([]);
          setPublished([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const unsub = subscribeItineraries(supabase, () => {
      fetchPublishedItineraries(supabase).then(setPublished).catch(() => {});
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const items = useMemo(
    () => published.map((it) => buildEnrichedItinerary(it, catalog) ?? it),
    [catalog, published]
  );

  return (
    <div className="min-h-screen bg-[#F1F7F6] font-['Poppins',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {loading ? (
          <ItineraryGridSkeleton />
        ) : (
          <ul className="grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {items.map((it) => (
              <li key={it.id} className="min-w-0">
                <ItineraryProductCard itinerary={it} to={`/itinerary/${it.id}`} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
