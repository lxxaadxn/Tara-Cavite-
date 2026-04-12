import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { spots, routeStepsDefault } from '../data/spots';
import { AppHeader } from '../components/AppHeader';
import { RouteStepsPanel } from '../components/RouteStepsPanel';
const olive = '#7ea00e';
const teal = '#1f4f59';
const tagStyles = {
    Cafe: 'bg-lime-100 text-lime-900',
    Alfresco: 'bg-sky-100 text-sky-900',
    Cozy: 'text-white',
    Hotel: 'bg-lime-100 text-lime-900',
};
function ReviewCard() {
    return (<div className="rounded-2xl border border-neutral-200 bg-white p-5 flex-shrink-0 w-[280px] sm:w-[300px]">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-neutral-200"/>
        <div>
          <p className="font-['Poppins',sans-serif] font-bold text-sm text-neutral-900">Username</p>
          <p className="text-xs text-amber-500">★★★★☆</p>
          <p className="text-xs text-neutral-500">Ratings 4.5 | 1.3k votes</p>
        </div>
      </div>
      <p className="text-sm text-neutral-600 leading-relaxed line-clamp-4">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore
        magna aliqua.
      </p>
      <button type="button" className="mt-3 text-sm font-semibold hover:underline" style={{ color: olive }}>
        See more
      </button>
    </div>);
}
export function PlaceDetailPage() {
    const { id } = useParams();
    const spot = spots.find((s) => s.id === id) ?? spots[1];
    const [tab, setTab] = useState('description');
    const extras = [
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&q=80',
        'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=400&q=80',
    ];
    return (<div className="min-h-screen flex flex-col bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <main className="max-w-[1320px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Gallery */}
        <div className="rounded-3xl bg-[#f2f2f2] p-3 sm:p-4 mb-8">
          <div className="grid grid-cols-12 gap-3 min-h-[280px] sm:min-h-[380px]">
            <div className="col-span-12 sm:col-span-3 row-span-2 rounded-2xl overflow-hidden min-h-[200px] sm:min-h-0">
              <img src={spot.image} alt="" className="w-full h-full object-cover min-h-[220px] sm:min-h-full"/>
            </div>
            <div className="col-span-12 sm:col-span-5 flex flex-col gap-3 min-h-0">
              <div className="rounded-2xl overflow-hidden h-36 sm:h-40 shrink-0">
                <img src={extras[0]} alt="" className="w-full h-full object-cover"/>
              </div>
              <div className="grid grid-cols-2 gap-3 flex-1 min-h-[100px]">
                <img src={extras[1]} alt="" className="rounded-2xl w-full h-full object-cover"/>
                <img src={spot.image} alt="" className="rounded-2xl w-full h-full object-cover"/>
              </div>
            </div>
            <div className="col-span-12 sm:col-span-4 row-span-2 rounded-2xl overflow-hidden border border-neutral-200 bg-white min-h-[220px]">
              <iframe title="Map" src={`https://www.openstreetmap.org/export/embed.html?bbox=${spot.lng - 0.02}%2C${spot.lat - 0.02}%2C${spot.lng + 0.02}%2C${spot.lat + 0.02}&layer=mapnik&marker=${spot.lat}%2C${spot.lng}`} className="w-full h-full min-h-[220px] sm:min-h-full border-0"/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-8 lg:gap-10">
          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
              <div>
                <h1 className="font-['Poppins',sans-serif] font-bold text-3xl sm:text-4xl text-neutral-900">{spot.name}</h1>
                <p className="text-neutral-500 mt-2 text-sm sm:text-base">
                  {spot.subtitle ?? 'Cozy • Outdoor seating • Great for groups'}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md" style={{ backgroundColor: olive }} aria-label="Save">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                  </svg>
                </button>
                <button type="button" className="w-11 h-11 rounded-full border border-neutral-200 bg-neutral-100 flex items-center justify-center text-neutral-600" aria-label="Share">
                  ↗
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {(spot.tags ?? ['Cafe', 'Alfresco']).map((tag) => (<span key={tag} className={`px-3 py-1.5 rounded-full text-xs font-bold ${tagStyles[tag] ?? 'bg-neutral-200 text-neutral-800'}`} style={tag === 'Cozy' ? { backgroundColor: olive } : undefined}>
                  {tag}
                </span>))}
            </div>

            <div className="border-b border-neutral-200 flex gap-8 mb-6">
              <button type="button" onClick={() => setTab('description')} className="pb-3 font-['Poppins',sans-serif] font-semibold text-sm sm:text-base border-b-2 -mb-px transition-colors" style={{
            color: tab === 'description' ? olive : '#737373',
            borderColor: tab === 'description' ? olive : 'transparent',
        }}>
                Description
              </button>
              <button type="button" onClick={() => setTab('reviews')} className="pb-3 font-['Poppins',sans-serif] font-semibold text-sm sm:text-base border-b-2 -mb-px transition-colors" style={{
            color: tab === 'reviews' ? olive : '#737373',
            borderColor: tab === 'reviews' ? olive : 'transparent',
        }}>
                Reviews
              </button>
            </div>

            {tab === 'description' ? (<div className="prose prose-neutral max-w-none text-neutral-600 leading-relaxed space-y-4">
                <p>
                  {spot.description ??
                'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'}
                </p>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                  Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est
                  laborum.
                </p>
              </div>) : (<div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
                <ReviewCard />
                <ReviewCard />
                <ReviewCard />
              </div>)}
          </div>

          <aside className="lg:sticky lg:top-28 self-start">
            <RouteStepsPanel steps={routeStepsDefault}/>
          </aside>
        </div>

        <p className="mt-10 text-center">
          <Link to="/search" className="text-sm font-medium hover:underline" style={{ color: teal }}>
            ← Back to search
          </Link>
        </p>
      </main>
    </div>);
}
