import { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ADMIN_NAV, collectNavPaths, type AdminNavNode } from '../config/mainNav';
import { useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import styles from './Sidebar.module.css';

const icons: Record<string, React.ReactNode> = {
  analytics: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-9-9v9z" />
      <path d="M12 3a9 9 0 0 1 9 9h-9z" opacity="0.5" />
    </svg>
  ),
  tourism: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  briefcase: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20" />
    </svg>
  ),
  transport: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M8 6v6h8V6M4 10h2M18 10h2M6 18h2M16 18h2" />
      <rect x="4" y="4" width="16" height="14" rx="2" />
      <path d="M8 18v2M16 18v2" />
    </svg>
  ),
  itinerary: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  ),
  map: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  ),
  rewards: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13M5 12v9h14v-9" />
      <path d="M12 8S10 3 7.5 3 5 5.5 7 8m5 0s2-5 4.5-5S19 5.5 17 8" />
    </svg>
  ),
};

const chevron = (
  <svg className={styles.chevron} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function joinHref(prefix: string, path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!prefix) return normalized;
  return `${prefix.replace(/\/$/, '')}${normalized}`;
}

function pathMatches(pathname: string, to: string, prefix: string) {
  const full = joinHref(prefix, to);
  return pathname === full || pathname.startsWith(`${full}/`);
}

function nodeIsActive(node: AdminNavNode, pathname: string, prefix: string): boolean {
  return collectNavPaths(node).some((p) => pathMatches(pathname, p, prefix));
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const prefix = useAdminPathPrefix();
  const location = useLocation();
  const href = (path: string) => joinHref(prefix, path);

  const initialOpen = useMemo(() => {
    const state: Record<string, boolean> = {};
    const walk = (nodes: AdminNavNode[], depth: number) => {
      for (const node of nodes) {
        if (!node.children?.length) continue;
        const active = nodeIsActive(node, location.pathname, prefix);
        // Top-level groups: expand when active; nested subgroups: expand when active
        state[node.key] = active;
        walk(node.children, depth + 1);
      }
    };
    walk(ADMIN_NAV, 0);
    if (!Object.values(state).some(Boolean)) {
      state.tourism = true;
    }
    return state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(initialOpen);

  const toggleGroup = (key: string) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderNode = (node: AdminNavNode, depth: number) => {
    if (!node.children?.length && node.to) {
      const leafClass = depth === 0 ? styles.link : depth === 1 ? styles.subLink : styles.nestedLink;
      const activeClass = depth === 0 ? styles.active : depth === 1 ? styles.subActive : styles.nestedActive;
      return (
        <NavLink
          key={node.key}
          to={href(node.to)}
          end={node.to === '/web/dashboard'}
          className={({ isActive }) => (isActive ? `${leafClass} ${activeClass}` : leafClass)}
        >
          {depth === 0 && node.icon ? <span className={styles.icon}>{icons[node.icon]}</span> : null}
          {!collapsed && <span className={styles.linkLabel}>{node.label}</span>}
          {collapsed && depth === 0 && node.icon ? null : collapsed && depth === 0 ? (
            <span className={styles.linkLabel}>{node.label.charAt(0)}</span>
          ) : null}
        </NavLink>
      );
    }

    if (!node.children?.length) return null;

    const open = !collapsed && openGroups[node.key];
    const headerClass = depth === 0 ? styles.groupHeader : styles.nestedHeader;

    return (
      <div key={node.key} className={styles.group}>
        <button
          type="button"
          className={headerClass}
          onClick={() => toggleGroup(node.key)}
          aria-expanded={open}
        >
          {depth === 0 && node.icon ? <span className={styles.icon}>{icons[node.icon]}</span> : null}
          {!collapsed && (
            <>
              <span className={styles.linkLabel}>{node.label}</span>
              <span className={`${styles.chevronWrap} ${open ? styles.chevronOpen : ''}`}>{chevron}</span>
            </>
          )}
        </button>
        {open && (
          <div className={depth === 0 ? styles.subList : styles.nestedList}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <span className={styles.brandMark} aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        {!collapsed && (
          <span className={styles.brandTitle}>
            Tara,
            <br />
            Cavite!
          </span>
        )}
      </div>

      {!collapsed && <p className={styles.navSectionLabel}>Dashboard</p>}

      <nav className={styles.nav} aria-label="Admin sections">
        {ADMIN_NAV.map((node) => renderNode(node, 0))}
      </nav>

      <button className={styles.collapseBtn} onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={collapsed ? 'm9 18 6-6-6-6' : 'm15 18-6-6 6-6'} />
        </svg>
      </button>
    </aside>
  );
}
