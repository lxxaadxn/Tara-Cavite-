import { Link } from 'react-router-dom';
import { AppHeader } from '../components/AppHeader';
import { publishedItineraries } from '../data/mockItineraries';

/** Route line: use `route` when set; only turn `->` / spaced ` - ` into arrows. */
function formatRouteLine(it) {
  const raw = it.route || it.subtitle || '';
  return String(raw)
    .replace(/\s*->\s*/g, ' → ')
    .replace(/\s+-\s+/g, ' → ');
}

function stopCount(it) {
  const fromList = it.stopList?.length ?? 0;
  if (fromList > 0) return fromList;
  return it.stops ?? null;
}

function metaLine(it) {
  const parts = [];
  const stops = stopCount(it);
  if (stops != null) parts.push(`${stops} ${stops === 1 ? 'stop' : 'stops'}`);
  if (it.durationLabel) parts.push(it.durationLabel);
  return parts.length ? parts.join(' · ') : 'Multi-stop route';
}

export function ItineraryPage() {
  return (
    <div className="min-h-screen bg-neutral-50 font-['Inter',sans-serif]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <header className="max-w-2xl">
          <h1 className="font-['Poppins',sans-serif] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
            Curated routes
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500 sm:text-base">
            Ready-made trips from our team. Save any route and follow it stop by stop.
          </p>
        </header>

        <ul className="mt-8 grid list-none grid-cols-1 gap-5 p-0 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-6">
          {publishedItineraries.map((it) => (
            <li key={it.id} className="flex min-h-0">
              <Link
                to={`/itinerary/${it.id}`}
                className="group flex h-full w-full min-h-[320px] flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-neutral-200/90 transition hover:ring-neutral-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
              >
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-neutral-100">
                  <img
                    src={it.image}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
                  <h2 className="font-['Poppins',sans-serif] text-[15px] font-semibold leading-snug text-neutral-900 sm:text-base">
                    {it.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-snug text-neutral-600 line-clamp-2">
                    {formatRouteLine(it)}
                  </p>
                  {it.summary ? (
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-neutral-400 line-clamp-2 sm:text-[13px]">
                      {it.summary}
                    </p>
                  ) : (
                    <div className="flex-1" aria-hidden />
                  )}

                  <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-neutral-100 pt-3">
                    <p className="text-xs font-medium text-neutral-500">{metaLine(it)}</p>
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition group-hover:bg-[#1f4f59] group-hover:text-white"
                      aria-hidden
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M9 6l6 6-6 6"
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
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
