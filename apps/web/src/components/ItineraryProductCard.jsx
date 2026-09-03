import { useState } from 'react';
import { Link } from 'react-router-dom';
import { itineraryCardChips, itineraryGalleryUrls } from '../lib/itineraryPlaces';

export function ItineraryProductCard({ itinerary, to }) {
  const images = itineraryGalleryUrls(itinerary);
  const chips = itineraryCardChips(itinerary);
  const [index, setIndex] = useState(0);
  const slides = images.length > 0 ? images : [null];

  return (
    <article className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_10px_24px_rgba(22,53,46,0.12)]">
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[var(--ct-teal)]">
        <div
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          onScroll={(event) => {
            const el = event.currentTarget;
            if (!el.clientWidth) return;
            setIndex(Math.round(el.scrollLeft / el.clientWidth));
          }}
        >
          {slides.map((src, i) => (
            <div key={src || `empty-${i}`} className="h-full w-full shrink-0 snap-start">
              {src ? (
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  loading={i === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              ) : (
                <div className="h-full w-full bg-[var(--ct-teal)]" />
              )}
            </div>
          ))}
        </div>
        {images.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
            {images.map((_, i) => (
              <span
                key={`dot-${i}`}
                className={
                  i === index
                    ? 'h-1.5 w-4 rounded-full bg-[var(--ct-cream)]'
                    : 'h-1.5 w-1.5 rounded-full bg-[var(--ct-cream)]/45'
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      <Link
        to={to}
        className="flex min-h-0 flex-1 flex-col px-3.5 pb-3.5 pt-3.5 no-underline"
        aria-label={`View route ${itinerary.title}`}
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 font-['Poppins',sans-serif] text-[15px] font-semibold leading-snug text-[var(--ct-ink)]">
            {itinerary.title}
          </h2>
          {itinerary.durationLabel ? (
            <span className="shrink-0 rounded-full bg-[var(--ct-pale-green)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--cavitour-green)]">
              {itinerary.durationLabel}
            </span>
          ) : null}
        </div>
        {itinerary.summary ? (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-[var(--ct-ink)]">
            {itinerary.summary}
          </p>
        ) : (
          <div className="flex-1" aria-hidden />
        )}
        {chips.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full bg-[var(--ct-pale-green)] px-2.5 py-0.5 text-[10px] font-medium text-[#AACBC4]"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        <span className="mt-3 flex items-center justify-center rounded-full bg-[var(--cavitour-green)] py-2 text-center text-[13px] font-semibold text-white transition hover:bg-[var(--cavitour-green-dark)]">
          View route
        </span>
      </Link>
    </article>
  );
}
