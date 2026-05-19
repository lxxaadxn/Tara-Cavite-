export const stats = {
  touristSpots: 142,
  spotsGrowth: 12,
  routes: 38,
  routesGrowth: 5,
  activeUsers: 2847,
  usersGrowth: 23,
  mostVisited: { name: 'Corregidor Island', visits: 4230 },
};

export const recentActivity = [
  { id: '1', text: 'New spot added - Corregidor Island Historical Site', time: '2 hours ago', status: 'approved' },
  { id: '2', text: 'Route updated - Manila to Tagaytay scenic route', time: '4 hours ago', status: 'approved' },
  { id: '3', text: 'User review submitted - 5-star review for Aguinaldo Shrine', time: '6 hours ago', status: 'pending' },
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
  { month: 'Jan', visitors: 4200 },
  { month: 'Feb', visitors: 6500 },
  { month: 'Mar', visitors: 9800 },
  { month: 'Apr', visitors: 7200 },
  { month: 'May', visitors: 5500 },
  { month: 'Jun', visitors: 3500 },
];

/** @deprecated use mostVisitedDestinations */
export const topDestinations = [
  { name: 'Corregidor', count: 1340 },
  { name: 'Tagaytay Ridge', count: 1120 },
  { name: "People's Park", count: 980 },
  { name: 'Aguinaldo Shrine', count: 850 },
  { name: 'Tagaytay Picnic Grove', count: 720 },
];

export const mostVisitedDestinations = [
  { name: 'Corregidor Island', visits: 4230, city: 'Cavite City' },
  { name: 'Tagaytay Ridge', visits: 3810, city: 'Tagaytay' },
  { name: 'Aguinaldo Shrine', visits: 2940, city: 'Kawit' },
  { name: "People's Park in the Sky", visits: 2680, city: 'Tagaytay' },
  { name: 'Picnic Grove', visits: 2150, city: 'Tagaytay' },
];

export const mostSearchedLocations = [
  { query: 'Tagaytay', searches: 2840 },
  { query: 'Kawit heritage', searches: 1920 },
  { query: 'Corregidor tour', searches: 1750 },
  { query: 'Bacoor food spots', searches: 1480 },
  { query: 'Dasmariñas parks', searches: 1210 },
];

export const peakVisitorTimes = [
  { label: '6 AM', visitors: 420 },
  { label: '8 AM', visitors: 1280 },
  { label: '10 AM', visitors: 2140 },
  { label: '12 PM', visitors: 2680 },
  { label: '2 PM', visitors: 2410 },
  { label: '4 PM', visitors: 1980 },
  { label: '6 PM', visitors: 1560 },
  { label: '8 PM', visitors: 920 },
];

export const topRatedDestinations = [
  { name: 'Aguinaldo Shrine', rating: 4.9, reviews: 312 },
  { name: 'Corregidor Island', rating: 4.8, reviews: 428 },
  { name: 'Tagaytay Ridge', rating: 4.7, reviews: 356 },
  { name: 'Baldomero Aguinaldo Museum', rating: 4.6, reviews: 189 },
  { name: 'Museo ni Baldomero', rating: 4.5, reviews: 142 },
];

export const userEngagementTrend = [
  { period: 'Jan', sessions: 8200, saves: 1240, itineraries: 680, searches: 9100 },
  { period: 'Feb', sessions: 9400, saves: 1480, itineraries: 790, searches: 10200 },
  { period: 'Mar', sessions: 11200, saves: 1820, itineraries: 940, searches: 12800 },
  { period: 'Apr', sessions: 10800, saves: 1710, itineraries: 910, searches: 11900 },
  { period: 'May', sessions: 9600, saves: 1590, itineraries: 850, searches: 10500 },
  { period: 'Jun', sessions: 8900, saves: 1420, itineraries: 780, searches: 9800 },
];

export const engagementSummary = {
  dailyActiveUsers: 486,
  avgSessionMinutes: 12.4,
  saveRatePercent: 34,
  searchToDetailPercent: 68,
  returningUserPercent: 41,
};

export const tourismTypes = [
  { name: 'Beach', value: 35 },
  { name: 'Mountain', value: 25 },
  { name: 'Cultural', value: 15 },
  { name: 'Historical', value: 15 },
  { name: 'Parks', value: 10 },
];
