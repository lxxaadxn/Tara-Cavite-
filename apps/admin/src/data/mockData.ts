export const stats = {
  touristSpots: 96,
  spotsGrowth: 5,
  routes: 22,
  routesGrowth: 3,
  activeUsers: 1184,
  usersGrowth: 7,
  mostVisited: { name: 'Corregidor Island', visits: 892 },
};

export const recentActivity = [
  { id: '1', text: 'New spot added - General Trias City Park', time: '3 hours ago', status: 'approved' },
  { id: '2', text: 'Route updated - Kawit to Tagaytay (via Aguinaldo Highway)', time: 'Yesterday', status: 'approved' },
  { id: '3', text: 'User review submitted - 3-star review for Picnic Grove', time: 'Yesterday', status: 'pending' },
];

export const touristSpots = [
  { id: '1', name: 'Corregidor Island', category: 'Historical', city: 'Cavite', status: 'active', image: '🏛️' },
  { id: '2', name: 'Tagaytay Ridge', category: 'Mountain', city: 'Cavite', status: 'active', image: '⛰️' },
  { id: '3', name: 'Aguinaldo Shrine', category: 'Historical', city: 'Cavite', status: 'active', image: '🏛️' },
  { id: '4', name: 'Cavite Heritage Trail', category: 'Cultural', city: 'Cavite', status: 'hidden', image: '🏛️' },
  { id: '5', name: 'Tagaytay Picnic Grove', category: 'Mountain', city: 'Cavite', status: 'active', image: '⛰️' },
];

export const routes = [
  { id: '1', name: 'Manila to Tagaytay', from: 'Manila', to: 'Tagaytay', duration: '2 hours', transport: 'Car', status: 'active' },
  { id: '2', name: 'Cavite Heritage Trail', from: 'Imus', to: 'Kawit', duration: '3 hours', transport: 'Jeepney', status: 'active' },
  { id: '3', name: 'Kawit to Tagaytay', from: 'Aguinaldo Shrine', to: 'Tagaytay Picnic Grove', duration: '1.5 hours', transport: 'Car', status: 'active' },
];

export const users = [
  { id: '1', name: 'Juan dela Cruz', email: 'juan@example.com', role: 'Admin', active: true, lastLogin: '2 hours ago', initials: 'JD' },
  { id: '2', name: 'Maria Santos', email: 'maria@example.com', role: 'Editor', active: true, lastLogin: '5 hours ago', initials: 'MS' },
  { id: '3', name: 'Pedro Reyes', email: 'pedro@example.com', role: 'Editor', active: false, lastLogin: '3 days ago', initials: 'PR' },
];

export const monthlyVisitors = [
  { month: 'Jan', visitors: 890 },
  { month: 'Feb', visitors: 1020 },
  { month: 'Mar', visitors: 1180 },
  { month: 'Apr', visitors: 1090 },
  { month: 'May', visitors: 980 },
  { month: 'Jun', visitors: 840 },
];

/** @deprecated use mostVisitedDestinations */
export const topDestinations = [
  { name: 'Corregidor', count: 312 },
  { name: 'Tagaytay Ridge', count: 268 },
  { name: "People's Park", count: 221 },
  { name: 'Aguinaldo Shrine', count: 198 },
  { name: 'Tagaytay Picnic Grove', count: 164 },
];

export const mostVisitedDestinations = [
  { name: 'Corregidor Island', visits: 892, city: 'Cavite City' },
  { name: 'Tagaytay Ridge', visits: 756, city: 'Tagaytay' },
  { name: 'Aguinaldo Shrine', visits: 614, city: 'Kawit' },
  { name: "People's Park in the Sky", visits: 521, city: 'Tagaytay' },
  { name: 'Picnic Grove', visits: 438, city: 'Tagaytay' },
];

export const mostSearchedLocations = [
  { query: 'Tagaytay', searches: 612 },
  { query: 'Kawit heritage', searches: 418 },
  { query: 'Corregidor tour', searches: 385 },
  { query: 'Bacoor food spots', searches: 296 },
  { query: 'Dasmariñas parks', searches: 241 },
];

/** Typical hourly active users on a weekend (combined web + app). */
export const peakVisitorTimes = [
  { label: '6 AM', visitors: 28 },
  { label: '8 AM', visitors: 62 },
  { label: '10 AM', visitors: 94 },
  { label: '12 PM', visitors: 118 },
  { label: '2 PM', visitors: 105 },
  { label: '4 PM', visitors: 88 },
  { label: '6 PM', visitors: 71 },
  { label: '8 PM', visitors: 44 },
];

export const topRatedDestinations = [
  { name: 'Aguinaldo Shrine', rating: 4.6, reviews: 87 },
  { name: 'Corregidor Island', rating: 4.5, reviews: 124 },
  { name: 'Tagaytay Ridge', rating: 4.4, reviews: 96 },
  { name: 'Baldomero Aguinaldo Museum', rating: 4.3, reviews: 41 },
  { name: 'Museo ni Baldomero', rating: 4.2, reviews: 28 },
];

export const userEngagementTrend = [
  { period: 'Jan', sessions: 1180, saves: 142, itineraries: 68, searches: 1340 },
  { period: 'Feb', sessions: 1250, saves: 158, itineraries: 72, searches: 1420 },
  { period: 'Mar', sessions: 1380, saves: 171, itineraries: 81, searches: 1580 },
  { period: 'Apr', sessions: 1320, saves: 165, itineraries: 76, searches: 1510 },
  { period: 'May', sessions: 1280, saves: 159, itineraries: 74, searches: 1460 },
  { period: 'Jun', sessions: 1210, saves: 148, itineraries: 69, searches: 1380 },
];

export const engagementSummary = {
  dailyActiveUsers: 82,
  avgSessionMinutes: 5.6,
  saveRatePercent: 14,
  searchToDetailPercent: 47,
  returningUserPercent: 28,
};

export const tourismTypes = [
  { name: 'Beach', value: 28 },
  { name: 'Mountain', value: 24 },
  { name: 'Cultural', value: 18 },
  { name: 'Historical', value: 17 },
  { name: 'Parks', value: 13 },
];

export type TerminalRow = {
  id: string;
  name: string;
  city: string;
  route: string;
  photos: number;
  status: 'published' | 'draft' | 'hidden';
  updated: string;
};

export const terminals: TerminalRow[] = [
  {
    id: 't1',
    name: 'Bacoor Public Market Terminal',
    city: 'Bacoor',
    route: 'Bacoor — Zapote — Las Piñas',
    photos: 4,
    status: 'published',
    updated: '2 days ago',
  },
  {
    id: 't2',
    name: 'Imus Poblacion Terminal',
    city: 'Imus',
    route: 'Imus — Kawit — Noveleta',
    photos: 3,
    status: 'published',
    updated: '5 days ago',
  },
  {
    id: 't3',
    name: 'Dasmariñas Transport Terminal',
    city: 'Dasmariñas',
    route: 'Dasmariñas — Silang — Tagaytay',
    photos: 2,
    status: 'draft',
    updated: '1 week ago',
  },
  {
    id: 't4',
    name: 'Tagaytay Olivarez Terminal',
    city: 'Tagaytay',
    route: 'Tagaytay — Santa Rosa',
    photos: 5,
    status: 'published',
    updated: '3 days ago',
  },
  {
    id: 't5',
    name: 'General Trias Terminal Hub',
    city: 'General Trias',
    route: 'Gen. Trias — Tanza',
    photos: 1,
    status: 'hidden',
    updated: '2 weeks ago',
  },
  {
    id: 't6',
    name: 'Kawit Aguinaldo Shrine Stop',
    city: 'Kawit',
    route: 'Kawit heritage loop',
    photos: 3,
    status: 'published',
    updated: 'Yesterday',
  },
];

export type ItineraryRow = {
  id: string;
  title: string;
  owner: string;
  stops: number;
  dates: string;
  status: 'published' | 'draft' | 'flagged';
  featured: boolean;
  updated: string;
};

export const itineraries: ItineraryRow[] = [
  {
    id: 'i1',
    title: 'Weekend in Tagaytay',
    owner: 'Maria Santos',
    stops: 4,
    dates: 'Mar 15–16, 2026',
    status: 'published',
    featured: true,
    updated: '4 hours ago',
  },
  {
    id: 'i2',
    title: 'Kawit heritage walk',
    owner: 'Juan dela Cruz',
    stops: 3,
    dates: 'Mar 22, 2026',
    status: 'draft',
    featured: false,
    updated: 'Yesterday',
  },
  {
    id: 'i3',
    title: 'Family day in Bacoor',
    owner: 'Ana Reyes',
    stops: 5,
    dates: 'Apr 2, 2026',
    status: 'published',
    featured: false,
    updated: '2 days ago',
  },
  {
    id: 'i4',
    title: 'Corregidor day trip',
    owner: 'Pedro Lim',
    stops: 6,
    dates: 'Apr 8, 2026',
    status: 'published',
    featured: true,
    updated: '3 days ago',
  },
  {
    id: 'i5',
    title: 'Dasmariñas café crawl',
    owner: 'Guest (unverified)',
    stops: 2,
    dates: '—',
    status: 'flagged',
    featured: false,
    updated: '5 days ago',
  },
  {
    id: 'i6',
    title: 'Silang farm visits',
    owner: 'Carla Mendoza',
    stops: 4,
    dates: 'May 10–11, 2026',
    status: 'draft',
    featured: false,
    updated: '1 week ago',
  },
];

export type SavedListRow = {
  id: string;
  name: string;
  owner: string;
  items: number;
  visibility: 'private' | 'shared';
  status: 'active' | 'hidden';
  updated: string;
};

export const savedLists: SavedListRow[] = [
  {
    id: 's1',
    name: 'Must-try cafés',
    owner: 'Maria Santos',
    items: 8,
    visibility: 'private',
    status: 'active',
    updated: '3 hours ago',
  },
  {
    id: 's2',
    name: 'Weekend with kids',
    owner: 'Juan dela Cruz',
    items: 12,
    visibility: 'shared',
    status: 'active',
    updated: 'Yesterday',
  },
  {
    id: 's3',
    name: 'Kawit heritage spots',
    owner: 'Ana Reyes',
    items: 5,
    visibility: 'private',
    status: 'active',
    updated: '4 days ago',
  },
  {
    id: 's4',
    name: 'Tagaytay food crawl',
    owner: 'Pedro Lim',
    items: 7,
    visibility: 'shared',
    status: 'active',
    updated: '2 days ago',
  },
  {
    id: 's5',
    name: 'Untitled list',
    owner: 'Guest (unverified)',
    items: 0,
    visibility: 'private',
    status: 'hidden',
    updated: '1 week ago',
  },
  {
    id: 's6',
    name: 'Beach day picks',
    owner: 'Carla Mendoza',
    items: 4,
    visibility: 'private',
    status: 'active',
    updated: '5 days ago',
  },
];

export type MapLayerRow = {
  id: string;
  layer: string;
  description: string;
  enabled: boolean;
  source: string;
};

export const mapLayers: MapLayerRow[] = [
  {
    id: 'm1',
    layer: 'Establishments',
    description: 'Published destinations from Content Management',
    enabled: true,
    source: 'Supabase · v_cavite_establishments',
  },
  {
    id: 'm2',
    layer: 'Jeepney terminals',
    description: 'Terminal markers on the commute map',
    enabled: true,
    source: 'routeTerminals',
  },
  {
    id: 'm3',
    layer: 'Transit corridors',
    description: 'OSRM route lines between major stops',
    enabled: true,
    source: 'OSRM API',
  },
  {
    id: 'm4',
    layer: 'NTDP labels',
    description: 'Named transit departure points',
    enabled: false,
    source: 'Local JSON',
  },
];
