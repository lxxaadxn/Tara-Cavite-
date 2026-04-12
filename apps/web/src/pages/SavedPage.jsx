import { useNavigate } from 'react-router-dom';
import { spots } from '../data/spots';
import { AppHeader } from '../components/AppHeader';
const olive = '#7ea00e';
const savedRoutes = [
    {
        name: 'Tinatangi Cafe',
        address: 'Jose Abad Santos Avenue, Brgy. Salawag',
        description: 'A cozy, Instagrammable coffee spot with alfresco seating and signature drinks — perfect for slow afternoons.',
        distanceKm: 22.5,
        durationLabel: '20 min',
        rating: 4.8,
    },
    {
        name: 'Cafe Agapita',
        address: '11 Kapitan Sayas St. Sabutan, Silang',
        description: 'A cozy garden café with a rustic ambiance and hearty breakfast plates surrounded by greenery.',
        distanceKm: 21.5,
        durationLabel: '1 hr 30 min',
        rating: 4.6,
    },
    {
        name: 'Taal Vista Hotel',
        address: 'KM 60 Emilio Aguinaldo Hwy, Tagaytay City',
        description: 'A hillside hotel offering panoramic views of Taal Volcano and elevated dining along the ridge.',
        distanceKm: 20.5,
        durationLabel: '45 min',
        rating: 4.7,
    },
];
export function SavedPage() {
    const navigate = useNavigate();
    return (<div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <div className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 max-w-4xl mx-auto mb-12">
          <div className="flex-1 flex items-center gap-3 bg-white border border-neutral-200 rounded-full px-5 py-3.5 shadow-sm">
            <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="search" placeholder="Enter a tourist spot" className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-neutral-400"/>
          </div>
          <button type="button" className="w-14 h-14 rounded-2xl border border-neutral-200 flex items-center justify-center text-neutral-600" aria-label="Filters">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
            </svg>
          </button>
        </div>

        <section className="mb-16">
          <h2 className="font-['Poppins',sans-serif] font-bold text-2xl text-neutral-900 mb-8">Saved Tourist Spot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {spots.slice(0, 4).map((spot) => (<article key={spot.id} className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="relative aspect-[4/3]">
                  <img src={spot.image} alt="" className="w-full h-full object-cover"/>
                  <span className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow text-red-500">
                    ♥
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-['Poppins',sans-serif] font-bold text-neutral-900">{spot.name}</h3>
                  <p className="text-sm text-neutral-500 mt-1">{spot.address}</p>
                  <button type="button" onClick={() => navigate(`/place/${spot.id}`)} className="mt-4 px-5 py-2 rounded-full font-semibold text-sm text-neutral-900" style={{ backgroundColor: '#dce9a8' }}>
                    Explore
                  </button>
                </div>
              </article>))}
          </div>
        </section>

        <section>
          <h2 className="font-['Poppins',sans-serif] font-bold text-2xl text-neutral-900 mb-8">Saved Routes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {savedRoutes.map((r) => (<article key={r.name} className="rounded-2xl border border-neutral-200 p-5 bg-white shadow-sm">
                <h3 className="font-['Poppins',sans-serif] font-bold text-lg text-neutral-900">{r.name}</h3>
                <p className="flex items-start gap-2 text-sm text-neutral-500 mt-2">
                  <span style={{ color: olive }} aria-hidden>
                    📍
                  </span>
                  {r.address}
                </p>
                <p className="text-sm text-neutral-600 mt-3 leading-relaxed">{r.description}</p>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-neutral-600">
                  <span className="text-red-500">♥</span>
                  <span>📏 {r.distanceKm} km</span>
                  <span>🕐 {r.durationLabel}</span>
                  <span className="text-amber-500">★ {r.rating}</span>
                </div>
              </article>))}
          </div>
        </section>
      </div>
    </div>);
}
