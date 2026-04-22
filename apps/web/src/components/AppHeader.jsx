import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogoWordmark } from './LogoWordmark';
const olive = '#7ea00e';
function navMatch(pathname, to) {
    if (to === '/search')
        return pathname === '/search' || pathname.startsWith('/place/');
    if (to === '/terminals')
        return pathname === '/terminals' || pathname.startsWith('/terminals/');
    return pathname === to || pathname.startsWith(`${to}/`);
}
export function AppHeader() {
    const { pathname } = useLocation();
    const nav = [
        { to: '/search', label: 'Search' },
        { to: '/saved', label: 'Saved' },
        { to: '/itinerary', label: 'Itinerary' },
        { to: '/terminals', label: 'Terminals' },
    ];
    return (<header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        <Link to="/search" className="shrink-0" aria-label="CaviTour home">
          <LogoWordmark />
        </Link>

        <nav className="hidden md:flex items-center gap-8 lg:gap-10 absolute left-1/2 -translate-x-1/2">
          {nav.map(({ to, label }) => {
            const isActive = navMatch(pathname, to);
            return (<NavLink key={to} to={to} className="font-['Poppins',Inter,sans-serif] text-[15px] font-medium pb-1 border-b-2 transition-colors text-neutral-600 hover:text-neutral-900 border-transparent" style={{
                    color: isActive ? olive : undefined,
                    borderBottomColor: isActive ? olive : 'transparent',
                    fontWeight: isActive ? 600 : 500,
                }}>
                {label}
              </NavLink>);
        })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/saved"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 transition hover:bg-neutral-50"
            aria-label="Saved"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6.02 6.02 0 0 1 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54z" />
            </svg>
          </Link>
          <Link to="/profile" className="relative rounded-full ring-2 ring-white shadow-md overflow-hidden w-10 h-10 block" aria-label="Profile">
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80" alt="" className="w-full h-full object-cover"/>
            <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ backgroundColor: olive }} aria-hidden/>
          </Link>
        </div>
      </div>

      <div className="md:hidden flex overflow-x-auto gap-1 px-4 pb-2 border-t border-neutral-100 bg-white">
        {nav.map(({ to, label }) => {
            const isActive = navMatch(pathname, to);
            return (<NavLink key={to} to={to} className="whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium text-neutral-600" style={isActive
                    ? { backgroundColor: 'rgba(126, 160, 14, 0.15)', color: olive, fontWeight: 600 }
                    : {}}>
              {label}
            </NavLink>);
        })}
      </div>
    </header>);
}
