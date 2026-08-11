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

/** Headline KPI cards for the analytics dashboard. */
export type AnalyticsKpi = {
  key: string;
  label: string;
  value: number;
  delta: number;
  trend: 'up' | 'down';
  tint: 'slate' | 'blue' | 'green' | 'sky';
};

export const analyticsKpis: AnalyticsKpi[] = [
  { key: 'views', label: 'Views', value: 7265, delta: 11.01, trend: 'up', tint: 'slate' },
  { key: 'visits', label: 'Visits', value: 3671, delta: -0.03, trend: 'down', tint: 'blue' },
  { key: 'newUsers', label: 'New Users', value: 256, delta: 15.03, trend: 'up', tint: 'green' },
  { key: 'activeUsers', label: 'Active Users', value: 2318, delta: 6.08, trend: 'up', tint: 'sky' },
];

/** Total users trend (this year vs last year), Jan–Jul. */
export const totalUsersTrend = [
  { month: 'Jan', thisYear: 14200, lastYear: 12000 },
  { month: 'Feb', thisYear: 11800, lastYear: 15600 },
  { month: 'Mar', thisYear: 16400, lastYear: 13200 },
  { month: 'Apr', thisYear: 22800, lastYear: 14800 },
  { month: 'May', thisYear: 19600, lastYear: 21400 },
  { month: 'Jun', thisYear: 24200, lastYear: 18600 },
  { month: 'Jul', thisYear: 28400, lastYear: 22800 },
];

/** Relative traffic share by Cavite city/municipality (0–1 for bar width). */
export const trafficByCity = [
  { name: 'Imus', value: 0.94 },
  { name: 'Silang', value: 0.78 },
  { name: 'Dasmariñas', value: 0.66 },
  { name: 'Tagaytay', value: 0.52 },
  { name: 'Amadeo', value: 0.4 },
  { name: 'Bacoor', value: 0.3 },
];

export const trafficByDevice = [
  { name: 'Android', value: 52.1, color: '#111827' },
  { name: 'iOS', value: 22.8, color: '#3b82f6' },
  { name: 'Windows', value: 13.9, color: '#22c55e' },
  { name: 'Other', value: 11.2, color: '#a78bfa' },
];

/** Most visited destinations across the year (monthly page + map views). */
export const monthlyVisited = [
  { month: 'Jan', visits: 12400 },
  { month: 'Feb', visits: 21800 },
  { month: 'Mar', visits: 16200 },
  { month: 'Apr', visits: 24600 },
  { month: 'May', visits: 9800 },
  { month: 'Jun', visits: 18400 },
  { month: 'Jul', visits: 14600 },
  { month: 'Aug', visits: 23200 },
  { month: 'Sep', visits: 11200 },
  { month: 'Oct', visits: 27400 },
  { month: 'Nov', visits: 8600 },
  { month: 'Dec', visits: 20400 },
];

export type ApplicationStatus = 'pending' | 'under_review' | 'approved';

export type BusinessApplication = {
  id: string;
  business: string;
  reference: string;
  lgu: string;
  type: string;
  submitted: string;
  contact: string;
  status: ApplicationStatus;
  flagged: boolean;
};

export const businessApplications: BusinessApplication[] = [
  { id: 'APP-2026-089', business: 'Tinatanggi Cafe', reference: '#APP-2026-089', lgu: 'Tagaytay', type: 'Cafe / Restaurant', submitted: 'Today, 08:10 AM', contact: 'tinatanggi@example.com', status: 'approved', flagged: false },
  { id: 'APP-2026-090', business: 'Cafe Agapita', reference: '#APP-2026-090', lgu: 'Amadeo', type: 'Cafe / Restaurant', submitted: 'Today, 08:42 AM', contact: 'agapita@example.com', status: 'pending', flagged: true },
  { id: 'APP-2026-091', business: 'Tubigan Resort', reference: '#APP-2026-091', lgu: 'Silang', type: 'Resort', submitted: 'Today, 09:05 AM', contact: 'tubigan@example.com', status: 'under_review', flagged: true },
  { id: 'APP-2026-092', business: 'Balite Mountain View', reference: '#APP-2026-092', lgu: 'Amadeo', type: 'Resort', submitted: 'Yesterday', contact: 'baliteview@example.com', status: 'pending', flagged: false },
  { id: 'APP-2026-093', business: 'Perlas Ng Silang Farm', reference: '#APP-2026-093', lgu: 'Silang', type: 'Nature farm', submitted: 'Yesterday', contact: 'perlas@example.com', status: 'under_review', flagged: false },
  { id: 'APP-2026-094', business: 'Kape sa Kanto', reference: '#APP-2026-094', lgu: 'Imus', type: 'Cafe / Restaurant', submitted: 'Yesterday', contact: 'kapekanto@example.com', status: 'pending', flagged: false },
  { id: 'APP-2026-095', business: 'Dasma Heritage Inn', reference: '#APP-2026-095', lgu: 'Dasmariñas', type: 'Hotel / Inn', submitted: '2 days ago', contact: 'dasmainn@example.com', status: 'under_review', flagged: false },
  { id: 'APP-2026-096', business: 'Bacoor Bayside Grill', reference: '#APP-2026-096', lgu: 'Bacoor', type: 'Cafe / Restaurant', submitted: '2 days ago', contact: 'bayside@example.com', status: 'under_review', flagged: false },
  { id: 'APP-2026-097', business: 'Highland Blooms Garden', reference: '#APP-2026-097', lgu: 'Tagaytay', type: 'Attraction', submitted: '3 days ago', contact: 'highland@example.com', status: 'under_review', flagged: false },
  { id: 'APP-2026-098', business: 'Aguinaldo View Deck', reference: '#APP-2026-098', lgu: 'Kawit', type: 'Attraction', submitted: '3 days ago', contact: 'viewdeck@example.com', status: 'approved', flagged: false },
];

export type ProcessedLog = {
  id: string;
  reference: string;
  business: string;
  lgu: string;
  reviewedBy: string;
  processedDate: string;
  status: 'approved' | 'rejected';
};

export const processedLogs: ProcessedLog[] = [
  { id: 'l1', reference: 'WAPP-2026-0088', business: 'Balite Resort', lgu: 'Amadeo', reviewedBy: 'Andi Lane', processedDate: 'Today, 09:15 AM', status: 'approved' },
  { id: 'l2', reference: 'WAPP-2026-0050', business: 'Perlas Ng Silang', lgu: 'Silang', reviewedBy: 'Andi Lane', processedDate: 'Today, 09:30 AM', status: 'rejected' },
  { id: 'l3', reference: 'WAPP-2026-0087', business: 'Tagaytay Ridge Cafe', lgu: 'Tagaytay', reviewedBy: 'Maria Santos', processedDate: 'Today, 10:02 AM', status: 'approved' },
  { id: 'l4', reference: 'WAPP-2026-0086', business: 'Imus Food Hub', lgu: 'Imus', reviewedBy: 'Juan dela Cruz', processedDate: 'Yesterday, 04:20 PM', status: 'approved' },
  { id: 'l5', reference: 'WAPP-2026-0049', business: 'Backyard BBQ Bacoor', lgu: 'Bacoor', reviewedBy: 'Andi Lane', processedDate: 'Yesterday, 03:55 PM', status: 'rejected' },
  { id: 'l6', reference: 'WAPP-2026-0085', business: 'Dasma Craft Coffee', lgu: 'Dasmariñas', reviewedBy: 'Maria Santos', processedDate: 'Yesterday, 02:10 PM', status: 'approved' },
  { id: 'l7', reference: 'WAPP-2026-0084', business: 'Silang Blooms Farm', lgu: 'Silang', reviewedBy: 'Juan dela Cruz', processedDate: '2 days ago', status: 'approved' },
  { id: 'l8', reference: 'WAPP-2026-0048', business: 'Nasugbu Escape (invalid)', lgu: 'Amadeo', reviewedBy: 'Andi Lane', processedDate: '2 days ago', status: 'rejected' },
  { id: 'l9', reference: 'WAPP-2026-0083', business: 'Kawit Heritage Bites', lgu: 'Kawit', reviewedBy: 'Maria Santos', processedDate: '3 days ago', status: 'approved' },
  { id: 'l10', reference: 'WAPP-2026-0082', business: 'General Trias Grill', lgu: 'General Trias', reviewedBy: 'Juan dela Cruz', processedDate: '3 days ago', status: 'approved' },
  { id: 'l11', reference: 'WAPP-2026-0047', business: 'Unverified Listing', lgu: 'Bacoor', reviewedBy: 'Andi Lane', processedDate: '4 days ago', status: 'rejected' },
  { id: 'l12', reference: 'WAPP-2026-0081', business: 'Tanza Seaside Eats', lgu: 'Tanza', reviewedBy: 'Maria Santos', processedDate: '4 days ago', status: 'approved' },
];

export type PanelNotification = { id: string; text: string; time: string; kind: 'add' | 'signup' | 'remove' | 'edit' };

export const panelNotifications: PanelNotification[] = [
  { id: 'n1', text: 'Remove an Establishment', time: 'Just now', kind: 'remove' },
  { id: 'n2', text: 'New Business Signup', time: '59 minutes ago', kind: 'signup' },
  { id: 'n3', text: 'Remove reports', time: '12 hours ago', kind: 'remove' },
  { id: 'n4', text: 'Andi Lane edited Featured Destinations', time: 'Today, 11:59 AM', kind: 'edit' },
];

export type PanelActivity = { id: string; text: string; time: string; initials: string };

export const panelActivities: PanelActivity[] = [
  { id: 'a1', text: 'Changed the UI.', time: 'Just now', initials: 'CU' },
  { id: 'a2', text: 'Released a new version.', time: '59 minutes ago', initials: 'RV' },
  { id: 'a3', text: 'Submitted Requirements.', time: '12 hours ago', initials: 'SR' },
  { id: 'a4', text: 'Modified A data in Attractions.', time: 'Today, 11:59 AM', initials: 'MT' },
  { id: 'a5', text: 'Deleted a entry in Itineraries.', time: 'Feb 2, 2026', initials: 'DI' },
];

export type PanelContact = { id: string; name: string; initials: string };

export const panelContacts: PanelContact[] = [
  { id: 'c1', name: 'Natali Craig', initials: 'NC' },
  { id: 'c2', name: 'Drew Cano', initials: 'DC' },
  { id: 'c3', name: 'Andi Lane', initials: 'AL' },
  { id: 'c4', name: 'Koray Okumus', initials: 'KO' },
  { id: 'c5', name: 'Kate Morrison', initials: 'KM' },
  { id: 'c6', name: 'Melody Macy', initials: 'MM' },
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
    layer: 'Driving corridors',
    description: 'OSRM route lines from GPS to destinations',
    enabled: true,
    source: 'OSRM API',
  },
  {
    id: 'm3',
    layer: 'NTDP labels',
    description: 'Named transit departure points',
    enabled: false,
    source: 'Local JSON',
  },
];

/** Content → Overview highlight rows (demo CRUD). */
export type ContentHighlight = {
  id: string;
  title: string;
  note: string;
  destination: string;
  status: 'active' | 'draft';
};

export const contentHighlights: ContentHighlight[] = [
  {
    id: 'h1',
    title: 'Featured highland stop',
    note: 'Highlight Tagaytay ridge cafés on the landing page.',
    destination: 'Tagaytay Ridge',
    status: 'active',
  },
  {
    id: 'h2',
    title: 'Heritage week',
    note: 'Promote Kawit & Imus historical establishments.',
    destination: 'Aguinaldo Shrine',
    status: 'active',
  },
  {
    id: 'h3',
    title: 'Coastal draft',
    note: 'Upcoming Tanza / Bacoor food spots bundle.',
    destination: 'Bacoor Bayside',
    status: 'draft',
  },
];

/** Content → Filters (system filter chips). */
export type ContentFilter = {
  id: string;
  label: string;
  key: string;
  kind: 'ntdp' | 'city' | 'type';
  enabled: boolean;
  sortOrder: number;
};

export const contentFilters: ContentFilter[] = [
  { id: 'f1', label: 'Resorts', key: 'resort', kind: 'ntdp', enabled: true, sortOrder: 1 },
  { id: 'f2', label: 'Cafés', key: 'cafe', kind: 'ntdp', enabled: true, sortOrder: 2 },
  { id: 'f3', label: 'Museums', key: 'museum', kind: 'ntdp', enabled: true, sortOrder: 3 },
  { id: 'f4', label: 'Tagaytay', key: 'tagaytay', kind: 'city', enabled: true, sortOrder: 4 },
  { id: 'f5', label: 'Silang', key: 'silang', kind: 'city', enabled: true, sortOrder: 5 },
  { id: 'f6', label: 'Nature farm', key: 'nature_farm', kind: 'type', enabled: false, sortOrder: 6 },
];

/** Content → Establishment demo rows. */
export type ContentEstablishment = {
  id: string;
  name: string;
  city: string;
  category: string;
  status: 'active' | 'hidden' | 'draft';
  address: string;
};

export const contentEstablishments: ContentEstablishment[] = [
  {
    id: 'e1',
    name: 'Cafe Agapita',
    city: 'Amadeo',
    category: 'Cafe / Restaurant',
    status: 'active',
    address: 'Poblacion, Amadeo, Cavite',
  },
  {
    id: 'e2',
    name: 'Tubigan Resort',
    city: 'Silang',
    category: 'Resort',
    status: 'active',
    address: 'Barangay Tubigan, Silang',
  },
  {
    id: 'e3',
    name: 'Tinatanggi Cafe',
    city: 'Tagaytay',
    category: 'Cafe / Restaurant',
    status: 'draft',
    address: 'Tagaytay Proper',
  },
  {
    id: 'e4',
    name: 'Aguinaldo Shrine',
    city: 'Kawit',
    category: 'Historical',
    status: 'active',
    address: 'Kawit, Cavite',
  },
  {
    id: 'e5',
    name: 'Picnic Grove',
    city: 'Tagaytay',
    category: 'Attraction',
    status: 'hidden',
    address: 'Tagaytay City',
  },
];

/** Content → Itineraries demo rows (route-focused). */
export type ContentItinerary = {
  id: string;
  title: string;
  route: string;
  stops: number;
  status: 'published' | 'draft' | 'flagged';
  featured: boolean;
};

export const contentItineraries: ContentItinerary[] = [
  {
    id: 'ci1',
    title: 'Highlands Getaway',
    route: 'Silang - Tagaytay',
    stops: 5,
    status: 'published',
    featured: true,
  },
  {
    id: 'ci2',
    title: 'Heritage & Horizons Trail',
    route: 'Imus - Bacoor - Noveleta',
    stops: 4,
    status: 'published',
    featured: false,
  },
  {
    id: 'ci3',
    title: 'Coastal Calm Journey',
    route: 'Tanza - Bacoor',
    stops: 3,
    status: 'draft',
    featured: false,
  },
  {
    id: 'ci4',
    title: 'Bloomfields & Breezes',
    route: 'Silang - Amadeo - Gen. Trias',
    stops: 6,
    status: 'flagged',
    featured: false,
  },
];

/** Rewards concept mock. */
export const rewardEarnRules = [
  { id: 'r1', title: 'Visit an establishment', points: 50, detail: 'Check in via map or place detail.' },
  { id: 'r2', title: 'Leave a review', points: 80, detail: 'Published reviews earn points once moderated.' },
  { id: 'r3', title: 'Complete an itinerary', points: 150, detail: 'Finish all stops on a curated day route.' },
  { id: 'r4', title: 'Open place directions', points: 30, detail: 'View the map route to a destination.' },
];

export const rewardRedeemables = [
  { id: 'v1', title: 'Café voucher', cost: 300, kind: 'Voucher' },
  { id: 'v2', title: 'Explorer badge', cost: 100, kind: 'Badge' },
  { id: 'v3', title: 'Resort day-pass discount', cost: 500, kind: 'Partner perk' },
  { id: 'v4', title: 'Heritage trail sticker pack', cost: 120, kind: 'Digital' },
];

export const rewardLedger = [
  { id: 'l1', user: 'Maria Santos', action: 'Visited Picnic Grove', points: 50, when: 'Today, 09:12' },
  { id: 'l2', user: 'Juan dela Cruz', action: 'Completed Highlands Getaway', points: 150, when: 'Yesterday' },
  { id: 'l3', user: 'Ana Reyes', action: 'Redeemed Café voucher', points: -300, when: '2 days ago' },
  { id: 'l4', user: 'Pedro Lim', action: 'Left a review', points: 80, when: '3 days ago' },
];
