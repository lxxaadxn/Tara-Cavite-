import { Link } from 'react-router-dom';
import { itineraryCardChips, itineraryGalleryUrls } from '../lib/itineraryPlaces';

const TAG_STYLES = [
  'bg-[color-mix(in_srgb,var(--cavitour-green)_16%,white)] text-[var(--cavitour-green)]',
  'bg-[color-mix(in_srgb,var(--ct-teal)_16%,white)] text-[var(--ct-teal)]',
  'bg-[color-mix(in_srgb,var(--cavitour-green-dark)_14%,white)] text-[var(--cavitour-green-dark)]',
];

export function ItineraryProductCard({ itinerary, to }) {
  const cover = itineraryGalleryUrls(itinerary)[0] || null;
  const chips = itineraryCardChips(itinerary).slice(0, 3);
  const route = String(itinerary?.route || itinerary?.subtitle || '').trim();

  return (
    <article className="group flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(22,53,46,0.1)] ring-1 ring-[color-mix(in_srgb,var(--ct-ink)_8%,transparent)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(22,53,46,0.14)]">
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-[var(--ct-teal)]">
        {cover ? (
          <img
            src={cover}
            alt=""
            className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
            loading="eager"
            decoding="async"
          />
        ) : (
          <div className="h-full w-full bg-[var(--ct-teal)]" />
        )}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(22,53,46,0.35)] to-transparent"
          aria-hidden
        />
      </div>

      <Link
        to={to}
        className="flex flex-1 flex-col gap-2.5 px-3.5 pb-3.5 pt-3.5 no-underline outline-none focus-visible:bg-[color-mix(in_srgb,var(--ct-pale-green)_55%,white)]"
        aria-label={`View route ${itinerary.title}`}
      >
        <div className="flex items-center gap-2.5">
          <h2 className="min-w-0 flex-1 font-['Poppins',sans-serif] text-[17px] font-bold leading-[1.25] tracking-[-0.015em] text-[var(--ct-ink)]">
            {itinerary.title}
          </h2>
          {itinerary.durationLabel ? (
            <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--cavitour-green)_28%,transparent)] bg-[color-mix(in_srgb,var(--cavitour-green)_10%,white)] px-2.5 py-[5px] text-[12px] font-semibold leading-none text-[var(--cavitour-green)]">
              {itinerary.durationLabel}
            </span>
          ) : null}
        </div>

        {route ? (
          <p className="line-clamp-1 font-['Poppins',sans-serif] text-[14px] font-normal leading-snug text-neutral-600">
            {route}
          </p>
        ) : null}

        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => (
              <span
                key={chip}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-[0.01em] ${TAG_STYLES[i % TAG_STYLES.length]}`}
              >
                {chip}
              </span>
            ))}
          </div>
        ) : null}

        <span className="mt-auto flex items-center justify-center rounded-full bg-[var(--cavitour-green)] py-2.5 text-center text-[14px] font-semibold text-white transition group-hover:bg-[var(--cavitour-green-dark)]">
          View route
        </span>
      </Link>
    </article>
  );
}
