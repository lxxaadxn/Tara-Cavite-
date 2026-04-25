import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoWordmark } from '../components/LogoWordmark';

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
    title: 'Local Expertise',
    body: 'Built with local routes, practical commute details, and trusted destination notes.',
  },
  {
    icon: 'booking',
    title: 'All-in-One Booking',
    body: 'Plan destinations, save favorites, and shape your itinerary without switching tools.',
  },
  {
    icon: 'support',
    title: '24/7 Trip Support',
    body: 'Quick assistance while planning and while traveling around Cavite.',
  },
];

const DESTINATIONS = [
  {
    name: 'Tagaytay Ridge',
    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?w=1000&q=80',
    category: 'nature',
    price: 'PHP 1,499',
    meta: 'Cool breeze, scenic views',
  },
  {
    name: 'Silang Cafe Row',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1000&q=80',
    category: 'cafe',
    price: 'PHP 1,200',
    meta: 'Coffee spots and pastry bars',
  },
  {
    name: 'Maragondon Coast',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1000&q=80',
    category: 'beach',
    price: 'PHP 1,650',
    meta: 'Sea breeze and sunset points',
  },
  {
    name: 'Kawit Heritage Walk',
    image: 'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=1000&q=80',
    category: 'heritage',
    price: 'PHP 980',
    meta: 'Historic houses and museums',
  },
];

const PACKAGES = [
  {
    title: 'Island Hopper Adventure',
    image: 'https://images.unsplash.com/photo-1473116763249-2faaef81ccda?w=900&q=80',
    body: 'Beach tour plus island stops and guided snorkeling options.',
  },
  {
    title: 'Northern Highland Escape',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=80',
    body: 'Highland cafes, ridge views, and cozy food spots.',
  },
];

const DESTINATION_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Nature', value: 'nature' },
  { label: 'Cafe', value: 'cafe' },
  { label: 'Beach', value: 'beach' },
  { label: 'Heritage', value: 'heritage' },
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

export function LandingPageClean() {
  const [activeDestinationFilter, setActiveDestinationFilter] = useState('all');
  const filteredDestinations = useMemo(() => {
    if (activeDestinationFilter === 'all') return DESTINATIONS;
    return DESTINATIONS.filter((d) => d.category === activeDestinationFilter);
  }, [activeDestinationFilter]);

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
            <a href="#top" className="transition-colors hover:text-neutral-900">Home</a>
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
            <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80" alt="Scenic Cavite landscape" className="h-[420px] w-full object-cover md:h-[520px]" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-transparent" />
            <div className="absolute inset-0 flex items-end p-6 md:p-10">
              <div className="max-w-2xl text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80 md:text-sm">Your Cavite travel companion</p>
                <h1 className="mt-3 font-['Poppins',sans-serif] text-4xl font-extrabold leading-[1.04] md:text-6xl">CAVITE TOUR</h1>
                <p className="mt-4 max-w-xl text-sm text-white/90 md:text-base">
                  Discover breathtaking destinations, smart itineraries, commute routes, and local food stops in one sleek travel guide.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/search" className="rounded-xl px-5 py-3 text-sm font-semibold text-white md:px-6" style={{ backgroundColor: palette.lime }}>
                    Plan Your Trip
                  </Link>
                  <a href="#destinations" className="rounded-xl border border-white/70 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 md:px-6">
                    Explore Destinations
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-[26px] bg-white p-6 shadow-[0_14px_40px_rgba(16,36,58,0.08)] sm:p-8">
            <h2 className="font-['Poppins',sans-serif] text-3xl font-bold leading-tight md:text-4xl" style={{ color: palette.ink }}>
              Why travelers choose CaviTour for every Cavite adventure
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-600">
              From itinerary creation to commute guidance, CaviTour helps you move faster and plan better with local-first insights.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              {[
                { value: '12k+', label: 'Happy Travelers' },
                { value: '10yrs', label: 'Tour Experience' },
                { value: '50+', label: 'Destinations Covered' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-neutral-200 bg-white p-4 text-center">
                  <p className="text-2xl font-bold" style={{ color: palette.ink }}>{item.value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{item.label}</p>
                </div>
              ))}
            </div>
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
                Discover where your next journey begins
              </h2>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {DESTINATION_FILTERS.map((filter) => (
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredDestinations.map((d) => (
              <Link key={d.name} to="/search" className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                <div className="relative h-56 overflow-hidden">
                  <img src={d.image} alt={d.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <p className="font-['Poppins',sans-serif] text-lg font-semibold text-white">{d.name}</p>
                    <p className="text-xs text-white/80">{d.meta}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section id="itineraries" className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
          <article
            className="rounded-3xl p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${palette.teal}, ${palette.lime})` }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-white/85">Itineraries</p>
            <h3 className="mt-2 font-['Poppins',sans-serif] text-3xl font-bold">Flexible plans for every traveler</h3>
            <p className="mt-3 max-w-md text-sm text-white/90">Affordable day tours, barkada escapes, and family-ready plans curated for Cavite routes.</p>
          </article>
          {PACKAGES.map((pkg) => (
            <article key={pkg.title} className="relative overflow-hidden rounded-3xl">
              <img src={pkg.image} alt={pkg.title} className="h-[240px] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-5">
                <div className="mt-auto flex h-full flex-col justify-end">
                  <h4 className="font-['Poppins',sans-serif] text-2xl font-bold text-white">{pkg.title}</h4>
                  <p className="mt-2 text-sm text-white/90">{pkg.body}</p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
      <footer className="border-t border-white/70 py-8" style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-center sm:px-6 md:flex-row md:text-left lg:px-8">
          <div>
            <LogoWordmark className="text-base" />
            <p className="mt-1 text-xs text-neutral-500">Sleek travel planning for Cavite explorers.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-neutral-600">
            <a href="#top" className="hover:text-neutral-900">Home</a>
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
