import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { publishedItineraries } from '../data/mockItineraries';
const olive = '#7ea00e';
const slate = '#1f4f59';
export function ItineraryPage() {
    const [createOpen, setCreateOpen] = useState(false);
    return (<div className="min-h-screen bg-white font-['Inter',sans-serif]">
      <AppHeader />

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="min-w-0">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-['Poppins',sans-serif] font-bold text-2xl text-neutral-900">Published Itineraries</h2>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-white"
              style={{ backgroundColor: olive }}
            >
              Create Itinerary
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {publishedItineraries.map((it) => (<article key={it.id} className="flex h-full min-h-[226px] w-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white p-2 text-left transition hover:shadow-md">
                <div className="overflow-hidden rounded-xl bg-neutral-100">
                  <img src={it.image} alt={it.title} className="h-32 w-full object-cover"/>
                </div>
                <div className="flex-1 px-1 pb-1 pt-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">{it.title}</h3>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[12px] text-neutral-500">{it.route}</p>
                  <div className="mt-2 flex items-center justify-end">
                    <Link to={`/itinerary/${it.id}`} className="rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50">
                      View itinerary
                    </Link>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-400">Published itinerary</p>
                </div>
              </article>))}
          </div>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-[1080px] max-h-[92vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-['Poppins',sans-serif] font-bold text-xl text-neutral-900">Create Itinerary</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                aria-label="Close create itinerary"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6l-12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form className="grid grid-cols-1 gap-4 lg:grid-cols-2" onSubmit={(e) => e.preventDefault()}>
              <div className="rounded-2xl border border-neutral-200 bg-[#fcfcfb] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Itinerary details</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Itinerary title</label>
                    <input
                      placeholder="e.g. Hidden Gems"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                    />
                    <p className="mt-1 text-[11px] text-neutral-500">Keep it catchy! Best titles include location and vibe.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">General description</label>
                    <textarea
                      rows={3}
                      placeholder="Tell us about the overall experience..."
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Start date</label>
                    <input
                      type="date"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">End date</label>
                    <input
                      type="date"
                      className="h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-700 outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Stops and options</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Search destinations</label>
                    <div className="flex h-10 items-center gap-2 rounded-lg border border-neutral-200 px-3">
                      <svg className="h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                      <input className="flex-1 text-sm outline-none" placeholder="Search place" />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Destinations</label>
                    <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-2">
                      <div className="space-y-2">
                        {[1, 2].map((i) => (
                          <div key={i} className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(126,160,14,0.14)] text-[11px] font-semibold text-[#6c8612]">
                              {i}
                            </span>
                            <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                              <path
                                fillRule="evenodd"
                                d="M12 2.25a7.5 7.5 0 00-7.5 7.5c0 5.25 7.5 12 7.5 12s7.5-6.75 7.5-12a7.5 7.5 0 00-7.5-7.5zm0 10.5a3 3 0 100-6 3 3 0 000 6z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <input className="flex-1 text-sm outline-none" placeholder={`Add stop ${i}`} />
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                              aria-label={`Reorder stop ${i}`}
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M8 6h8M8 12h8M8 18h8" strokeLinecap="round" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100"
                      >
                        <span className="text-sm leading-none">+</span>
                        Add destination
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-neutral-200 pt-3 sm:grid-cols-2 lg:col-span-2">
                <button type="button" className="w-full rounded-lg border border-neutral-300 bg-white py-2.5 font-['Poppins',sans-serif] text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50">
                  Add More
                </button>
                <button type="submit" className="w-full rounded-lg py-2.5 font-['Poppins',sans-serif] text-sm font-bold text-white shadow-[0_10px_20px_rgba(31,79,89,0.24)]" style={{ backgroundColor: slate }}>
                  Publish Itinerary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>);
}
