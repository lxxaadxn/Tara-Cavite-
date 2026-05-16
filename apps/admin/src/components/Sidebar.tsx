import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAdminHref, useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import type { AdminPlatform } from '../hooks/useAdminPlatform';
import styles from './Sidebar.module.css';

type NavItem = { segment: string; icon: string; label: string };

const WEB_NAV: NavItem[] = [
  { segment: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { segment: 'tourist-spots', icon: 'pin', label: 'Tourist Spots' },
  { segment: 'terminals', icon: 'bus', label: 'Terminals' },
  { segment: 'routes', icon: 'route', label: 'Routes' },
  { segment: 'content', icon: 'document', label: 'Content & SEO' },
  { segment: 'moderation', icon: 'shield', label: 'Reviews' },
  { segment: 'users', icon: 'users', label: 'Users' },
  { segment: 'analytics', icon: 'chart', label: 'Analytics' },
  { segment: 'profile', icon: 'user', label: 'Profile' },
  { segment: 'settings', icon: 'gear', label: 'Settings' },
];

const MOBILE_NAV: NavItem[] = [
  { segment: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
  { segment: 'tourist-spots', icon: 'pin', label: 'Places / POI' },
  { segment: 'itineraries', icon: 'calendar', label: 'Itineraries' },
  { segment: 'saved-lists', icon: 'bookmark', label: 'Saved lists' },
  { segment: 'map-commute', icon: 'map', label: 'Map & commute' },
  { segment: 'notifications', icon: 'bell', label: 'Push notifications' },
  { segment: 'app-releases', icon: 'package', label: 'App releases' },
  { segment: 'onboarding', icon: 'sparkle', label: 'Onboarding' },
  { segment: 'users', icon: 'users', label: 'Users' },
  { segment: 'analytics', icon: 'chart', label: 'Analytics' },
  { segment: 'profile', icon: 'user', label: 'Profile' },
  { segment: 'settings', icon: 'gear', label: 'Settings' },
];

const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  ),
  pin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  bus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6v6h8V6M4 10h2M18 10h2M6 18h2M16 18h2" />
      <rect x="4" y="4" width="16" height="14" rx="2" />
      <path d="M8 18v2M16 18v2" />
    </svg>
  ),
  route: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="6" cy="6" r="3" />
      <circle cx="18" cy="18" r="3" />
      <path d="M9 9l6 6" strokeDasharray="2 2" />
    </svg>
  ),
  document: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  gear: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  bookmark: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  ),
  map: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  package: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
    </svg>
  ),
  sparkle: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m12 3-1.9 5.8H4l4.95 3.6-1.9 5.8L12 14.6l4.95 3.6-1.9-5.8L20 8.8h-6.1L12 3z" />
    </svg>
  ),
  monitor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  phone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
};

function platformFromPath(pathname: string): AdminPlatform {
  return pathname.startsWith('/mobile') ? 'mobile' : 'web';
}

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const routePrefix = useAdminPathPrefix();
  const hrefWebDashboard = useAdminHref('/web/dashboard');
  const hrefMobileDashboard = useAdminHref('/mobile/dashboard');
  const platform = platformFromPath(pathname);
  const base = platform === 'mobile' ? '/mobile' : '/web';
  const items = platform === 'mobile' ? MOBILE_NAV : WEB_NAV;
  const webTabActive = pathname.includes('/web');
  const mobileTabActive = pathname.includes('/mobile');

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.platformTabs} role="tablist" aria-label="Admin platform">
        <Link
          to={hrefWebDashboard}
          className={`${styles.platformTab} ${webTabActive ? styles.platformTabActive : ''}`}
          title="Web app admin"
        >
          <span className={styles.platformIcon}>{icons.monitor}</span>
          {!collapsed && <span>Web</span>}
        </Link>
        <Link
          to={hrefMobileDashboard}
          className={`${styles.platformTab} ${mobileTabActive ? styles.platformTabActive : ''}`}
          title="Mobile app admin"
        >
          <span className={styles.platformIcon}>{icons.phone}</span>
          {!collapsed && <span>Mobile</span>}
        </Link>
      </div>

      {!collapsed && (
        <p className={styles.platformHint}>{platform === 'web' ? 'Web & marketing' : 'iOS / Android app'}</p>
      )}

      <nav className={styles.nav} aria-label="Admin sections">
        {items.map((item) => (
          <NavLink
            key={item.segment}
            to={`${routePrefix}${base}/${item.segment}`}
            className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}
          >
            <span className={styles.icon}>{icons[item.icon]}</span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <button className={styles.collapseBtn} onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={collapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
        </svg>
      </button>
    </aside>
  );
}
