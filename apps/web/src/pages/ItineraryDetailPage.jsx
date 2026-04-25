import { Link, useParams } from 'react-router-dom';
import { publishedItineraries } from '../data/mockItineraries';

const HEADER_GREEN = '#7EA00E';
const TEAL = '#1F4F59';

export function ItineraryDetailPage() {
  const { id } = useParams();
  const detail = publishedItineraries.find((itinerary) => itinerary.id === id);

  if (!detail) {
    return (
      <div className="min-h-screen bg-[#f4f6ec] font-['Inter',sans-serif] text-neutral-900">
        <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <h2 className="font-['Poppins',sans-serif] text-2xl font-bold text-neutral-900">Not found</h2>
          <p className="mt-2 text-sm text-neutral-600">This itinerary is no longer available.</p>
          <Link to="/itinerary" className="mt-6 rounded-full px-5 py-2.5 text-sm font-semibold text-white" style={{ backgroundColor: TEAL }}>
            Back to itineraries
          </Link>
        </main>
      </div>
    );
  }

  const linkedPlaces = (detail.stopList || [])
    .map((stop) => stop.place)
    .filter(Boolean)
    .filter((place, index, list) => list.findIndex((x) => x.name === place.name && x.address === place.address) === index);

  return (
    <div className="min-h-screen bg-[#f4f6ec] font-['Inter',sans-serif] text-neutral-900">
      <main className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
        <div className="mb-2 flex items-center">
          <Link to="/itinerary" className="rounded-full p-2 text-neutral-700 transition hover:bg-white" aria-label="Go back to itineraries">
            <span aria-hidden>←</span>
          </Link>
        </div>
        <section className="overflow-hidden rounded-[20px] border border-[rgba(31,79,89,0.08)] bg-white shadow-[0_8px_24px_rgba(31,79,89,0.10)]">
          <div className="relative h-[240px] sm:h-[280px]">
            <img src={detail.image} alt={detail.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/45 p-4 text-white sm:p-5">
              <div className="flex h-full flex-col justify-end">
                {!!detail.tags?.length && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {detail.tags.map((tag) => (
                      <span key={tag} className="rounded-md bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.04em] text-[#241D13]">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="font-['Poppins',sans-serif] text-[24px] font-bold leading-tight">{detail.title}</h2>
                <p className="mt-1 text-sm text-white/90">{detail.subtitle}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {!!detail.stops && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">{detail.stops} stops</span>}
                  {!!detail.durationLabel && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">{detail.durationLabel}</span>}
                  {!!detail.bestTime && <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs">{detail.bestTime}</span>}
                </div>
              </div>
            </div>
          </div>
        </section>

        {!!detail.summary && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Overview</h3>
            <p className="mt-2 text-sm leading-6 text-[#7A7878]">{detail.summary}</p>
            {!!detail.highlights?.length && (
              <div className="mt-4 space-y-2">
                {detail.highlights.map((highlight) => (
                  <div key={highlight} className="flex items-start gap-2 text-sm leading-5 text-[#241D13]">
                    <span className="mt-0.5 font-bold text-[#7EA00E]">✓</span>
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {!!detail.stopList?.length && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Route & stops</h3>
            <div className="mt-3">
              {detail.stopList.map((stop, index) => (
                <div key={`${stop.name}-${index}`} className="pb-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: HEADER_GREEN }}>
                      {index + 1}
                    </span>
                    <p className="font-['Poppins',sans-serif] text-base font-bold text-[#241D13]">{stop.name}</p>
                  </div>
                  <p className="ml-10 mt-2 text-sm leading-5 text-[#7A7878]">{stop.description}</p>
                  {!!stop.leg && (
                    <div className="ml-10 mt-2 rounded-lg bg-[#f4f6ec] p-2.5 text-sm text-[#1F4F59]">
                      <span aria-hidden className="mr-1">➜</span>
                      {stop.leg}
                    </div>
                  )}
                  {!!stop.place && (
                    <div className="ml-10 mt-2 flex items-center gap-3 rounded-xl border border-[rgba(31,79,89,0.1)] bg-[#f4f6ec] p-2.5">
                      {stop.place.image ? (
                        <img src={stop.place.image} alt={stop.place.name} className="h-[52px] w-[52px] rounded-[10px] object-cover" />
                      ) : (
                        <div className="flex h-[52px] w-[52px] items-center justify-center rounded-[10px] bg-[rgba(31,79,89,0.08)] text-lg">🏢</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-[#7EA00E]">Featured spot</p>
                        <p className="line-clamp-2 text-sm font-medium text-[#241D13]">{stop.place.name}</p>
                        {!!stop.place.address && <p className="line-clamp-2 text-xs text-[#7A7878]">{stop.place.address}</p>}
                      </div>
                      <span className="text-[#7A7878]">›</span>
                    </div>
                  )}
                  {index < detail.stopList.length - 1 && <div className="ml-10 mt-4 h-px bg-[rgba(31,79,89,0.12)]" />}
                </div>
              ))}
            </div>
          </section>
        )}

        {!!detail.tips?.length && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Tips</h3>
            <div className="mt-2 space-y-1.5">
              {detail.tips.map((tip) => (
                <div key={tip} className="flex items-start gap-2 text-sm text-[#241D13]">
                  <span className="text-base leading-none text-[#7EA00E]">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {!!linkedPlaces.length && (
          <section className="mt-3 rounded-2xl border border-[rgba(31,79,89,0.08)] bg-white p-4 sm:p-5">
            <h3 className="font-['Poppins',sans-serif] text-lg font-bold text-[#241D13]">Places in this route</h3>
            <p className="mt-1 text-xs text-[#7A7878]">Tap to open details and directions.</p>
            <div className="mt-2">
              {linkedPlaces.map((place) => (
                <div key={`${place.name}-${place.address}`} className="flex items-center gap-3 border-t border-[rgba(31,79,89,0.12)] py-3">
                  <span className="text-lg text-[#1F4F59]">🏢</span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-[#241D13]">{place.name}</p>
                    {!!place.address && <p className="line-clamp-2 text-xs text-[#7A7878]">{place.address}</p>}
                  </div>
                  <span className="text-[#7A7878]">›</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
