export const stats = {
  touristSpots: 142,
  spotsGrowth: 12,
  routes: 38,
  routesGrowth: 5,
  activeUsers: 2847,
  usersGrowth: 23,
  mostVisited: { name: 'Corregidor Island', visits: 1234 },
};

export const recentActivity = [
  { id: '1', text: 'New spot added - Corregidor Island Historical Site', time: '2 hours ago', status: 'approved' },
  { id: '2', text: 'Route updated - Manila to Tagaytay scenic route', time: '4 hours ago', status: 'approved' },
  { id: '3', text: 'User review submitted - 5-star review for Puerto Princesa', time: '6 hours ago', status: 'pending' },
];

export const touristSpots = [
  { id: '1', name: 'Corregidor Island', category: 'Historical', city: 'Cavite', status: 'active', image: '🏛️' },
  { id: '2', name: 'Tagaytay Ridge', category: 'Mountain', city: 'Cavite', status: 'active', image: '⛰️' },
  { id: '3', name: 'Puerto Princesa', category: 'Beach', city: 'Batangas', status: 'active', image: '🏖️' },
  { id: '4', name: 'Cavite Heritage Trail', category: 'Cultural', city: 'Cavite', status: 'hidden', image: '🏛️' },
  { id: '5', name: 'Mt. Batulao', category: 'Mountain', city: 'Batangas', status: 'active', image: '⛰️' },
];

export const routes = [
  { id: '1', name: 'Manila to Tagaytay', from: 'Manila', to: 'Tagaytay', duration: '2 hours', transport: 'Car', status: 'active' },
  { id: '2', name: 'Cavite Heritage Trail', from: 'Imus', to: 'Kawit', duration: '3 hours', transport: 'Jeepney', status: 'active' },
  { id: '3', name: 'Island Hopping', from: 'Puerto Princesa', to: 'El Nido', duration: '5 hours', transport: 'Boat', status: 'active' },
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

export const topDestinations = [
  { name: 'Corregidor', count: 1340 },
  { name: 'Tagaytay Ridge', count: 1120 },
  { name: 'People\'s Park', count: 980 },
  { name: 'Puerto Princesa', count: 850 },
  { name: 'Mt. Batulao', count: 720 },
];

export const tourismTypes = [
  { name: 'Beach', value: 35 },
  { name: 'Mountain', value: 25 },
  { name: 'Cultural', value: 15 },
  { name: 'Historical', value: 15 },
  { name: 'Parks', value: 10 },
];
