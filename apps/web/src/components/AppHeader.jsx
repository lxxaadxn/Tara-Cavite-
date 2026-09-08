import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { LogoWordmark } from './LogoWordmark';
import { NotificationsPopover } from './NotificationsPopover';
import { resolveAvatarFromSources, resolveAvatarUrl } from 'cavitour-shared/defaultAvatar';
import { subscribeAnnouncementsChanged, unreadAnnouncementCount } from 'cavitour-shared/announcements';
import { supabase } from '../lib/supabase';

function navMatch(pathname, to) {
  if (to === '/search') return pathname === '/search' || pathname.startsWith('/place/');
  return pathname === to || pathname.startsWith(`${to}/`);
}

function headerDisplayName(user, profileRow) {
  const meta = user?.user_metadata ?? {};
  const first = String(meta.first_name || '').trim();
  const last = String(meta.last_name || '').trim();
  if (first && last) return `${first} ${last[0].toUpperCase()}.`;
  const full = String(meta.full_name || meta.name || '').trim();
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
    return parts[0];
  }
  const nick = String(profileRow?.username || meta.nickname || meta.username || '').trim();
  if (nick) return nick;
  const local = String(user?.email || '').split('@')[0];
  return local || 'Traveler';
}

export function AppHeader({ embedded = false }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const notifRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() => resolveAvatarUrl(null));
  const [displayName, setDisplayName] = useState('Traveler');
  const [email, setEmail] = useState('');
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      const { data } = await supabase.auth.getUser();
      const u = data?.user ?? null;
      if (!u) {
        if (!cancelled) {
          setAvatarUrl(resolveAvatarUrl(null));
          setDisplayName('Traveler');
          setEmail('');
        }
        return;
      }
      const { data: profileRow } = await supabase
        .from('user_profiles')
        .select('avatar_url, username')
        .eq('id', u.id)
        .maybeSingle();
      if (cancelled) return;
      const metadata = u.user_metadata ?? {};
      setAvatarUrl(resolveAvatarFromSources(profileRow, metadata));
      setDisplayName(headerDisplayName(u, profileRow));
      setEmail(u.email || '');
    };
    loadProfile();
    const onAvatarBump = () => {
      void loadProfile();
    };
    window.addEventListener('cavitour:avatar-updated', onAvatarBump);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (!cancelled) {
          setAvatarUrl(resolveAvatarUrl(null));
          setDisplayName('Traveler');
          setEmail('');
          setMenuOpen(false);
          setNotifOpen(false);
        }
        return;
      }
      const u = session?.user ?? null;
      if (!u) return;
      void loadProfile();
    });
    return () => {
      cancelled = true;
      window.removeEventListener('cavitour:avatar-updated', onAvatarBump);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadUnread = async () => {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) {
        if (!cancelled) setUnread(0);
        return;
      }
      try {
        const count = await unreadAnnouncementCount(supabase, userId);
        if (!cancelled) setUnread(count);
      } catch {
        if (!cancelled) setUnread(0);
      }
    };
    void loadUnread();
    const unsubscribe = subscribeAnnouncementsChanged(() => {
      void loadUnread();
    });
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadUnread();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [pathname]);

  useEffect(() => {
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen && !notifOpen) return;
    const onPointer = (e) => {
      if (menuOpen && !menuRef.current?.contains(e.target)) setMenuOpen(false);
      if (notifOpen && !notifRef.current?.contains(e.target)) setNotifOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, notifOpen]);

  const nav = [
    { to: '/search', label: 'Search' },
    { to: '/saved', label: 'Saved' },
    { to: '/itinerary', label: 'Itinerary' },
    { to: '/announcements', label: 'Announcements' },
  ];

  const signOut = async () => {
    setMenuOpen(false);
    setNotifOpen(false);
    await supabase.auth.signOut();
    navigate('/', { replace: true });
  };

  const toggleNotifications = () => {
    setMenuOpen(false);
    setNotifOpen((open) => !open);
  };

  return (
    <header className={embedded ? 'relative z-40 bg-transparent' : 'sticky top-0 z-40 bg-[#F1F7F6] relative'}>
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/search" className="shrink-0" aria-label="Tara, Cavite!">
          <LogoWordmark />
        </Link>

        <nav
          className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-full bg-[#F1F7F6] p-1 md:flex"
          aria-label="Main"
        >
          {nav.map(({ to, label }) => {
            const isActive = navMatch(pathname, to);
            return (
              <NavLink
                key={to}
                to={to}
                className={`inline-flex h-9 items-center rounded-full px-4 font-['Poppins',sans-serif] text-[14px] leading-none transition ${
                  isActive
                    ? 'bg-white font-semibold text-[#1B8A70] shadow-[0_4px_14px_rgba(27,138,112,0.16)]'
                    : 'font-medium text-[#707D7D] hover:text-[#16352E]'
                }`}
              >
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#4B5563] transition hover:text-[#16352E]"
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
            >
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" aria-hidden>
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {unread > 0 && !notifOpen ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E76365] px-1 text-[10px] font-semibold leading-none text-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              ) : null}
            </button>
            {notifOpen ? <NotificationsPopover onClose={() => setNotifOpen(false)} /> : null}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                setMenuOpen((open) => !open);
              }}
              className="flex items-center gap-2.5 rounded-full text-left"
              aria-label="Account menu"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white">
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="hidden min-w-0 max-w-[160px] lg:block lg:max-w-[200px]">
                <span className="block truncate font-['Poppins',sans-serif] text-sm font-semibold leading-5 text-[#16352E]">
                  {displayName}
                </span>
                <span className="block truncate text-[12px] leading-4 text-[#707D7D]">{email || 'Signed in'}</span>
              </span>
              <svg
                className={`hidden h-4 w-4 shrink-0 text-[#9AA6A6] transition sm:block ${menuOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {menuOpen ? (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl bg-white py-1.5 shadow-[0_12px_32px_rgba(22,53,46,0.12)]"
                role="menu"
              >
                <Link
                  to="/profile"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm font-medium text-[#16352E] transition hover:bg-[#F1F7F6]"
                >
                  View profile
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void signOut()}
                  className="block w-full px-4 py-2 text-left text-sm font-medium text-[#16352E] transition hover:bg-[#F1F7F6]"
                >
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto bg-[#F1F7F6] px-3 py-2 md:hidden">
        {nav.map(({ to, label }) => {
          const isActive = navMatch(pathname, to);
          return (
            <NavLink
              key={to}
              to={to}
              className={`inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full px-3.5 text-sm leading-none transition ${
                isActive
                  ? 'bg-white font-semibold text-[#1B8A70] shadow-[0_2px_8px_rgba(27,138,112,0.14)]'
                  : 'font-medium text-[#707D7D]'
              }`}
            >
              {label}
            </NavLink>
          );
        })}
      </div>
    </header>
  );
}
