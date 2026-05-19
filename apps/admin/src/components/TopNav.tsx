import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminPlatform } from '../hooks/useAdminPlatform';
import { useAuth } from '../contexts/AuthContext';
import { useAdminHref, useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import styles from './TopNav.module.css';

function navInitials(email: string | undefined): string {
  if (!email) return 'AD';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.charAt(0);
    const b = parts[1]?.charAt(0);
    if (a && b) return (a + b).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || 'AD';
}

export function TopNav() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const routePrefix = useAdminPathPrefix();
  const settingsHref = useAdminHref('/web/settings');
  const { platform } = useAdminPlatform();
  const { signOut, session } = useAuth();
  const avatarLabel = navInitials(session?.user?.email);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [profileOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.logo} aria-label="CaviTour Admin">
        <img src="/cavitour-logo.png" alt="" className={styles.logoMark} />
        <span className={styles.logoAdmin}>Admin</span>
        <span className={styles.platformBadge}>{platform === 'mobile' ? 'Mobile' : 'Web'}</span>
      </div>
      <div className={styles.search}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Search destinations, users…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className={styles.right}>
        <button className={styles.notification}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.badge} />
        </button>
        <div className={styles.profileWrap} ref={profileRef}>
          <button className={styles.profile} onClick={() => setProfileOpen(!profileOpen)}>
            <div className={styles.avatar}>{avatarLabel}</div>
            <span>Admin</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
            {profileOpen && (
            <div className={styles.dropdown}>
              <button type="button" onClick={() => { setProfileOpen(false); navigate(settingsHref); }}>Settings</button>
              <button
                type="button"
                onClick={async () => {
                  setProfileOpen(false);
                  await signOut();
                  // Full navigation avoids AdminAuthGate racing to /admin/login after session clears.
                  if (routePrefix) {
                    window.location.replace('/');
                    return;
                  }
                  navigate('/login', { replace: true });
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
