import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoWordmark } from '../components/LogoWordmark';
import { publishedItineraries } from '../data/mockItineraries';
import { buildEnrichedItinerary } from '../lib/itineraryPlaces';
import {
  MARKETING_PLACEHOLDER_IMG,
  buildDestinationFilters,
  buildMarketingStats,
  fetchPlacesWithMedia,
  formatStatCount,
  pickFeaturedDestinations,
  pickHeroPlace,
} from '../lib/marketingPlaces';
import { supabase } from '../lib/supabase';

const palette = {
  ink: 'var(--ct-ink)',
  lime: 'var(--ct-olive)',
  teal: 'var(--ct-teal)',
  forest: 'var(--ct-forest)',
  cream: 'var(--ct-cream)',
  cloud: 'var(--ct-pale-green)',
};

const TRUST_CARDS = [
  {
    icon: 'guide',
    title: 'NTDP Cavite catalog',
    body: 'Browse officially classified tourism establishments across Cavite municipalities.',
  },
  {
    icon: 'booking',
    title: 'Saved lists & itineraries',
    body: 'Save favorites, build day plans, and follow curated routes from the catalog.',
  },
  {
    icon: 'support',
    title: 'Maps & terminal guides',
    body: 'Find establishments on the map and check jeepney and bus terminal details.',
  },
];

function TrustIcon({ icon }) {
  const common = 'h-5 w-5';
  switch (icon) {
    case 'booking':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case 'support':
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 10a6 6 0 1 0-12 0v5a2 2 0 0 0 2 2h2l2 3 2-3h2a2 2 0 0 0 2-2v-5Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 10h.01M15 10h.01" />
        </svg>
      );
    case 'guide':
    default:
      return (
        <svg className={common} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 7 9-4 9 4-9 4-9-4Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m3 17 9 4 9-4M3 12l9 4 9-4" />
        </svg>
      );
  }
}

function HeroSkeleton() {
  return <div className="h-[420px] w-full animate-pulse bg-neutral-200 md:h-[520px]" />;
}

function DestinationCardSkeleton() {
  return <div className="h-56 animate-pulse rounded-2xl bg-neutral-200" />;
}

function ItineraryCardSkeleton() {
  return <div className="h-[240px] animate-pulse rounded-3xl bg-neutral-200" />;
}

export function LandingPageClean() {
  const [activeDestinationFilter, setActiveDestinationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState([]);
  const [destinationFilters, setDestinationFilters] = useState([{ label: 'All', value: 'all' }]);
  const [heroPlace, setHeroPlace] = useState(null);
  const [stats, setStats] = useState(null);
  const [itineraries, setItineraries] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const places = await fetchPlacesWithMedia(supabase);
        if (cancelled) return;

        setDestinations(pickFeaturedDestinations(places, { limit: 8 }));
        setDestinationFilters(buildDestinationFilters(places));
        setHeroPlace(pickHeroPlace(places));
        setStats(buildMarketingStats(places));
        setItineraries(
          publishedItineraries
            .slice(0, 2)
            .map((template) => buildEnrichedItinerary(template, places))
            .filter(Boolean)
        );
      } catch {
        if (cancelled) return;
        setDestinations([]);
        setDestinationFilters([{ label: 'All', value: 'all' }]);
        setHeroPlace(null);
        setStats(null);
        setItineraries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredDestinations = useMemo(() => {
    if (activeDestinationFilter === 'all') return destinations;
    return destinations.filter((d) => d.categoryKey === activeDestinationFilter);
  }, [activeDestinationFilter, destinations]);

  const heroImage =
    heroPlace?.imageUrl?.trim() ||
    heroPlace?.galleryUrls?.[0] ||
    MARKETING_PLACEHOLDER_IMG;
  const heroAlt = heroPlace?.name
    ? `${heroPlace.name}${heroPlace.city_mun ? `, ${heroPlace.city_mun}` : ''}`
    : 'Cavite establishment';

  const statItems = useMemo(() => {
    if (!stats) return [];
    const items = [];
    const establishments = formatStatCount(stats.establishmentCount);
    const municipalities = formatStatCount(stats.municipalityCount);
    if (establishments) items.push({ value: establishments, label: 'Establishments' });
    if (municipalities) items.push({ value: municipalities, label: 'Municipalities' });
    if (itineraries.length > 0) {
      items.push({ value: String(itineraries.length), label: 'Curated routes' });
    }
    return items;
  }, [stats, itineraries.length]);

  const displayDestinations = loading ? [] : filteredDestinations;

  return (
    <div className="relative min-h-screen overflow-hidden font-['Inter',sans-serif] text-neutral-900" style={{ backgroundColor: palette.cream }}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-[-120px] h-[340px] w-[340px] rounded-full bg-white/45 blur-3xl" />
        <div className="absolute top-[26%] right-[-120px] h-[380px] w-[380px] rounded-full bg-[rgba(31,79,89,0.14)] blur-3xl" />
        <div className="absolute bottom-[-140px] left-[20%] h-[360px] w-[360px] rounded-full bg-[rgba(126,160,14,0.18)] blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="tracking-tight">
            <LogoWordmark className="text-base" />
          </Link>
          <nav className="hidden items-center gap-6 pl-4 text-sm font-medium text-neutral-600 lg:flex">
            <a href="#destinations" className="transition-colors hover:text-neutral-900">Top Destinations</a>
            <a href="#itineraries" className="transition-colors hover:text-neutral-900">Itineraries</a>
            <a href="#features" className="transition-colors hover:text-neutral-900">Why CaviTour</a>
          </nav>
          <div className="ml-auto hidden items-center justify-end md:flex">
            <Link to="/signup" className="mr-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100">
              Sign Up
            </Link>
            <Link to="/login" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-95" style={{ backgroundColor: palette.ink }}>
              Log In
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section id="top" className="overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_18px_60px_rgba(16,36,58,0.10)] sm:p-6">
          <div className="relative overflow-hidden rounded-3xl">
            {loading ? (
              <HeroSkeleton />
            ) : (
              <>
                <img src={heroImage} alt={heroAlt} className="h-[420px] w-full object-cover md:h-[520px]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
                <div className="absolute inset-0 flex items-end p-6 md:p-10">
                  <div className="max-w-2xl text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80 md:text-sm">
                      Explore Cavite establishments
                    </p>
                    <h1 className="mt-3 font-['Poppins',sans-serif] text-4xl font-extrabold leading-[1.04] md:text-6xl">
                      CAVITE TOUR
                    </h1>
                    <p className="mt-4 max-w-xl text-sm text-white/90 md:text-base">
                      Search the NTDP catalog, browse maps, save lists, follow curated routes, and check terminal
                      guides — your Cavite travel companion in one place.
                    </p>
                    {heroPlace?.name ? (
                      <p className="mt-3 text-xs font-medium text-white/75 md:text-sm">
                        Featured: {heroPlace.name}
                        {heroPlace.city_mun ? ` · ${heroPlace.city_mun}` : ''}
                      </p>
                    ) : null}
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Link
                        to="/search"
                        className="rounded-xl px-5 py-3 text-sm font-semibold text-white md:px-6"
                        style={{ backgroundColor: palette.lime }}
                      >
                        Search establishments
                      </Link>
                      <a
                        href="#destinations"
                        className="rounded-xl border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 md:px-6"
                      >
                        Browse destinations
                      </a>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section id="features" className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-[26px] bg-white p-6 shadow-[0_14px_40px_rgba(16,36,58,0.08)] sm:p-8">
            <h2 className="font-['Poppins',sans-serif] text-3xl font-bold leading-tight md:text-4xl" style={{ color: palette.ink }}>
              Plan Cavite trips with real catalog data
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
              CaviTour connects you to verified establishments, commute-friendly maps, saved lists, and ready-made
              day routes — built for exploring the province, not booking packages.
            </p>
            {statItems.length > 0 ? (
              <div className={`mt-8 grid gap-3 sm:gap-4 ${statItems.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {statItems.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
                    <p className="text-2xl font-bold" style={{ color: palette.ink }}>{item.value}</p>
                    <p className="mt-1 text-xs text-neutral-500">{item.label}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            {TRUST_CARDS.map((card) => (
              <article key={card.title} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_10px_30px_rgba(16,36,58,0.08)]">
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-xl p-2.5 text-white" style={{ backgroundColor: palette.teal }}>
                    <TrustIcon icon={card.icon} />
                  </div>
                  <div>
                    <h3 className="font-['Poppins',sans-serif] text-lg font-semibold" style={{ color: palette.ink }}>{card.title}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{card.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="destinations" className="mt-8 rounded-[26px] bg-white p-6 shadow-[0_14px_40px_rgba(16,36,58,0.08)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: palette.lime }}>Top Destinations</p>
              <h2 className="mt-2 font-['Poppins',sans-serif] text-3xl font-bold md:text-4xl" style={{ color: palette.ink }}>
                From the Cavite NTDP catalog
              </h2>
            </div>
          </div>
          {destinationFilters.length > 1 ? (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {destinationFilters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setActiveDestinationFilter(filter.value)}
                  className="rounded-full px-4 py-2 text-sm font-medium transition"
                  style={
                    activeDestinationFilter === filter.value
                      ? { backgroundColor: palette.lime, color: '#fff' }
                      : { backgroundColor: palette.cloud, color: palette.teal }
                  }
                >
                  {filter.label}
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }, (_, i) => <DestinationCardSkeleton key={i} />)
              : displayDestinations.map((d) => (
                  <Link
                    key={d.id}
                    to={`/search?q=${encodeURIComponent(d.name)}`}
                    className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={d.image}
                        alt={d.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <p className="font-['Poppins',sans-serif] text-lg font-semibold text-white">{d.name}</p>
                        <p className="text-xs text-white/80">{d.meta}</p>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
          {!loading && displayDestinations.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              {destinations.length === 0
                ? 'Establishment highlights will appear here once the catalog loads.'
                : 'No destinations match this category. Try another filter.'}
            </p>
          ) : null}
        </section>

        <section id="itineraries" className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <article
            className="rounded-3xl p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${palette.teal}, ${palette.lime})` }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/85">Itineraries</p>
            <h3 className="mt-2 font-['Poppins',sans-serif] text-3xl font-bold">Curated day routes</h3>
            <p className="mt-3 max-w-md text-sm text-white/90">
              Ready-made plans linking real catalog stops — open an account to save, edit, and follow them on the map.
            </p>
            <Link
              to="/itinerary"
              className="mt-5 inline-block rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              View itineraries
            </Link>
          </article>
          {loading
            ? Array.from({ length: 2 }, (_, i) => <ItineraryCardSkeleton key={i} />)
            : itineraries.map((itin) => (
                <Link key={itin.id} to="/itinerary" className="group relative block overflow-hidden rounded-3xl">
                  <img
                    src={itin.image || MARKETING_PLACEHOLDER_IMG}
                    alt={itin.title}
                    className="h-[240px] w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5">
                    <div className="mt-auto flex h-full flex-col justify-end">
                      <h4 className="font-['Poppins',sans-serif] text-2xl font-bold text-white">{itin.title}</h4>
                      <p className="mt-1 text-xs font-medium text-white/80">{itin.route}</p>
                      <p className="mt-2 text-sm text-white/90">{itin.summary}</p>
                    </div>
                  </div>
                </Link>
              ))}
        </section>
      </main>
      <footer className="border-t border-white/70 py-8" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <div>
            <LogoWordmark className="text-base" />
            <p className="mt-1 text-xs text-neutral-500">Cavite establishment search, maps, and curated routes.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-neutral-600">
            <a href="#destinations" className="hover:text-neutral-900">Top Destinations</a>
            <a href="#itineraries" className="hover:text-neutral-900">Itineraries</a>
            <a href="#features" className="hover:text-neutral-900">Why CaviTour</a>
          </nav>
          <p className="text-xs text-neutral-500">© 2026 CaviTour. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
