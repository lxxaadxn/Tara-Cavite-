import { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '../components/AppHeader';
import { ItineraryProductCard } from '../components/ItineraryProductCard';
import { buildEnrichedItinerary } from '../lib/itineraryPlaces';
import { fetchAllPlacesFromSupabase, logPlacesFetchError } from '../lib/placesFromSupabase';
import { supabase } from '../lib/supabase';
import { fetchPublishedItineraries, subscribeItineraries } from 'cavitour-shared/itineraries';

export function ItineraryPage() {
  const [catalog, setCatalog] = useState([]);
  const [published, setPublished] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
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

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <ul className="mt-0 grid list-none grid-cols-1 gap-5 p-0 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {items.map((it) => (
            <li key={it.id} className="flex min-h-0">
              <ItineraryProductCard itinerary={it} to={`/itinerary/${it.id}`} />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
