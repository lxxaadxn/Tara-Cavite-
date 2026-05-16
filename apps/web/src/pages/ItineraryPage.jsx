import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { publishedItineraries } from '../data/mockItineraries';

const olive = '#7ea00e';
const slate = '#1f4f59';

function formatSubtitle(s) {
  return String(s ?? '')
    .replace(/\s*->\s*/g, ' → ')
    .replace(/\s*-\s*/g, ' → ');
}

export function ItineraryPage() {
  return (
    <div className="min-h-screen bg-[#f0f2ec] font-['Inter',sans-serif]">
      <AppHeader />

      <div className="w-full max-w-[1440px] mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="w-full overflow-hidden rounded-2xl border border-[#dfe8d3] bg-gradient-to-br from-[#fbfcf7] via-[#f7faef] to-[#e8efd8] p-5 shadow-sm sm:rounded-3xl sm:p-6 lg:p-8 xl:p-10">
          <header className="w-full max-w-none border-b border-[#dfe8d3]/80 pb-6 sm:pb-8">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em] sm:text-xs"
              style={{ color: olive }}
            >
              CaviTour curated
            </p>
            <h1 className="mt-2 font-['Poppins',sans-serif] text-2xl font-bold leading-tight text-neutral-900 sm:text-3xl lg:text-4xl">
              Itineraries by our admins
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-neutral-600 sm:text-base lg:text-lg">
              Ready-made routes our team publishes — save them and follow stop by stop.
            </p>
          </header>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4 lg:gap-6 xl:gap-8">
            {publishedItineraries.map((it) => (
              <Link
                key={it.id}
                to={`/itinerary/${it.id}`}
                className="group flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#d0e0c0] bg-white shadow-[0_4px_24px_rgba(31,79,89,0.06)] transition duration-300 hover:-translate-y-0.5 hover:border-[#b8cf8f] hover:shadow-[0_20px_48px_rgba(31,79,89,0.1)]"
              >
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#e8efe0] sm:aspect-[5/3]">
                  <img
                    src={it.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                    loading="lazy"
                    decoding="async"
                  />
                  <div
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent opacity-90"
                    aria-hidden
                  />
                  <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 sm:bottom-4 sm:left-4">
                    {(it.tags ?? []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-700 shadow-sm backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5 lg:p-6">
                  <h2 className="font-['Poppins',sans-serif] text-base font-semibold leading-snug text-neutral-900 sm:text-lg">
                    {it.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-500 line-clamp-2">
                    {formatSubtitle(it.subtitle)}
                  </p>
                  <p className="mt-2 line-clamp-3 flex-1 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                    {it.summary}
                  </p>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 pt-4">
                    <p className="text-xs font-medium text-neutral-500 sm:text-sm">
                      {it.stops != null ? `${it.stops} stops` : 'Multi-stop'}
                      {it.durationLabel ? ` · ${it.durationLabel}` : ''}
                    </p>
                    <span
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-white shadow-[0_6px_16px_rgba(31,79,89,0.22)] transition group-hover:shadow-[0_8px_22px_rgba(31,79,89,0.32)] sm:text-[13px]"
                      style={{ backgroundColor: slate }}
                    >
                      Open route
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M5 12h14M13 6l6 6-6 6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
