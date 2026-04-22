import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { pitxGallery } from '../data/terminalPitx';
const olive = '#7ea00e';
const teal = '#1f4f59';

function ReviewStars({ value = 5, size = 'h-4 w-4', dimmed = false }) {
    return (<div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
            const active = i < value;
            return (<svg
          key={i}
          className={size}
          viewBox="0 0 20 20"
          fill="currentColor"
          style={{ color: active ? '#f4c430' : dimmed ? '#e9ddad' : '#f4e2a1' }}
          aria-hidden
        >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.155 3.555a1 1 0 00.95.69h3.74c.969 0 1.371 1.24.588 1.81l-3.027 2.2a1 1 0 00-.364 1.118l1.156 3.555c.3.922-.755 1.688-1.539 1.118l-3.027-2.2a1 1 0 00-1.176 0l-3.027 2.2c-.783.57-1.838-.196-1.539-1.118l1.156-3.555a1 1 0 00-.364-1.118l-3.027-2.2c-.783-.57-.38-1.81.588-1.81h3.74a1 1 0 00.95-.69l1.155-3.555z" />
          </svg>);
        })}
    </div>);
}
export function TerminalDetailPage() {
    const suggestedTerminals = [
        {
            name: 'Bicutan Interchange',
            location: 'Taguig',
            image: pitxGallery.facade,
        },
        {
            name: 'Imus Transport Hub',
            location: 'Imus, Cavite',
            image: pitxGallery.bays,
        },
        {
            name: 'Dasmariñas Terminal',
            location: 'Dasmariñas, Cavite',
            image: pitxGallery.counter,
        },
        {
            name: 'South Station',
            location: 'Alabang',
            image: pitxGallery.hero,
        },
    ];
    const reviewBreakdown = [
        { label: 'Five', pct: 72, count: '989' },
        { label: 'Four', pct: 52, count: '4.5K' },
        { label: 'Three', pct: 14, count: '50' },
        { label: 'Two', pct: 7, count: '16' },
        { label: 'One', pct: 4, count: '8' },
    ];
    const recentFeedback = [
        {
            name: 'Robert Karmazov',
            image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80',
            text: 'Great ambiance, practical parking, and smooth check-in. Perfect terminal for quick Cavite stopovers.',
            rating: 4,
        },
        {
            name: 'Alyssa M.',
            image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80',
            text: 'Clean area and easy to find. Staff were approachable and gave helpful local recommendations.',
            rating: 5,
        },
        {
            name: 'Marco D.',
            image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&q=80',
            text: 'Solid terminal for family day tours. Better to arrive early for less crowd.',
            rating: 4,
        },
    ];
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

      <main className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between text-neutral-700">
              <Link to="/terminals" className="inline-flex items-center gap-1.5 text-2xl font-bold hover:underline">
                <span aria-hidden className="text-3xl leading-none">‹</span>
                PITX
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_230px] mb-4">
              <div className="rounded-2xl overflow-hidden">
                <img src={pitxGallery.hero} alt="PITX terminal" className="h-[300px] w-full object-cover sm:h-[420px]" />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-1">
                {[pitxGallery.facade, pitxGallery.bays, pitxGallery.counter].map((img, i) => (
                  <div key={`${img}-${i}`} className="rounded-xl overflow-hidden">
                    <img src={img} alt="" className="h-28 w-full object-cover sm:h-[132px]" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">Establishment</p>
                <span className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-600">
                  Transport Terminal
                </span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-50"
                  aria-label="Save terminal"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-3 flex flex-wrap gap-2 border-b border-neutral-200 pb-2">
              {['description', 'reviews'].map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold capitalize"
                  style={
                    tab === key
                      ? { backgroundColor: olive, color: '#fff' }
                      : { backgroundColor: '#ededed', color: '#5b5b5b' }
                  }
                >
                  {key}
                </button>
              ))}
            </div>

            {tab === 'description' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
                <div className="rounded-xl bg-white p-3 text-sm leading-relaxed text-neutral-600">
                  <p>
                    PITX integrates bus terminals, public transport, and commercial spaces in one development —
                    streamlining transfers for commuters heading to CALABARZON and beyond.
                  </p>
                  <p className="mt-3">
                    Experience safe, convenient, and comfortable commute here at PITX, the country&apos;s first landport.
                    It is designed to provide smooth passenger flow and a modern travel experience.
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Map location</p>
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <iframe
                      title="PITX location map"
                      src="https://www.openstreetmap.org/export/embed.html?bbox=120.99%2C14.51%2C121.02%2C14.53&layer=mapnik&marker=14.5205%2C121.0002"
                      className="h-[190px] w-full border-0"
                    />
                  </div>
                  <p className="text-[11px] text-neutral-500">Parañaque Integrated Terminal Exchange</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_8px_28px_rgba(0,0,0,0.04)] sm:grid-cols-[1.2fr_320px]">
                  <div className="space-y-2.5">
                    {reviewBreakdown.map((row) => (
                      <div key={row.label} className="grid grid-cols-[52px_18px_minmax(0,1fr)_44px] items-center gap-2.5">
                        <p className="text-[11px] font-semibold uppercase text-neutral-600">{row.label}</p>
                        <ReviewStars value={1} size="h-3.5 w-3.5" />
                        <div className="h-2.5 rounded-full bg-neutral-100">
                          <div className="h-full rounded-full" style={{ width: `${row.pct}%`, backgroundColor: olive }} />
                        </div>
                        <p className="text-right text-xs font-semibold text-neutral-600">{row.count}</p>
                      </div>
                    ))}
                  </div>
                  <div
                    className="rounded-2xl border border-neutral-200 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                    style={{ background: 'linear-gradient(180deg, rgba(126,160,14,0.12), rgba(126,160,14,0.04))' }}
                  >
                    <p className="text-4xl font-bold" style={{ color: olive }}>4.3</p>
                    <div className="mt-2 flex justify-center">
                      <ReviewStars value={5} size="h-6 w-6" />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-neutral-700">50 ratings</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div>
                    <h3 className="mb-2 text-xl font-bold text-neutral-800">Recent feedback</h3>
                    <div className="space-y-3">
                      {recentFeedback.map((review) => (
                        <article
                          key={review.name}
                          className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
                        >
                          <div className="flex items-start gap-3">
                            <img src={review.image} alt="" className="h-12 w-12 rounded-full object-cover" />
                            <div className="min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-neutral-900">{review.name}</p>
                                <ReviewStars value={review.rating} size="h-3.5 w-3.5" />
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-neutral-600">{review.text}</p>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xl font-bold text-neutral-800">Add a Review</h3>
                    <form className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-[0_8px_20px_rgba(0,0,0,0.04)]">
                      <label className="block text-xs font-semibold text-neutral-500">Add Your Rating *</label>
                      <div className="mt-1">
                        <ReviewStars value={0} size="h-4 w-4" dimmed />
                      </div>
                      <label className="mt-3 block text-xs font-semibold text-neutral-500">Name *</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.18)]"
                      />
                      <label className="mt-3 block text-xs font-semibold text-neutral-500">Email *</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        className="mt-1 h-10 w-full rounded-lg border border-neutral-200 px-3 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.18)]"
                      />
                      <label className="mt-3 block text-xs font-semibold text-neutral-500">Write Your Review *</label>
                      <textarea
                        rows={4}
                        placeholder="Write here..."
                        className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.18)]"
                      />
                      <button
                        type="button"
                        className="mt-4 h-10 w-full rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: olive }}
                      >
                        Submit
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="rounded-3xl border border-neutral-200 bg-[#f7f7f7] p-4 lg:sticky lg:top-24 self-start">
            <h2 className="text-xl font-semibold text-neutral-800">Terminals you may like</h2>
            <div className="mt-4 space-y-3">
              {suggestedTerminals.map((terminal) => (
                <Link
                  key={terminal.name}
                  to="/terminals"
                  className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 transition hover:shadow-sm"
                >
                  <img src={terminal.image} alt="" className="h-[72px] w-[72px] rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold text-neutral-900">{terminal.name}</p>
                    <p className="line-clamp-1 text-xs text-neutral-500">{terminal.location}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => event.preventDefault()}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 transition hover:bg-neutral-50"
                    aria-label={`Save ${terminal.name}`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>);
}
