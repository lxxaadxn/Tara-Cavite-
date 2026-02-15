import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { spots } from '../data/spots';

export function SearchPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const handlePinClick = (id: string) => {
    navigate(`/place/${id}`);
  };

  const handleExploreClick = (id: string) => {
    navigate(`/place/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <a href="/search" className="flex items-center">
          <img src="/images/cavitour-logo.png" alt="CaviTour" className="h-8 w-auto" />
        </a>
        <nav className="flex items-center gap-8">
          <span className="text-[var(--cavitour-green)] font-medium border-b-2 border-[var(--cavitour-green)] pb-1">
            Search
          </span>
          <a href="/search" className="text-gray-600 hover:text-gray-900">Routes</a>
          <a href="/search" className="text-gray-600 hover:text-gray-900">Saved</a>
          <a href="/search" className="text-gray-600 hover:text-gray-900">Itineraries</a>
          <button type="button" className="p-2 text-gray-600 hover:text-red-500">♥</button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-9 h-9 rounded-full bg-[var(--cavitour-green)] text-white flex items-center justify-center text-sm font-medium"
          >
            U
          </button>
        </nav>
      </header>

      {/* Search + Filters */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Enter a Tourist Spot"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 max-w-xl px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--cavitour-green)]"
          />
          <button
            type="button"
            className="px-4 py-3 rounded-lg bg-[var(--cavitour-green)] text-white"
          >
            🔍
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {['Near Me', 'Most Popular', 'City', 'Type of Establishment', 'Type of Tourism', 'More'].map(
            (label) => (
              <button
                key={label}
                type="button"
                className="px-4 py-2 rounded-lg bg-[var(--cavitour-green)]/15 text-[var(--cavitour-green)] font-medium text-sm flex items-center gap-1"
              >
                {label} ▾
              </button>
            )
          )}
        </div>
      </div>

      {/* Main: List + Map */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Spot cards */}
        <div className="w-full md:w-[420px] flex-shrink-0 overflow-y-auto p-6 space-y-4 bg-white border-r border-gray-200">
          {spots.map((spot) => (
            <div
              key={spot.id}
              className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="relative aspect-[16/10] bg-gray-100">
                <img
                  src={spot.image}
                  alt={spot.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-red-500"
                >
                  ♥
                </button>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900">{spot.name}</h3>
                <p className="text-sm text-gray-600 mt-0.5">{spot.address}</p>
                <button
                  type="button"
                  onClick={() => handleExploreClick(spot.id)}
                  className="mt-3 w-full py-2 rounded-lg bg-[#d4edda] text-[var(--cavitour-green)] font-medium hover:bg-[#c3e6cb]"
                >
                  Explore
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="w-full py-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 font-medium hover:border-[var(--cavitour-green)] hover:text-[var(--cavitour-green)]"
          >
            ... 10 More
          </button>
        </div>

        {/* Right: Map with clickable pins */}
        <div className="flex-1 relative min-h-[400px] bg-gray-100">
          <iframe
            title="Map"
            src="https://www.openstreetmap.org/export/embed.html?bbox=120.97%2C14.22%2C121.00%2C14.24&layer=mapnik&marker=14.23%2C120.985"
            className="absolute inset-0 w-full h-full border-0"
          />
          {/* Overlay pins so we can click and navigate to place detail (encircled pin = any pin) */}
          {spots.map((spot, i) => (
            <button
              key={spot.id}
              type="button"
              onClick={() => handlePinClick(spot.id)}
              className="absolute w-8 h-8 -translate-x-1/2 -translate-y-full cursor-pointer z-10 hover:scale-110 transition"
              style={{
                left: `${20 + i * 22}%`,
                top: `${35 + (i % 2) * 25}%`,
              }}
              title={spot.name}
            >
              <span className="text-3xl drop-shadow-lg" aria-hidden>📍</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
