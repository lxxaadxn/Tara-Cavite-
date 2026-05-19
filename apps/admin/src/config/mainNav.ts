/** Primary admin sections (sidebar + top tabs). */
export const MAIN_ADMIN_NAV = [
  { to: '/web/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { to: '/web/users', label: 'Users', icon: 'users' as const },
  { to: '/web/content', label: 'Content Management', icon: 'pin' as const },
  { to: '/web/settings', label: 'Settings', icon: 'gear' as const },
] as const;

/** Optional web tools (not in the four main tabs). */
export const MORE_ADMIN_NAV = [{ to: '/web/terminals', label: 'Terminals', icon: 'bus' as const }] as const;
