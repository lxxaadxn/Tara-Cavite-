/** Primary admin sections (legacy top tabs — kept for AdminMainTabs). */
export const MAIN_ADMIN_NAV = [
  { to: '/web/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { to: '/web/users', label: 'Users', icon: 'users' as const },
  { to: '/web/content', label: 'Content Management', icon: 'pin' as const },
  { to: '/web/settings', label: 'Settings', icon: 'gear' as const },
] as const;

export const MORE_ADMIN_NAV = [] as const;

/** Recursive sidebar node: leaf has `to`, group has `children`. */
export type AdminNavNode = {
  key: string;
  label: string;
  icon?: string;
  to?: string;
  children?: AdminNavNode[];
};

/**
 * Dashboard sidebar:
 * Analytics → Users → Establishments → Tourism → Content → Itinerary → Map
 */
export const ADMIN_NAV: AdminNavNode[] = [
  {
    key: 'analytics',
    label: 'Analytics',
    icon: 'analytics',
    children: [
      { key: 'analytics-overview', label: 'Overview', to: '/web/dashboard' },
      { key: 'analytics-export', label: 'Export reports', to: '/web/analytics/export' },
      { key: 'analytics-audit', label: 'Audit log', to: '/web/analytics/audit' },
    ],
  },
  {
    key: 'users',
    label: 'User Management',
    icon: 'users',
    children: [{ key: 'users-all', label: 'All Users', to: '/web/users' }],
  },
  {
    key: 'establishments',
    label: 'Establishment Management',
    icon: 'briefcase',
    to: '/web/establishments',
    children: [{ key: 'est-all', label: 'All Establishments', to: '/web/establishments' }],
  },
  {
    key: 'tourism',
    label: 'Tourism Management',
    icon: 'tourism',
    children: [
      { key: 'tourism-attractions', label: 'Tourist Attractions', to: '/web/tourism/attractions' },
      { key: 'tourism-announcements', label: 'Announcements', to: '/web/tourism/announcements' },
      { key: 'tourism-categories', label: 'Categories', to: '/web/tourism/categories' },
      { key: 'tourism-cities', label: 'Cities', to: '/web/tourism/cities' },
      { key: 'tourism-municipalities', label: 'Municipalities', to: '/web/tourism/municipalities' },
      { key: 'tourism-reviews', label: 'Reviews', to: '/web/tourism/reviews' },
    ],
  },
  {
    key: 'content',
    label: 'Content Management',
    icon: 'content',
    children: [
      {
        key: 'content-filters',
        label: 'App/Web Filter',
        to: '/web/content/filters',
      },
      {
        key: 'content-landing',
        label: 'Landing Page',
        to: '/web/content/landing',
      },
      {
        key: 'content-auth',
        label: 'Brand & Auth',
        to: '/web/content/auth',
      },
    ],
  },
  {
    key: 'itinerary',
    label: 'Itinerary Management',
    icon: 'itinerary',
    children: [
      { key: 'itin-created', label: 'Itineraries', to: '/web/itineraries/created' },
      { key: 'itin-ai', label: 'AI Generator', to: '/web/itineraries/ai' },
    ],
  },
  {
    key: 'map',
    label: 'Map Management',
    icon: 'map',
    children: [
      { key: 'map-pins', label: 'Custom Pins', to: '/web/maps/pins' },
    ],
  },
];

/** Collect every leaf path under a node (for active-parent expand). */
export function collectNavPaths(node: AdminNavNode): string[] {
  const own = node.to ? [node.to] : [];
  return [...own, ...(node.children ?? []).flatMap(collectNavPaths)];
}

const EXTRA_TITLES: { to: string; label: string }[] = [
  { to: '/web/profile', label: 'Profile' },
  { to: '/web/settings', label: 'Settings' },
];

function joinHref(prefix: string, path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!prefix) return normalized;
  return `${prefix.replace(/\/$/, '')}${normalized}`;
}

/** Longest matching sidebar (or profile/settings) label for the current URL. */
export function navLabelForPath(pathname: string, prefix: string): string | null {
  const path = pathname.replace(/\/+$/, '') || '/';
  const matches: { len: number; label: string }[] = [];
  const consider = (to: string, label: string) => {
    const full = joinHref(prefix, to).replace(/\/+$/, '') || '/';
    if (path === full || path.startsWith(`${full}/`)) {
      matches.push({ len: full.length, label });
    }
  };
  const walk = (nodes: AdminNavNode[]) => {
    for (const node of nodes) {
      if (node.to) consider(node.to, node.label);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(ADMIN_NAV);
  for (const extra of EXTRA_TITLES) consider(extra.to, extra.label);
  if (!matches.length) return null;
  // Longest match wins; the last entry wins a tie, as the sidebar order implies.
  return matches.reduce((best, item) => (item.len >= best.len ? item : best)).label;
}
