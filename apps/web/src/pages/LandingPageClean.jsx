import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublishedItineraries, subscribeItineraries } from 'cavitour-shared/itineraries';
import { parseSiteContentIdList, SITE_CONTENT_DEFAULTS, siteContentValue } from 'cavitour-shared/siteContent';
import { LogoWordmark } from '../components/LogoWordmark';
import { fetchAppFilterCategoryOptions } from '../lib/appFilterCategories';
import { buildEnrichedItinerary } from '../lib/itineraryPlaces';
import {
  MARKETING_PLACEHOLDER_IMG,
  buildMarketingStats,
  fetchLandingActiveUserCount,
  formatStatCount,
  pickLandingDestinationCards,
  pickLandingItineraries,
} from '../lib/marketingPlaces';
import { fetchAllPlacesFromSupabase } from '../lib/placesFromSupabase';
import { supabase } from '../lib/supabase';
import { useSiteContent } from '../lib/useSiteContent';

const palette = {
  ink: 'var(--ct-ink)',
  lime: 'var(--ct-olive)',
  teal: 'var(--ct-teal)',
  forest: 'var(--ct-forest)',
  cream: 'var(--ct-cream)',
  cloud: 'var(--ct-pale-green)',
};

function landingNav(cms) {
  return [
    { href: '#app-features', label: siteContentValue(cms, 'landing.nav.features') },
    { href: '#destinations', label: siteContentValue(cms, 'landing.nav.destinations') },
    { href: '#itineraries', label: siteContentValue(cms, 'landing.nav.itineraries') },
  ];
}

function landingFeatureCards(cms) {
  return [1, 2, 3, 4].map((i) => ({
    n: siteContentValue(cms, `landing.features.${i}.n`),
    title: siteContentValue(cms, `landing.features.${i}.title`),
    body: siteContentValue(cms, `landing.features.${i}.body`),
    to: siteContentValue(cms, `landing.features.${i}.href`),
    image: siteContentValue(cms, `landing.features.${i}.image_url`),
  }));
}

function LandingCmsLink({ to, className, children }) {
  const href = String(to || '').trim() || '/';
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}

function HeroSkeleton() {
  return <div className="landing-apex-hero-skel animate-pulse" />;
}

function ItineraryCardSkeleton() {
  return <div className="h-[240px] animate-pulse rounded-3xl bg-[#e8f0ee]" />;
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

function whySectionBody(cms) {
  const live = String(cms?.['landing.why.body'] ?? '').trim();
  const stale =
    /built specifically for commute-ready/i.test(live) ||
    /^use interactive route maps,/i.test(live);
  if (!live || stale) return SITE_CONTENT_DEFAULTS['landing.why.body'];
  return live;
}

/** Counts up to a numeric target once visible; keeps any non-digit suffix like "+". */
function CountUpStat({ value, label }) {
  const raw = String(value ?? '');
  const hasDigits = /\d/.test(raw);
  const ref = useRef(null);
  const started = useRef(false);
  const target = useMemo(() => parseInt(raw.replace(/[^\d]/g, ''), 10) || 0, [raw]);
  const suffix = useMemo(() => raw.replace(/[\d,]/g, ''), [raw]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!hasDigits) return undefined;
    if (started.current) {
      setDisplay(target);
      return undefined;
    }
    const node = ref.current;
    if (!node) return undefined;
    const prefersReduced =
      typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || !('IntersectionObserver' in window)) {
      started.current = true;
      setDisplay(target);
      return undefined;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        started.current = true;
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
  }, [target, hasDigits]);

  return (
    <div ref={ref}>
      <p className="font-['Poppins',sans-serif] text-4xl font-bold leading-none tracking-tight md:text-5xl" style={{ color: palette.ink }}>
        {hasDigits ? (
          <>
            {display}
            {suffix}
          </>
        ) : (
          raw
        )}
      </p>
      <p className="mt-2 max-w-[13rem] text-sm leading-snug text-[var(--ct-ink)]/55">{label}</p>
    </div>
  );
}

export function LandingPageClean() {
  const cms = useSiteContent();
  const [loading, setLoading] = useState(true);
  const [catalogPlaces, setCatalogPlaces] = useState([]);
  const [ntdpFilterOptions, setNtdpFilterOptions] = useState([]);
  const [publishedItineraries, setPublishedItineraries] = useState([]);
  const [stats, setStats] = useState(null);
  const [publishedItineraryCount, setPublishedItineraryCount] = useState(0);
  const [activeUserCount, setActiveUserCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navLinks = useMemo(() => landingNav(cms), [cms]);
  const whyCopy = useMemo(() => whySectionBody(cms), [cms]);
  const featureCards = useMemo(() => landingFeatureCards(cms), [cms]);
  const heroImage = siteContentValue(cms, 'landing.hero.image_url');
  const heroAlt = siteContentValue(cms, 'landing.hero.image_alt');
  const placeIds = useMemo(
    () => parseSiteContentIdList(siteContentValue(cms, 'landing.destinations.place_ids')),
    [cms]
  );
  const itineraryIds = useMemo(
    () => parseSiteContentIdList(siteContentValue(cms, 'landing.trails.itinerary_ids')),
    [cms]
  );
  const destinations = useMemo(
    () => pickLandingDestinationCards(catalogPlaces, placeIds, { limit: 4 }),
    [catalogPlaces, placeIds]
  );
  const destinationCategories = useMemo(() => {
    const chips = [];
    const seen = new Set();
    for (const opt of ntdpFilterOptions) {
      const label = String(opt.label || opt.ntdpName || opt.key || '').trim();
      const fold = label.toLowerCase();
      if (!label || seen.has(fold)) continue;
      seen.add(fold);
      chips.push(label);
    }
    return chips;
  }, [ntdpFilterOptions]);
  const itineraries = useMemo(
    () =>
      pickLandingItineraries(publishedItineraries, itineraryIds, { limit: 4 })
        .map((template) => buildEnrichedItinerary(template, catalogPlaces))
        .filter(Boolean),
    [publishedItineraries, itineraryIds, catalogPlaces]
  );

  useEffect(() => {
    let cancelled = false;

    async function load({ silent = false } = {}) {
      if (!silent) setLoading(true);
      const [placesResult, publishedResult, ntdpResult] = await Promise.allSettled([
        fetchAllPlacesFromSupabase(supabase),
        fetchPublishedItineraries(supabase),
        fetchAppFilterCategoryOptions(),
      ]);
      if (cancelled) return;

      const places = placesResult.status === 'fulfilled' ? placesResult.value : [];
      const published = publishedResult.status === 'fulfilled' ? publishedResult.value : [];
      const ntdpOptions = ntdpResult.status === 'fulfilled' ? ntdpResult.value : [];

      setCatalogPlaces(places);
      setPublishedItineraries(published);
      setNtdpFilterOptions(ntdpOptions);
      setStats(places.length ? buildMarketingStats(places) : null);
      setPublishedItineraryCount(published.length);
      if (!silent) setLoading(false);
    }

    load();
    const refreshActiveUsers = () => {
      fetchLandingActiveUserCount(supabase).then((n) => {
        if (!cancelled) setActiveUserCount(n);
      });
    };
    refreshActiveUsers();
    const activeUsersTimer = window.setInterval(refreshActiveUsers, 20000);
    const unsub = subscribeItineraries(supabase, () => {
      load({ silent: true });
    });
    return () => {
      cancelled = true;
      window.clearInterval(activeUsersTimer);
      unsub();
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useRevealOnScroll([loading, destinations.length, itineraries.length]);

  const statItems = useMemo(() => {
    const items = [];
    const establishments = stats ? formatStatCount(stats.establishmentCount) : '';
    const municipalities = stats ? formatStatCount(stats.municipalityCount) : '';
    if (establishments) {
      items.push({ value: establishments, label: siteContentValue(cms, 'landing.why.stat_establishments') });
    }
    if (municipalities) {
      items.push({ value: municipalities, label: siteContentValue(cms, 'landing.why.stat_municipalities') });
    }
    if (publishedItineraryCount > 0) {
      items.push({
        value: String(publishedItineraryCount),
        label: siteContentValue(cms, 'landing.why.stat_routes'),
      });
    }
    items.push({
      value: String(Math.max(0, activeUserCount)),
      label: siteContentValue(cms, 'landing.why.stat_users'),
    });
    return items;
  }, [cms, stats, publishedItineraryCount, activeUserCount]);

  const displayDestinations = loading ? [] : destinations;

  const bento = displayDestinations.slice(0, 4);

  return (
    <div className="landing-apex relative min-h-screen font-['Poppins',sans-serif]">
      <header
        className={`sticky top-0 z-50 bg-[var(--ct-cream)]/95 transition-shadow ${
          scrolled ? 'shadow-[0_8px_24px_rgba(22,53,46,0.08)]' : ''
        }`}
      >
        <div className="landing-apex-header-bar mx-auto flex max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link to="/" className="shrink-0">
            <LogoWordmark className="text-base" />
          </Link>
          <nav className="ml-auto hidden items-center gap-7 text-[13px] font-medium text-[var(--ct-ink)]/70 lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition hover:text-[var(--ct-ink)]">
                {link.label}
              </a>
            ))}
            <Link to="/login" className="landing-apex-pill !px-5 !py-2 text-[13px]">
              Log In
            </Link>
          </nav>
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#d7e3df] bg-white text-[var(--ct-ink)] lg:hidden"
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
          <div className="border-t border-[#e4eeeb] bg-white px-4 pb-4 pt-2 lg:hidden">
            <nav className="flex flex-col">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-[var(--ct-ink)]"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-2">
                <Link
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                  className="landing-apex-pill block text-center text-sm"
                >
                  Log In
                </Link>
              </div>
            </nav>
          </div>
        ) : null}
      </header>

      <section id="top" className="landing-apex-hero-shell" aria-label="Corregidor Island">
        <div className="landing-apex-hero-card">
          <div className="landing-apex-hero-photo">
            {loading ? (
              <HeroSkeleton />
            ) : (
              <img src={heroImage} alt={heroAlt} className="landing-apex-hero-img" />
            )}
          </div>
          <div className="landing-apex-hero-copy">
            <h1>{siteContentValue(cms, 'landing.hero.headline')}</h1>
            <p>{siteContentValue(cms, 'landing.hero.subtitle')}</p>
          </div>
          <div className="landing-apex-hero-cutout">
            <LandingCmsLink to={siteContentValue(cms, 'landing.hero.cta_href')} className="landing-apex-hero-cta">
              {siteContentValue(cms, 'landing.hero.cta')}
            </LandingCmsLink>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8">
        <section id="features" className="ct-reveal grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="font-['Poppins',sans-serif] text-xl font-bold tracking-tight text-[var(--ct-ink)] md:text-2xl">
              {siteContentValue(cms, 'landing.why.heading')}
            </p>
            <p className="landing-apex-why-copy mt-4 max-w-2xl">{whyCopy}</p>
          </div>
          {statItems.length > 0 ? (
            <div className="landing-apex-stats">
              {statItems.slice(0, 4).map((item) => (
                <CountUpStat key={item.label} value={item.value} label={item.label} />
              ))}
            </div>
          ) : null}
        </section>

        <section id="app-features" className="ct-reveal mt-20">
          <h2 className="mb-8 font-['Poppins',sans-serif] text-2xl font-bold tracking-tight md:text-3xl">
            {siteContentValue(cms, 'landing.features.heading')}
          </h2>
          <div className="landing-apex-features">
            {featureCards.map((card) => (
              <LandingCmsLink key={card.title} to={card.to} className="landing-apex-feature group">
                <div className="landing-apex-feature-photo">
                  <img src={card.image} alt="" />
                </div>
                <h3 className="mt-3 text-[15px] font-semibold">{card.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--ct-ink)]/50">{card.body}</p>
              </LandingCmsLink>
            ))}
          </div>
        </section>

        <section id="destinations" className="ct-reveal mt-28 md:mt-32">
          <div className="landing-apex-bento">
            <div className="landing-apex-bento-intro flex flex-col justify-start pb-2">
              <h2 className="font-['Poppins',sans-serif] text-2xl font-bold leading-tight tracking-tight md:text-[1.85rem]">
                {siteContentValue(cms, 'landing.destinations.heading')}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--ct-ink)]/55">
                {siteContentValue(cms, 'landing.destinations.body')}
              </p>
              {destinationCategories.length > 0 ? (
                <ul className="landing-apex-cats">
                  {destinationCategories.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            {loading
              ? Array.from({ length: 4 }, (_, i) => (
                  <div key={i} className="landing-apex-bento-tile animate-pulse bg-[#e8f0ee]" />
                ))
              : (
                <>
                  {bento[0] ? (
                    <Link to={`/search?q=${encodeURIComponent(bento[0].name)}`} className="landing-apex-bento-tile landing-apex-bento-tall-a">
                      <img src={bento[0].image} alt={bento[0].name} />
                      <p className="landing-apex-bento-cap">{bento[0].name}</p>
                    </Link>
                  ) : null}
                  {bento[1] ? (
                    <Link to={`/search?q=${encodeURIComponent(bento[1].name)}`} className="landing-apex-bento-tile landing-apex-bento-mid-a">
                      <img src={bento[1].image} alt={bento[1].name} />
                      <p className="landing-apex-bento-cap">{bento[1].name}</p>
                    </Link>
                  ) : null}
                  {bento[2] ? (
                    <Link to={`/search?q=${encodeURIComponent(bento[2].name)}`} className="landing-apex-bento-tile landing-apex-bento-mid-b">
                      <img src={bento[2].image} alt={bento[2].name} />
                      <p className="landing-apex-bento-cap">{bento[2].name}</p>
                    </Link>
                  ) : null}
                  {bento[3] ? (
                    <Link to={`/search?q=${encodeURIComponent(bento[3].name)}`} className="landing-apex-bento-tile landing-apex-bento-tall-b">
                      <img src={bento[3].image} alt={bento[3].name} />
                      <p className="landing-apex-bento-cap">{bento[3].name}</p>
                    </Link>
                  ) : null}
                </>
              )}
          </div>
          {!loading && displayDestinations.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ct-ink)]/50">
              Establishment highlights will appear here once the catalog loads.
            </p>
          ) : null}
        </section>

        <section id="itineraries" className="ct-reveal mt-20">
          <div className="mb-8">
            <h2 className="font-['Poppins',sans-serif] text-2xl font-bold tracking-tight md:text-3xl">
              {siteContentValue(cms, 'landing.trails.heading')}
            </h2>
            <p className="mt-2 max-w-md text-sm text-[var(--ct-ink)]/55">
              {siteContentValue(cms, 'landing.trails.body')}
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }, (_, i) => <ItineraryCardSkeleton key={i} />)
              : itineraries.map((itin) => (
                  <Link key={itin.id} to={`/itinerary/${itin.id}`} className="group relative block overflow-hidden rounded-[1.5rem]">
                    <img
                      src={itin.image || MARKETING_PLACEHOLDER_IMG}
                      alt={itin.title}
                      loading="lazy"
                      className="h-[240px] w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--ct-ink)]/80 via-[var(--ct-ink)]/20 to-transparent p-5">
                      <div className="flex h-full flex-col justify-end">
                        <h4 className="text-2xl font-bold text-white">{itin.title}</h4>
                        <p className="mt-2 text-sm text-white/85">{itin.summary}</p>
                      </div>
                    </div>
                  </Link>
                ))}
          </div>
          {!loading && itineraries.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--ct-ink)]/50">
              {publishedItineraryCount === 0
                ? 'Published itineraries from Itinerary Management will appear here.'
                : 'Selected landing itineraries could not be matched. Open Landing Page → Catalog and pick published routes again.'}
            </p>
          ) : null}
        </section>
      </main>

      <footer className="border-t border-[#e4eeeb] bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <div>
            <LogoWordmark className="text-base" />
            <p className="mt-1 text-xs text-[var(--ct-ink)]/50">{siteContentValue(cms, 'landing.footer.tagline')}</p>
            {siteContentValue(cms, 'landing.footer.contact_email') ||
            siteContentValue(cms, 'landing.footer.contact_phone') ? (
              <p className="mt-1 text-xs text-[var(--ct-ink)]/50">
                {siteContentValue(cms, 'landing.footer.contact_email') ? (
                  <a href={`mailto:${siteContentValue(cms, 'landing.footer.contact_email')}`}>
                    {siteContentValue(cms, 'landing.footer.contact_email')}
                  </a>
                ) : null}
                {siteContentValue(cms, 'landing.footer.contact_email') &&
                siteContentValue(cms, 'landing.footer.contact_phone')
                  ? ' · '
                  : null}
                {siteContentValue(cms, 'landing.footer.contact_phone') || null}
              </p>
            ) : null}
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-[var(--ct-ink)]/60">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="hover:text-[var(--ct-ink)]">
                {link.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-[var(--ct-ink)]/45">{siteContentValue(cms, 'landing.footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
