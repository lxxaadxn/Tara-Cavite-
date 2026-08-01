import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

const NAV_LINKS = [
  { href: '#destinations', label: 'Top Destinations' },
  { href: '#itineraries', label: 'Itineraries' },
  { href: '#features', label: 'Why CaviTour' },
];

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
  return <div className="h-[440px] w-full animate-pulse rounded-3xl bg-neutral-200 md:h-[560px]" />;
}

function DestinationCardSkeleton() {
  return <div className="h-56 animate-pulse rounded-2xl bg-neutral-200" />;
}

function ItineraryCardSkeleton() {
  return <div className="h-[240px] animate-pulse rounded-3xl bg-neutral-200" />;
}

/** Adds `is-visible` to `.ct-reveal` elements as they enter the viewport. */
function useRevealOnScroll(deps = []) {
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
    const els = Array.from(document.querySelectorAll('.ct-reveal:not(.is-visible)'));
    if (els.length === 0) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Counts up to a numeric target once visible; keeps any non-digit suffix like "+". */
function CountUpStat({ value, label }) {
  const ref = useRef(null);
  const target = useMemo(() => parseInt(String(value).replace(/[^\d]/g, ''), 10) || 0, [value]);
  const suffix = useMemo(() => String(value).replace(/[\d,]/g, ''), [value]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      setDisplay(target);
      return undefined;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const duration = 1000;
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          setDisplay(Math.round((1 - Math.pow(1 - p, 3)) * target));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );
    io.observe(node);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);

  return (
    <div ref={ref} className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
      <p className="font-['Poppins',sans-serif] text-2xl font-bold md:text-3xl" style={{ color: palette.ink }}>
        {display}
        {suffix}
      </p>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}

export function LandingPageClean() {
  const navigate = useNavigate();
  const [activeDestinationFilter, setActiveDestinationFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [destinations, setDestinations] = useState([]);
  const [destinationFilters, setDestinationFilters] = useState([{ label: 'All', value: 'all' }]);
  const [heroPlace, setHeroPlace] = useState(null);
  const [stats, setStats] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [heroQuery, setHeroQuery] = useState('');

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useRevealOnScroll([loading, destinations.length, itineraries.length]);

  const filteredDestinations = useMemo(() => {
    if (activeDestinationFilter === 'all') return destinations;
    return destinations.filter((d) => d.categoryKey === activeDestinationFilter);
  }, [activeDestinationFilter, destinations]);

  const heroImage =
    heroPlace?.imageUrl?.trim() || heroPlace?.galleryUrls?.[0] || MARKETING_PLACEHOLDER_IMG;
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

  const heroChips = useMemo(
    () => destinationFilters.filter((f) => f.value !== 'all').slice(0, 4),
    [destinationFilters]
  );

  const displayDestinations = loading ? [] : filteredDestinations;

  const submitHeroSearch = useCallback(
    (e) => {
      e.preventDefault();
      const q = heroQuery.trim();
      navigate(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
    },
    [heroQuery, navigate]
  );

  return (
    <div
      className="relative min-h-screen overflow-hidden font-['Inter',sans-serif] text-neutral-900"
      style={{ backgroundColor: palette.cream }}
    >
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 left-[-120px] h-[340px] w-[340px] rounded-full bg-white/45 blur-3xl" />
        <div className="absolute top-[26%] right-[-120px] h-[380px] w-[380px] rounded-full bg-[rgba(31,79,89,0.14)] blur-3xl" />
        <div className="absolute bottom-[-140px] left-[20%] h-[360px] w-[360px] rounded-full bg-[rgba(126,160,14,0.18)] blur-3xl" />
      </div>

      <header
        className={`sticky top-0 z-50 border-b transition-all duration-300 ${
          scrolled
            ? 'border-white/60 bg-white/85 shadow-[0_8px_30px_rgba(16,36,58,0.08)] backdrop-blur-xl'
            : 'border-transparent bg-white/50 backdrop-blur-md'
        }`}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="tracking-tight transition-transform hover:scale-[1.02]">
            <LogoWordmark className="text-base" />
          </Link>
          <nav className="hidden items-center gap-6 pl-4 text-sm font-medium text-neutral-600 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="relative py-1 transition-colors after:absolute after:-bottom-0.5 after:left-0 after:h-0.5 after:w-0 after:rounded-full after:bg-[var(--ct-olive)] after:transition-all after:duration-300 hover:text-neutral-900 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto hidden items-center justify-end md:flex">
            <Link
              to="/signup"
              className="mr-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100"
            >
              Sign Up
            </Link>
            <Link
              to="/login"
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              style={{ backgroundColor: palette.ink }}
            >
              Log In
            </Link>
          </div>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-200 bg-white/70 text-neutral-800 transition hover:bg-white md:hidden"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen ? (
          <div className="border-t border-neutral-200/70 bg-white/95 px-4 pb-4 pt-2 backdrop-blur-xl md:hidden">
            <nav className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  to="/signup"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl border border-neutral-200 px-4 py-2.5 text-center text-sm font-semibold text-neutral-700"
                >
                  Sign Up
                </Link>
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-center text-sm font-semibold text-white"
                  style={{ backgroundColor: palette.ink }}
                >
                  Log In
                </Link>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section
          id="top"
          className="overflow-hidden rounded-[28px] bg-white p-4 shadow-[0_18px_60px_rgba(16,36,58,0.10)] sm:p-6"
        >
          <div className="relative overflow-hidden rounded-3xl">
            {loading ? (
              <HeroSkeleton />
            ) : (
              <>
                <img src={heroImage} alt={heroAlt} className="ct-ken-burns h-[440px] w-full object-cover md:h-[560px]" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
                <div className="absolute inset-0 flex items-end p-6 md:p-10">
                  <div className="max-w-2xl text-white">
                    <p className="ct-fade-rise text-xs font-semibold uppercase tracking-[0.18em] text-white/80 md:text-sm">
                      Explore Cavite establishments
                    </p>
                    <h1 className="ct-fade-rise ct-delay-1 mt-3 font-['Poppins',sans-serif] text-4xl font-extrabold leading-[1.02] md:text-6xl">
                      CAVITE TOUR
                    </h1>
                    <p className="ct-fade-rise ct-delay-2 mt-4 max-w-xl text-sm text-white/90 md:text-base">
                      Search the NTDP catalog, browse maps, save lists, follow curated routes, and check terminal
                      guides — your Cavite travel companion in one place.
                    </p>

                    <form
                      onSubmit={submitHeroSearch}
                      className="ct-fade-rise ct-delay-3 mt-6 flex w-full max-w-xl items-center gap-2 rounded-2xl border border-white/20 bg-white/95 p-1.5 shadow-lg backdrop-blur"
                    >
                      <span className="pl-3 text-neutral-400">
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="11" cy="11" r="7" />
                          <path strokeLinecap="round" d="m20 20-3-3" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        value={heroQuery}
                        onChange={(e) => setHeroQuery(e.target.value)}
                        placeholder="Search resorts, falls, museums…"
                        aria-label="Search establishments"
                        className="min-w-0 flex-1 bg-transparent px-1 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5"
                        style={{ backgroundColor: palette.lime }}
                      >
                        Search
                      </button>
                    </form>

                    {heroChips.length > 0 ? (
                      <div className="ct-fade-rise ct-delay-3 mt-4 flex flex-wrap gap-2">
                        {heroChips.map((chip) => (
                          <Link
                            key={chip.value}
                            to={`/search?q=${encodeURIComponent(chip.label)}`}
                            className="rounded-full border border-white/40 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition hover:bg-white/20"
                          >
                            {chip.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {heroPlace?.name ? (
                      <p className="mt-4 text-xs font-medium text-white/75 md:text-sm">
                        Featured: {heroPlace.name}
                        {heroPlace.city_mun ? ` · ${heroPlace.city_mun}` : ''}
                      </p>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <section id="features" className="mt-10 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="ct-reveal rounded-[26px] bg-white p-6 shadow-[0_14px_40px_rgba(16,36,58,0.08)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: palette.lime }}>
              Why CaviTour
            </p>
            <h2 className="mt-2 font-['Poppins',sans-serif] text-3xl font-bold leading-tight md:text-4xl" style={{ color: palette.ink }}>
              Plan Cavite trips with real catalog data
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
              CaviTour connects you to verified establishments, commute-friendly maps, saved lists, and ready-made
              day routes — built for exploring the province, not booking packages.
            </p>
            {statItems.length > 0 ? (
              <div className={`mt-8 grid gap-3 sm:gap-4 ${statItems.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {statItems.map((item) => (
                  <CountUpStat key={item.label} value={item.value} label={item.label} />
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-4">
            {TRUST_CARDS.map((card) => (
              <article
                key={card.title}
                className="ct-reveal ct-lift rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_10px_30px_rgba(16,36,58,0.08)]"
              >
                <div className="flex items-start gap-4">
                  <div className="mt-1 rounded-xl p-2.5 text-white shadow-sm" style={{ backgroundColor: palette.teal }}>
                    <TrustIcon icon={card.icon} />
                  </div>
                  <div>
                    <h3 className="font-['Poppins',sans-serif] text-lg font-semibold" style={{ color: palette.ink }}>
                      {card.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-600">{card.body}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="destinations" className="ct-reveal mt-10 rounded-[26px] bg-white p-6 shadow-[0_14px_40px_rgba(16,36,58,0.08)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em]" style={{ color: palette.lime }}>
                Top Destinations
              </p>
              <h2 className="mt-2 font-['Poppins',sans-serif] text-3xl font-bold md:text-4xl" style={{ color: palette.ink }}>
                From the Cavite NTDP catalog
              </h2>
            </div>
            <Link
              to="/search"
              className="group inline-flex items-center gap-1.5 text-sm font-semibold transition hover:gap-2.5"
              style={{ color: palette.teal }}
            >
              View all
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          {destinationFilters.length > 1 ? (
            <div className="mt-6 flex flex-wrap gap-2.5">
              {destinationFilters.map((filter) => {
                const active = activeDestinationFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setActiveDestinationFilter(filter.value)}
                    className="rounded-full px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ct-olive)] focus-visible:ring-offset-2"
                    style={
                      active
                        ? { backgroundColor: palette.lime, color: '#fff', boxShadow: '0 6px 18px rgba(126,160,14,0.35)' }
                        : { backgroundColor: palette.cloud, color: palette.teal }
                    }
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }, (_, i) => <DestinationCardSkeleton key={i} />)
              : displayDestinations.map((d) => (
                  <Link
                    key={d.id}
                    to={`/search?q=${encodeURIComponent(d.name)}`}
                    className="group ct-lift block overflow-hidden rounded-2xl border border-neutral-200 bg-white"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={d.image}
                        alt={d.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      />
                      {d.categoryLabel ? (
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-neutral-700 shadow-sm backdrop-blur">
                          {d.categoryLabel}
                        </span>
                      ) : null}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3">
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

        <section id="itineraries" className="ct-reveal mt-10 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
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
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30"
            >
              View itineraries
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </article>
          {loading
            ? Array.from({ length: 2 }, (_, i) => <ItineraryCardSkeleton key={i} />)
            : itineraries.map((itin) => (
                <Link key={itin.id} to="/itinerary" className="group ct-lift relative block overflow-hidden rounded-3xl">
                  <img
                    src={itin.image || MARKETING_PLACEHOLDER_IMG}
                    alt={itin.title}
                    loading="lazy"
                    className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-5">
                    <div className="flex h-full flex-col justify-end">
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {itin.route ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 ring-1 ring-white/25 backdrop-blur">
                            {itin.route}
                          </span>
                        ) : null}
                        {itin.stops ? (
                          <span className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 ring-1 ring-white/25 backdrop-blur">
                            {itin.stops} stops
                          </span>
                        ) : null}
                      </div>
                      <h4 className="font-['Poppins',sans-serif] text-2xl font-bold text-white">{itin.title}</h4>
                      <p className="mt-2 text-sm text-white/90">{itin.summary}</p>
                    </div>
                  </div>
                </Link>
              ))}
        </section>

        <section className="ct-reveal mt-10">
          <div
            className="overflow-hidden rounded-[28px] px-6 py-12 text-center shadow-[0_18px_50px_rgba(16,36,58,0.14)] sm:px-10 sm:py-14"
            style={{ background: `linear-gradient(120deg, ${palette.forest}, ${palette.teal}, ${palette.lime})` }}
          >
            <h2 className="font-['Poppins',sans-serif] text-3xl font-extrabold text-white md:text-4xl">
              Ready to explore Cavite?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-white/90 md:text-base">
              Create a free account to save places, build itineraries, and get commute-ready routes.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/signup"
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5"
                style={{ color: palette.teal }}
              >
                Create free account
              </Link>
              <Link
                to="/search"
                className="rounded-xl border border-white/70 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Browse establishments
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/70 py-8" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <div>
            <LogoWordmark className="text-base" />
            <p className="mt-1 text-xs text-neutral-500">Cavite establishment search, maps, and curated routes.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-neutral-600">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-neutral-900">
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-neutral-500">© 2026 CaviTour. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
