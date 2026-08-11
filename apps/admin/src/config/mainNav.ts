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
 * Analytics → Tourism → Itinerary → Map
 */
export const ADMIN_NAV: AdminNavNode[] = [
  { key: 'analytics', label: 'Analytics', icon: 'analytics', to: '/web/dashboard' },
  {
    key: 'tourism',
    label: 'Tourism Management',
    icon: 'tourism',
    children: [
      { key: 'tourism-attractions', label: 'Tourist Attractions', to: '/web/tourism/attractions' },
      { key: 'tourism-filters', label: 'Categories/Filters', to: '/web/tourism/filters' },
      { key: 'tourism-municipalities', label: 'Municipalities', to: '/web/tourism/municipalities' },
      { key: 'tourism-featured', label: 'Featured Destinations', to: '/web/tourism/featured' },
    ],
  },
  {
    key: 'itinerary',
    label: 'Itinerary Management',
    icon: 'itinerary',
    children: [
      { key: 'itin-created', label: 'Created Itineraries', to: '/web/itineraries/created' },
      { key: 'itin-templates', label: 'Templates', to: '/web/itineraries/templates' },
    ],
  },
  {
    key: 'map',
    label: 'Map Management',
    icon: 'map',
    children: [
      { key: 'map-pins', label: 'Map Pins', to: '/web/maps/pins' },
      { key: 'map-geo', label: 'Geotagged Locations', to: '/web/maps/geotagged' },
      { key: 'map-routes', label: 'Route Connections', to: '/web/maps/connections' },
    ],
  },
];

/** Collect every leaf path under a node (for active-parent expand). */
export function collectNavPaths(node: AdminNavNode): string[] {
  if (node.to) return [node.to];
  return (node.children ?? []).flatMap(collectNavPaths);
}
