import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { RouteStepsPanel } from '../components/RouteStepsPanel';
import { pitxGallery, pitxReviews, pitxRouteSteps } from '../data/terminalPitx';
const olive = '#7ea00e';
const teal = '#1f4f59';
export function TerminalDetailPage() {
    const { id } = useParams();
    const [tab, setTab] = useState('description');
    if (id !== 'pitx') {
        return (<div className="min-h-screen bg-white">
        <AppHeader />
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <p className="text-neutral-600 mb-4">Terminal not found.</p>
          <Link to="/terminals" className="font-semibold" style={{ color: teal }}>
            ← All terminals
          </Link>
        </div>
      </div>);
    }
    return (<div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <main className="max-w-[1320px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl bg-[#f4f4f4] p-3 sm:p-4 mb-8">
          <div className="grid grid-cols-6 grid-rows-2 gap-3 min-h-[320px]">
            <div className="col-span-2 row-span-2 rounded-2xl overflow-hidden min-h-[200px]">
              <img src={pitxGallery.hero} alt="" className="w-full h-full object-cover min-h-[280px]"/>
            </div>
            <div className="col-span-2 col-start-3 row-start-1 rounded-2xl overflow-hidden">
              <img src={pitxGallery.facade} alt="" className="w-full h-full object-cover min-h-[140px]"/>
            </div>
            <div className="col-span-2 col-start-5 row-span-2 rounded-2xl overflow-hidden border border-neutral-200 bg-white">
              <iframe title="PITX map" src="https://www.openstreetmap.org/export/embed.html?bbox=120.99%2C14.51%2C121.02%2C14.53&layer=mapnik" className="w-full h-full min-h-[200px] border-0"/>
            </div>
            <div className="col-span-1 col-start-3 row-start-2 rounded-2xl overflow-hidden">
              <img src={pitxGallery.bays} alt="" className="w-full h-full object-cover min-h-[120px]"/>
            </div>
            <div className="col-span-1 col-start-4 row-start-2 rounded-2xl overflow-hidden">
              <img src={pitxGallery.counter} alt="" className="w-full h-full object-cover min-h-[120px]"/>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-['Poppins',sans-serif] font-bold text-3xl sm:text-4xl text-neutral-900">PITX</h1>
                <p className="text-neutral-600 mt-3 max-w-2xl leading-relaxed">
                  Experience safe, convenient, and comfortable commute here at PITX, the country&apos;s first landport.
                </p>
                <span className="inline-block mt-4 px-3 py-1 rounded-lg text-xs font-bold bg-sky-100 text-sky-900">
                  Transport Terminal
                </span>
              </div>
              <div className="flex gap-2">
                <button type="button" className="w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: olive }} aria-label="Save">
                  🔖
                </button>
                <button type="button" className="w-11 h-11 rounded-full border border-neutral-200 bg-neutral-100" aria-label="Share">
                  ↗
                </button>
              </div>
            </div>

            <div className="border-b border-neutral-200 flex gap-8 mt-8 mb-6">
              <button type="button" onClick={() => setTab('description')} className="pb-3 font-['Poppins',sans-serif] font-semibold border-b-2 -mb-px" style={{
            color: tab === 'description' ? olive : '#737373',
            borderColor: tab === 'description' ? olive : 'transparent',
        }}>
                Description
              </button>
              <button type="button" onClick={() => setTab('reviews')} className="pb-3 font-['Poppins',sans-serif] font-semibold border-b-2 -mb-px" style={{
            color: tab === 'reviews' ? olive : '#737373',
            borderColor: tab === 'reviews' ? olive : 'transparent',
        }}>
                Reviews
              </button>
            </div>

            {tab === 'description' ? (<div className="text-neutral-600 space-y-4 leading-relaxed">
                <p>
                  PITX integrates bus terminals, public transport, and commercial spaces in one development —
                  streamlining transfers for commuters heading to CALABARZON and beyond.
                </p>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et
                  dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
                  aliquip ex ea commodo consequat.
                </p>
              </div>) : (<div className="flex gap-4 overflow-x-auto pb-2">
                {pitxReviews.map((r, i) => (<div key={i} className="min-w-[280px] rounded-2xl border border-neutral-200 p-5 bg-white">
                    <p className="font-bold text-neutral-900">{r.user}</p>
                    <p className="text-xs text-amber-500 mt-1">★★★★☆ Ratings {r.rating} | {r.votes} votes</p>
                    <p className="text-sm text-neutral-600 mt-3">{r.excerpt}</p>
                    <button type="button" className="mt-3 text-sm font-semibold" style={{ color: olive }}>
                      See more
                    </button>
                  </div>))}
              </div>)}
          </div>

          <aside className="lg:sticky lg:top-28 self-start">
            <RouteStepsPanel steps={pitxRouteSteps}/>
          </aside>
        </div>

        <p className="mt-12">
          <Link to="/terminals" className="text-sm font-medium hover:underline" style={{ color: teal }}>
            ← Back to terminals
          </Link>
        </p>
      </main>
    </div>);
}
