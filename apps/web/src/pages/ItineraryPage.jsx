import { AppHeader } from '../components/AppHeader';
import { publishedItineraries } from '../data/mockItineraries';
const olive = '#7ea00e';
const slate = '#1f4f59';
export function ItineraryPage() {
    return (<div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-10 max-w-3xl">
              <div className="flex-1 flex items-center gap-3 bg-white border border-neutral-200 rounded-full px-5 py-3.5 shadow-sm">
                <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="search" placeholder="Enter a tourist spot" className="flex-1 bg-transparent outline-none text-[15px]"/>
              </div>
              <button type="button" className="w-14 h-14 rounded-2xl border border-neutral-200 flex items-center justify-center" aria-label="Filters">
                <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                </svg>
              </button>
            </div>

            <h2 className="font-['Poppins',sans-serif] font-bold text-2xl text-neutral-900 mb-8">Published Itineraries</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {publishedItineraries.map((it) => (<article key={it.id} className="rounded-2xl border border-neutral-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-[16/10] bg-neutral-100">
                    <img src={it.image} alt="" className="w-full h-full object-cover"/>
                  </div>
                  <div className="p-5">
                    <h3 className="font-['Poppins',sans-serif] font-bold text-lg text-neutral-900">{it.title}</h3>
                    <p className="text-sm text-neutral-500 mt-1">{it.route}</p>
                    <button type="button" className="mt-4 w-full sm:w-auto px-6 py-2.5 rounded-full font-['Poppins',sans-serif] font-semibold text-sm text-neutral-900" style={{ backgroundColor: '#dce9a8' }}>
                      View Full Itinerary
                    </button>
                  </div>
                </article>))}
            </div>
          </div>

          <aside className="w-full lg:w-[400px] shrink-0">
            <div className="rounded-2xl border border-neutral-200 p-6 shadow-sm bg-white lg:sticky lg:top-28">
              <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-neutral-900 mb-6">Create Itinerary</h2>
              <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Itinerary Title</label>
                  <input placeholder="e.g. Hidden Gems" className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.35)]"/>
                  <p className="text-xs text-neutral-500 mt-1">Keep it catchy! Best titles include location and vibe.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">General Description</label>
                  <textarea rows={3} placeholder="Tell us about the overall experience…" className="w-full px-4 py-3 rounded-xl border border-neutral-200 outline-none focus:ring-2 focus:ring-[rgba(126,160,14,0.35)] resize-none"/>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">Start date</label>
                    <input type="text" placeholder="📅  DD / MM / YYYY" className="w-full px-3 py-3 rounded-xl border border-neutral-200 text-sm"/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1">End date</label>
                    <input type="text" placeholder="📅  DD / MM / YYYY" className="w-full px-3 py-3 rounded-xl border border-neutral-200 text-sm"/>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">Search Destinations</label>
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200">
                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input className="flex-1 outline-none text-sm" placeholder="Search"/>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-neutral-700">Destinations</label>
                  {[1, 2].map((i) => (<div key={i} className="flex items-center gap-2 px-4 py-3 rounded-xl border border-neutral-200">
                      <span className="text-neutral-400">📍</span>
                      <input className="flex-1 outline-none text-sm" placeholder="Add stop"/>
                    </div>))}
                </div>
                <button type="button" className="w-full py-3 rounded-xl font-['Poppins',sans-serif] font-bold text-white" style={{ backgroundColor: olive }}>
                  Add More
                </button>
                <button type="submit" className="w-full py-3 rounded-xl font-['Poppins',sans-serif] font-bold text-white" style={{ backgroundColor: slate }}>
                  Publish Itinerary
                </button>
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>);
}
