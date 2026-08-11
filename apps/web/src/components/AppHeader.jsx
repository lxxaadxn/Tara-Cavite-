import { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { LogoWordmark } from './LogoWordmark';
import { resolveAvatarFromSources, resolveAvatarUrl } from 'cavitour-shared/defaultAvatar';
import { supabase } from '../lib/supabase';
const olive = '#7ea00e';
function navMatch(pathname, to) {
    if (to === '/search')
        return pathname === '/search' || pathname.startsWith('/place/');
    return pathname === to || pathname.startsWith(`${to}/`);
}
export function AppHeader() {
    const { pathname } = useLocation();
    const [avatarUrl, setAvatarUrl] = useState(() => resolveAvatarUrl(null));

    useEffect(() => {
        let cancelled = false;
        const loadAvatar = async () => {
            const { data } = await supabase.auth.getUser();
            const u = data?.user ?? null;
            if (!u) {
                if (!cancelled)
                    setAvatarUrl(resolveAvatarUrl(null));
                return;
            }
            const { data: profileRow } = await supabase
                .from('user_profiles')
                .select('avatar_url')
                .eq('id', u.id)
                .maybeSingle();
            const metadata = u.user_metadata ?? {};
            const photo = resolveAvatarFromSources(profileRow, metadata);
            if (!cancelled)
                setAvatarUrl(photo);
        };
        loadAvatar();
        const onAvatarBump = () => {
            void loadAvatar();
        };
        window.addEventListener('cavitour:avatar-updated', onAvatarBump);
        const { data: { subscription }, } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                if (!cancelled)
                    setAvatarUrl(resolveAvatarUrl(null));
                return;
            }
            const u = session?.user ?? null;
            if (!u) return;
            void (async () => {
                const { data: profileRow } = await supabase
                    .from('user_profiles')
                    .select('avatar_url')
                    .eq('id', u.id)
                    .maybeSingle();
                if (cancelled) return;
                const metadata = u.user_metadata ?? {};
                setAvatarUrl(resolveAvatarFromSources(profileRow, metadata));
            })();
        });
        return () => {
            cancelled = true;
            window.removeEventListener('cavitour:avatar-updated', onAvatarBump);
            subscription.unsubscribe();
        };
    }, []);

    const nav = [
        { to: '/search', label: 'Search' },
        { to: '/saved', label: 'Saved' },
        { to: '/itinerary', label: 'Itinerary' },
    ];
    return (<header className="sticky top-0 z-40 bg-white border-b border-neutral-200/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between gap-4">
        <Link to="/search" className="shrink-0" aria-label="Tara, Cavite!">
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
          <Link to="/profile" className="relative rounded-full ring-2 ring-white shadow-md overflow-hidden w-10 h-10 block" aria-label="Profile">
            <img src={avatarUrl} alt="" className="w-full h-full object-cover"/>
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
