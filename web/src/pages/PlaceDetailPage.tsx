import { useParams, Link } from 'react-router-dom';
import { spots } from '../data/spots';

const routeSteps = [
  { title: 'PITX - Dasmariñas', sub: 'Gate 1, 2nd Floor', tag: 'Bus' },
  { title: 'Salitran - Central Mall Dasmariñas', sub: 'Drop Off' },
  { title: 'Salitran - Tricycle (Brown)', sub: 'Tinatangi Cafe', tag: 'Tricycle' },
  { title: 'Tinatangi Cafe', sub: 'Arrive at destination' },
];

export function PlaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const spot = spots.find((s) => s.id === id) ?? spots[1]; // default Tinatangi Cafe style

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link to="/search" className="flex items-center">
          <img src="/images/cavitour-logo.png" alt="CaviTour" className="h-8 w-auto" />
        </Link>
        <nav className="flex items-center gap-8">
          <Link to="/search" className="text-[var(--cavitour-green)] font-medium border-b-2 border-[var(--cavitour-green)] pb-1">
            Search
          </Link>
          <a href="/search" className="text-gray-600 hover:text-gray-900">Routes</a>
          <a href="/search" className="text-gray-600 hover:text-gray-900">Saved</a>
          <a href="/search" className="text-gray-600 hover:text-gray-900">Itineraries</a>
          <button type="button" className="p-2 text-gray-600">♥</button>
          <div className="w-9 h-9 rounded-full bg-gray-300" />
        </nav>
      </header>

      <div className="flex-1 flex gap-8 p-6 max-w-7xl mx-auto w-full">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Gallery + small map */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="col-span-2 row-span-2 rounded-xl overflow-hidden bg-gray-200 aspect-[2/1]">
              <img src={spot.image} alt={spot.name} className="w-full h-full object-cover" />
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-200 aspect-square">
              <img
                src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200&q=80"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-200 aspect-square">
              <img
                src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200&q=80"
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div className="col-span-2 rounded-xl overflow-hidden bg-gray-200 aspect-video">
              <iframe
                title="Location map"
                src="https://www.openstreetmap.org/export/embed.html?bbox=120.98%2C14.22%2C121.00%2C14.24&layer=mapnik"
                className="w-full h-full border-0"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">{spot.name}</h1>
          <ul className="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
            {['Cozy', 'Outdoor Seating', 'Free WiFi', 'Pet Friendly'].map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 mb-4">
            {(spot.tags ?? ['Cafe', 'Alfresco', 'Cozy']).map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-sm"
              >
                {tag}
              </span>
            ))}
            <button type="button" className="p-2 text-gray-500 hover:text-gray-700">⊕</button>
            <button type="button" className="p-2 text-gray-500 hover:text-gray-700">↗</button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-4">
            <span className="inline-block pb-2 border-b-2 border-[var(--cavitour-green)] text-[var(--cavitour-green)] font-medium pr-6">
              Description
            </span>
            <button type="button" className="pb-2 text-gray-500 font-medium pr-6 hover:text-gray-700">
              Menu
            </button>
            <button type="button" className="pb-2 text-gray-500 font-medium hover:text-gray-700">
              Reviews
            </button>
          </div>
          <p className="text-gray-600 leading-relaxed">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
            ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation
            ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
          </p>
        </div>

        {/* Right: Route Steps */}
        <aside className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
            <h2 className="font-semibold text-gray-900 mb-4">Route Steps</h2>
            <div className="relative pl-4 border-l-2 border-[var(--cavitour-green)] space-y-6">
              {routeSteps.map((step, i) => (
                <div key={i} className="relative -left-[21px]">
                  <div className="w-3 h-3 rounded-full bg-[var(--cavitour-green)] absolute top-1.5" />
                  <div className="pl-4">
                    <p className="font-medium text-gray-900">{step.title}</p>
                    <p className="text-sm text-gray-600">{step.sub}</p>
                    {step.tag && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-[var(--cavitour-green)]/20 text-[var(--cavitour-green)] text-xs font-medium">
                        {step.tag}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
