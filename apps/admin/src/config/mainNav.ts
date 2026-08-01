/** Primary admin sections (legacy top tabs — kept for AdminMainTabs). */
export const MAIN_ADMIN_NAV = [
  { to: '/web/dashboard', label: 'Dashboard', icon: 'dashboard' as const },
  { to: '/web/users', label: 'Users', icon: 'users' as const },
  { to: '/web/content', label: 'Content Management', icon: 'pin' as const },
  { to: '/web/settings', label: 'Settings', icon: 'gear' as const },
] as const;

export const MORE_ADMIN_NAV = [{ to: '/web/terminals', label: 'Terminals', icon: 'bus' as const }] as const;

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
 * Analytics → Tourism → Business → Transportation → Itinerary → Map → Rewards
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
    key: 'business',
    label: 'Business Management',
    icon: 'briefcase',
    children: [
      { key: 'biz-dash', label: 'Dashboard', to: '/web/business/dashboard' },
      {
        key: 'biz-apps',
        label: 'Applications',
        children: [
          { key: 'biz-inbox', label: 'Inbox Queue', to: '/web/business/inbox' },
          { key: 'biz-review', label: 'Application Review', to: '/web/business/review' },
          { key: 'biz-logs', label: 'Processed Logs', to: '/web/business/logs' },
          { key: 'biz-archive', label: 'Archive', to: '/web/business/archive' },
        ],
      },
      {
        key: 'biz-est',
        label: 'Tourism Establishments',
        children: [
          { key: 'biz-est-approved', label: 'Approved Businesses', to: '/web/business/establishments/approved' },
          { key: 'biz-est-pending', label: 'Pending Publication', to: '/web/business/establishments/pending' },
          { key: 'biz-est-suspended', label: 'Suspended', to: '/web/business/establishments/suspended' },
          { key: 'biz-est-archive', label: 'Archive', to: '/web/business/establishments/archive' },
        ],
      },
      { key: 'biz-requirements', label: 'Requirements', to: '/web/business/requirements' },
      { key: 'biz-inspections', label: 'Inspections', to: '/web/business/inspections' },
    ],
  },
  {
    key: 'transport',
    label: 'Transportation',
    icon: 'transport',
    children: [
      { key: 'transport-terminals', label: 'Terminals', to: '/web/transport/terminals' },
      { key: 'transport-routes', label: 'Routes', to: '/web/transport/routes' },
      { key: 'transport-types', label: 'Transport Types', to: '/web/transport/types' },
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
  {
    key: 'rewards',
    label: 'Rewards',
    icon: 'rewards',
    children: [
      { key: 'rewards-items', label: 'Reward Items', to: '/web/rewards/items' },
      { key: 'rewards-redemptions', label: 'Redemption Requests', to: '/web/rewards/redemptions' },
      { key: 'rewards-history', label: 'Reward History', to: '/web/rewards/history' },
    ],
  },
];

/** Collect every leaf path under a node (for active-parent expand). */
export function collectNavPaths(node: AdminNavNode): string[] {
  if (node.to) return [node.to];
  return (node.children ?? []).flatMap(collectNavPaths);
}
