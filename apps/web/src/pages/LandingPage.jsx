import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoWordmark } from '../components/LogoWordmark';
/** Brand palette (unchanged) */
const olive = '#86a11d';
const teal = '#1f4f59';
const forest = '#213502';
const ink = '#241d13';
const cream = '#f4f1eb';
function IconPin({ className }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 22s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <circle cx="12" cy="11" r="2.2" fill="currentColor"/>
    </svg>);
}
function IconMap({ className }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M9 4v14M15 6v14" stroke="currentColor" strokeWidth="1.8"/>
    </svg>);
}
function IconSearch({ className }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>);
}
function IconBus({ className }) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 17h14v-9a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v9zM3 17h2M19 17h2M7 17v2M17 17v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 8h10M7 11h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="8" cy="17" r="1.5" fill="currentColor"/>
      <circle cx="16" cy="17" r="1.5" fill="currentColor"/>
    </svg>);
}
const FEATURES = [
    {
        Icon: IconPin,
        accent: olive,
        text: 'Provides a comprehensive directory of tourist destinations categorized by city or municipality and type of attraction. Includes descriptions, photos, operating hours to help users plan their visits effectively.',
    },
    {
        Icon: IconMap,
        accent: olive,
        text: 'An integrated map allows users to view the exact locations of tourist spots and access navigation directions from their current location.',
    },
    {
        Icon: IconSearch,
        accent: teal,
        text: 'Users can search and filter destinations based on location, category, or popularity, save favorite places, and create simple travel itineraries.',
    },
    {
        Icon: IconBus,
        accent: teal,
        text: 'Includes a transportation guide that provides information on available public transportation options such as jeepneys, buses, and vans. Assists users in identifying routes, and estimated travel times when traveling within the province.',
    },
];
const DESTINATIONS = [
    {
        name: 'Tagaytay',
        body: 'A majestic volcanic island nestled within Taal Lake, offering breathtaking views and a unique trekking experience just a short drive from Tagaytay.',
        image: 'https://images.unsplash.com/photo-1585155770424-fb0291a69c43?w=1200&q=80',
        alt: 'Taal Lake and lush hills near Tagaytay',
    },
    {
        name: 'Silang',
        body: 'A charming spot in Silang, surrounded by vibrant flower gardens and scenic landscapes perfect for nature lovers, photo ops, and relaxing strolls.',
        image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80',
        alt: 'Flower garden and green landscape',
    },
    {
        name: 'Maragondon',
        body: 'A quiet coastal escape in Maragondon, ideal for swimming, picnics, and enjoying serene seaside sunsets away from the crowds.',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80',
        alt: 'Calm beach and coastline',
    },
];
const NAV = [
    { label: 'Intro', href: '#top' },
    { label: 'Features', href: '#features' },
    { label: 'Places', href: '#places' },
];
export function LandingPage() {
    const [solidNav, setSolidNav] = useState(false);
    useEffect(() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduce)
            document.documentElement.style.scrollBehavior = 'smooth';
        return () => {
            document.documentElement.style.scrollBehavior = '';
        };
    }, []);
    useEffect(() => {
        const onScroll = () => setSolidNav(window.scrollY > 24);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    return (<div id="top" className="landing-v2 min-h-screen text-[var(--ct-ink)] antialiased" style={{ backgroundColor: cream, color: ink }}>
      {/* Nav */}
      <header className={`fixed top-0 right-0 left-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300 ${solidNav
            ? 'border-b border-black/[0.06] bg-[rgba(244,241,235,0.92)] shadow-[0_12px_40px_rgba(33,53,2,0.06)] backdrop-blur-lg'
            : 'border-b border-transparent bg-transparent'}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-[4.25rem] sm:px-8">
          <Link to="/" className="shrink-0 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86a11d]/50 focus-visible:ring-offset-2" aria-label="CaviTour home">
            <LogoWordmark variant="sans"/>
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Sections">
            {NAV.map(({ label, href }) => (<a key={href} href={href} className="rounded-full px-3 py-2 font-['Inter',sans-serif] text-[13px] font-semibold tracking-wide text-[var(--ct-ink)]/55 transition-colors hover:bg-black/[0.05] hover:text-[var(--ct-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#86a11d]/40">
                {label}
              </a>))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="font-['Inter',sans-serif] text-sm font-semibold hover:opacity-80 sm:text-[15px]" style={{ color: teal }}>
              Log In
            </Link>
            <Link to="/signup" className="rounded-full px-4 py-2.5 font-['Inter',sans-serif] text-sm font-semibold text-white transition hover:brightness-105 sm:px-5 sm:text-[15px]" style={{ backgroundColor: olive, boxShadow: `0 4px 20px ${olive}44` }}>
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-[min(100svh,920px)] overflow-hidden pt-24 pb-16 sm:pb-24">
        <div className="pointer-events-none absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 80% 60% at 100% 0%, rgba(134, 161, 29, 0.18), transparent 55%),
              radial-gradient(ellipse 70% 50% at 0% 100%, rgba(31, 79, 89, 0.12), transparent 50%),
              linear-gradient(165deg, ${cream} 0%, #ebe6dc 100%)
            `,
        }} aria-hidden/>
        <div className="pointer-events-none absolute top-24 right-0 h-[min(70vw,480px)] w-[min(70vw,480px)] rounded-full opacity-30 blur-3xl sm:top-16" style={{ background: olive }} aria-hidden/>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 sm:gap-16 sm:px-8 lg:grid-cols-12 lg:items-center lg:gap-10">
          <div className="lg:col-span-6 lg:col-start-1">
            <h1 className="font-['Poppins',sans-serif] text-[clamp(2.75rem,7vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.03em]">
              Your guide
              <br />
              to exploring
              <br />
              <span style={{ color: olive }}>Cavite</span>
              <span className="text-[var(--ct-ink)]/25">.</span>
            </h1>
            <p className="mt-8 max-w-md font-['Inter',sans-serif] text-base leading-relaxed text-[var(--ct-ink)]/72 sm:text-lg">
              Your go-to tourist guide for discovering Cavite’s destinations, routes, food spots, and hidden gems all
              in one app.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/login" className="inline-flex items-center justify-center rounded-full px-8 py-3.5 font-['Inter',sans-serif] text-base font-semibold text-white transition hover:brightness-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{
            backgroundColor: forest,
            boxShadow: `0 8px 28px rgba(33, 53, 2, 0.25)`,
        }}>
                Start Exploring
              </Link>
              <button type="button" className="inline-flex items-center justify-center rounded-full border-2 bg-transparent px-8 py-3.5 font-['Inter',sans-serif] text-base font-semibold transition hover:bg-black/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2" style={{ borderColor: teal, color: teal }}>
                Download the App
              </button>
            </div>
          </div>

          <div className="relative lg:col-span-5 lg:col-start-8">
            <div className="absolute -inset-3 -z-10 rounded-[2rem] opacity-40 blur-2xl sm:-inset-4" style={{
            background: `linear-gradient(135deg, ${olive}66, ${teal}44)`,
        }} aria-hidden/>
            <figure className="relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-[1.75rem] shadow-[0_24px_60px_rgba(33,53,2,0.2)] ring-1 ring-black/[0.06] sm:mx-auto lg:ml-auto lg:mr-0 lg:max-w-none">
              <img src="https://images.unsplash.com/photo-1590736969955-71cc94901144?w=900&q=80" alt="Historic landmark in Cavite — Aguinaldo Shrine" className="h-full w-full object-cover" width={720} height={900}/>
            </figure>
          </div>
        </div>
      </section>

      {/* Features — dark band */}
      <section id="features" className="relative scroll-mt-20 py-20 sm:scroll-mt-24 sm:py-28" style={{ backgroundColor: forest }}>
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }} aria-hidden/>
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="font-['Inter',sans-serif] text-xs font-bold uppercase tracking-[0.3em] text-white/40">Features</p>
            <h2 className="mt-4 font-['Poppins',sans-serif] text-[clamp(1.85rem,4vw,3rem)] font-bold leading-[1.1] tracking-[-0.02em] text-white">
              Discover, navigate, and plan your Cavite adventure all in one place.
            </h2>
          </div>

          <div className="mt-14 grid gap-10 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-14 lg:gap-x-16">
            {FEATURES.map(({ Icon, accent, text }, i) => (<div key={i} className="group relative pl-6 sm:pl-8">
                <div className="absolute top-1 left-0 h-[calc(100%-0.25rem)] w-px" style={{ background: `linear-gradient(180deg, ${accent}, transparent)` }} aria-hidden/>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition group-hover:border-white/20" style={{ color: accent }}>
                    <Icon className="h-6 w-6"/>
                  </div>
                  <p className="font-['Inter',sans-serif] text-[15px] leading-[1.65] text-white/78">{text}</p>
                </div>
              </div>))}
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section id="places" className="scroll-mt-20 py-20 sm:scroll-mt-24 sm:py-28" style={{ backgroundColor: '#e8e4dc' }}>
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-['Poppins',sans-serif] text-[clamp(2rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-[-0.03em]">
            <span style={{ color: olive }}>Destinations</span>
            <br />
            <span className="text-[var(--ct-ink)]/80">waiting for you</span>
          </h2>

          <div className="mt-16 flex flex-col gap-20 sm:gap-24 lg:gap-28">
            {DESTINATIONS.map((d, idx) => (<article key={d.name} className={`flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-12 ${idx % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
                <div className="relative isolate flex flex-1 flex-col justify-center lg:max-w-md">
                  <span className="pointer-events-none absolute -left-1 -top-2 font-['Poppins',sans-serif] text-[4.5rem] font-bold leading-none tabular-nums opacity-[0.07] sm:-top-3 sm:text-[6.5rem]" style={{ color: forest }} aria-hidden>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h3 className="relative mt-10 font-['Poppins',sans-serif] text-3xl font-bold tracking-tight text-[var(--ct-ink)] sm:mt-12 sm:text-4xl">
                    {d.name}
                  </h3>
                  <p className="mt-5 font-['Inter',sans-serif] text-base leading-relaxed text-[var(--ct-ink)]/70">
                    {d.body}
                  </p>
                </div>
                <div className="min-h-0 flex-1 lg:min-h-[22rem]">
                  <div className="h-full min-h-[14rem] overflow-hidden rounded-2xl shadow-xl ring-1 ring-black/[0.08] sm:min-h-[18rem] lg:min-h-full">
                    <img src={d.image} alt={d.alt} className="h-full w-full object-cover" width={960} height={640} loading="lazy"/>
                  </div>
                </div>
              </article>))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 text-white sm:py-20" style={{ backgroundColor: forest }}>
        <div className="mx-auto flex max-w-6xl flex-col gap-12 px-5 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div>
            <LogoWordmark light variant="sans"/>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 font-['Inter',sans-serif] text-sm font-semibold">
            <a href="#top" className="text-white/80 transition hover:text-white">
              Overview
            </a>
            <a href="#features" className="text-white/80 transition hover:text-white">
              Features
            </a>
            <a href="#features" className="text-white/80 transition hover:text-white">
              Help
            </a>
            <a href="#top" className="text-white/80 transition hover:text-white">
              Privacy
            </a>
          </nav>
        </div>
        <div className="mx-auto mt-14 max-w-6xl border-t border-white/10 px-5 pt-8 sm:px-8">
          <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
            <p className="font-['Inter',sans-serif] text-xs text-white/45 sm:text-sm">© 2026 CaviTour. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-4 font-['Inter',sans-serif] text-xs text-white/45 sm:text-sm">
              <a href="#top" className="hover:text-white/80">
                Terms
              </a>
              <a href="#top" className="hover:text-white/80">
                Privacy
              </a>
              <a href="#top" className="hover:text-white/80">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>);
}
