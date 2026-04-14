import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { spots } from '../data/spots';
import { fetchTrendingPlacesFromSupabase, searchPlacesByText } from '../lib/placesFromSupabase';
import { AppHeader } from '../components/AppHeader';
import { FilterModal } from '../components/FilterModal';
import { PlacesLeafletMap } from '../components/PlacesLeafletMap';

const olive = '#7ea00e';

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';

function mapDemoSpotsToPlaces() {
  return spots.map((s) => ({
    id: s.id,
    name: s.name,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    type: s.tags?.[0] ?? 'Place',
    imageUrl: s.image,
    description: s.description,
    hours: '',
    ntdp_category: null,
  }));
}

export function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [displayPlaces, setDisplayPlaces] = useState([]);
  const [dataSource, setDataSource] = useState('loading');
  const trendingRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchTrendingPlacesFromSupabase(supabase, 200);
        if (cancelled) return;
        trendingRef.current = list;
        if (list.length) {
          setDisplayPlaces(list);
          setDataSource('supabase');
        } else {
          const demo = mapDemoSpotsToPlaces();
          trendingRef.current = demo;
          setDisplayPlaces(demo);
          setDataSource('demo');
        }
      } catch {
        if (cancelled) return;
        const demo = mapDemoSpotsToPlaces();
        trendingRef.current = demo;
        setDisplayPlaces(demo);
        setDataSource('demo');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setDisplayPlaces(trendingRef.current.length ? trendingRef.current : mapDemoSpotsToPlaces());
      return;
    }
    const t = setTimeout(() => {
      searchPlacesByText(supabase, q, 200)
        .then((list) => {
          setDisplayPlaces(list.length ? list : []);
        })
        .catch(() => {});
    }, 380);
    return () => clearTimeout(t);
  }, [search]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const mapPlaces = displayPlaces.filter((p) => p.lat != null && p.lng != null);

  return (
    <div className="min-h-screen flex flex-col bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-4xl mx-auto">
          <div className="flex-1 flex items-center gap-3 bg-white border border-neutral-200 rounded-full px-5 py-3.5 shadow-sm focus-within:ring-2 focus-within:ring-[rgba(126,160,14,0.35)]">
            <svg className="w-5 h-5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search places (Supabase)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-neutral-800 placeholder:text-neutral-400 outline-none text-[15px]"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="shrink-0 w-14 h-14 rounded-2xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shadow-sm"
            aria-label="Open filters"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
              />
            </svg>
          </button>
        </div>
        {dataSource === 'demo' && (
          <p className="text-center text-xs text-amber-800 mt-3 max-w-2xl mx-auto">
            Showing demo spots — run the Cavite STA SQL bundle so <code className="bg-amber-50 px-1 rounded">v_cavite_establishments</code> has data.
          </p>
        )}
      </div>

      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 lg:gap-8 items-start">
          <div className="order-2 lg:order-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayPlaces.length === 0 && (
                <p className="col-span-full text-center text-neutral-500 py-8">No places match your search.</p>
              )}
              {displayPlaces.map((spot) => (
                <article
                  key={spot.id}
                  className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow"
                >
                  <div className="relative aspect-[16/11] bg-neutral-100">
                    <img src={spot.imageUrl || PLACEHOLDER_IMG} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/95 flex items-center justify-center shadow-sm text-red-500 hover:scale-105 transition-transform"
                      aria-label="Save"
                    >
                      ♥
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-['Poppins',sans-serif] font-bold text-neutral-900">{spot.name}</h3>
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{spot.address}</p>
                    {spot.city_mun && (
                      <p className="text-xs text-neutral-400 mt-1">{spot.city_mun}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/place/${spot.id}`)}
                      className="mt-4 px-5 py-2 rounded-full font-['Poppins',sans-serif] font-semibold text-sm text-neutral-900 hover:opacity-95"
                      style={{ backgroundColor: '#dce9a8' }}
                    >
                      Explore
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <p className="text-center text-xs text-neutral-400 pt-4">
              <button type="button" onClick={handleLogout} className="underline hover:text-neutral-600">
                Sign out
              </button>
            </p>
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-[88px]">
            <div className="rounded-[28px] overflow-hidden border border-neutral-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-neutral-100 min-h-[320px] lg:min-h-[calc(100vh-140px)] relative">
              <PlacesLeafletMap places={mapPlaces} onMarkerClick={(p) => navigate(`/place/${p.id}`)} />
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-[500] pointer-events-none">
                <div className="pointer-events-auto flex flex-col rounded-2xl overflow-hidden border border-neutral-200 shadow-lg bg-white text-neutral-600 text-xs px-2 py-1">
                  {mapPlaces.length} on map
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FilterModal open={filtersOpen} onClose={() => setFiltersOpen(false)} />
    </div>
  );
}
