import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { spots } from '../data/spots';
import { AppHeader } from '../components/AppHeader';
import { FilterModal } from '../components/FilterModal';
const olive = '#7ea00e';
export function SearchPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q)
            return spots;
        return spots.filter((s) => s.name.toLowerCase().includes(q) ||
            s.address.toLowerCase().includes(q) ||
            (s.tags?.some((t) => t.toLowerCase().includes(q)) ?? false));
    }, [search]);
    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/';
    };
    return (<div className="min-h-screen flex flex-col bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-4xl mx-auto">
          <div className="flex-1 flex items-center gap-3 bg-white border border-neutral-200 rounded-full px-5 py-3.5 shadow-sm focus-within:ring-2 focus-within:ring-[rgba(126,160,14,0.35)]">
            <svg className="w-5 h-5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="search" placeholder="Enter a tourist spot" value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1 min-w-0 bg-transparent text-neutral-800 placeholder:text-neutral-400 outline-none text-[15px]"/>
          </div>
          <button type="button" onClick={() => setFiltersOpen(true)} className="shrink-0 w-14 h-14 rounded-2xl border border-neutral-200 bg-white flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shadow-sm" aria-label="Open filters">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 lg:gap-8 items-start">
          <div className="order-2 lg:order-1 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filtered.map((spot) => (<article key={spot.id} className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow">
                  <div className="relative aspect-[16/11] bg-neutral-100">
                    <img src={spot.image} alt="" className="w-full h-full object-cover"/>
                    <button type="button" className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/95 flex items-center justify-center shadow-sm text-red-500 hover:scale-105 transition-transform" aria-label="Save">
                      ♥
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-['Poppins',sans-serif] font-bold text-neutral-900">{spot.name}</h3>
                    <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{spot.address}</p>
                    <button type="button" onClick={() => navigate(`/place/${spot.id}`)} className="mt-4 px-5 py-2 rounded-full font-['Poppins',sans-serif] font-semibold text-sm text-neutral-900 hover:opacity-95" style={{ backgroundColor: '#dce9a8' }}>
                      Explore
                    </button>
                  </div>
                </article>))}
            </div>
            <div className="flex justify-center pt-2">
              <button type="button" className="px-8 py-3 rounded-2xl font-medium text-neutral-700 bg-sky-100/80 hover:bg-sky-100 border border-sky-200/60">
                … 10 More
              </button>
            </div>
            <p className="text-center text-xs text-neutral-400 pt-4">
              <button type="button" onClick={handleLogout} className="underline hover:text-neutral-600">
                Sign out
              </button>
            </p>
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-[88px]">
            <div className="rounded-[28px] overflow-hidden border border-neutral-200 shadow-[0_8px_40px_rgba(0,0,0,0.08)] bg-neutral-100 min-h-[320px] lg:min-h-[calc(100vh-140px)] relative">
              <iframe title="Map" src="https://www.openstreetmap.org/export/embed.html?bbox=120.96%2C14.20%2C121.02%2C14.28&layer=mapnik" className="absolute inset-0 w-full h-full border-0 min-h-[420px] lg:min-h-[560px]"/>
              {filtered.map((spot, i) => (<button key={spot.id} type="button" onClick={() => navigate(`/place/${spot.id}`)} className="absolute z-10 w-9 h-9 -translate-x-1/2 -translate-y-full flex items-end justify-center hover:scale-110 transition-transform drop-shadow-lg" style={{
                left: `${18 + (i * 17) % 55}%`,
                top: `${28 + ((i * 13) % 40)}%`,
            }} title={spot.name}>
                  <span className="text-[28px] leading-none" style={{ color: olive }} aria-hidden>
                    📍
                  </span>
                </button>))}
              <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20 pointer-events-none">
                <div className="pointer-events-auto flex flex-col rounded-2xl overflow-hidden border border-neutral-200 shadow-lg bg-white">
                  <button type="button" className="w-11 h-11 text-lg font-light hover:bg-neutral-50 border-b border-neutral-100">
                    +
                  </button>
                  <button type="button" className="w-11 h-11 text-lg font-light hover:bg-neutral-50">
                    −
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FilterModal open={filtersOpen} onClose={() => setFiltersOpen(false)}/>
    </div>);
}
