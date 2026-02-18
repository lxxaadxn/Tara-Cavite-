/**
 * Mock data for the app - no API calls
 */

export interface Place {
  id: string;
  name: string;
  address: string;
  type: string;
  hours: string;
  latitude: number;
  longitude: number;
  image?: any; // For require() statements or URI strings
}

export interface Route {
  id: string;
  name: string;
  from: string;
  to: string;
  departureTime: string;
  duration: string;
  date: string;
}

export interface RouteStep {
  id: string;
  type: 'walk' | 'jeepney' | 'bus' | 'tricycle';
  instruction: string;
  duration: string;
  fare: string;
  icon: string;
}

export interface SavedList {
  id: string;
  name: string;
  icon: string;
  iconColor: string;
  isPrivate: boolean;
  placeCount: number;
}

export interface Notification {
  id: string;
  type: 'traffic' | 'arrival' | 'route-change';
  title: string;
  message: string;
  date: string;
  time: string;
}

export interface Terminal {
  id: string;
  name: string;
  category: 'dasma-bayan' | 'other';
  transportTypes: string[];
  status: 'OPEN' | 'CLOSED';
  operatingHours: string;
  averageFare: string;
  paymentType: string;
  primaryRoutes: { label: string; fare: string }[];
  reminders: string[];
  latitude: number;
  longitude: number;
}

// Trending Tourist Spots for home screen
export const trendingSpots: Place[] = [
  {
    id: '1',
    name: 'Tinatangi Cafe',
    address: 'Dasmariñas City, Cavite',
    type: 'Cafe',
    hours: '8:00 AM - 10:00 PM',
    latitude: 14.3297,
    longitude: 120.9367,
    image: require('../assets/images/Tinatangi_home.webp'),
  },
  {
    id: '2',
    name: 'Perlas ng Silang',
    address: 'Silang Cavite',
    type: 'Tourist Spot',
    hours: 'Open 24 hours',
    latitude: 14.2311,
    longitude: 120.9753,
    image: require('../assets/images/Perlasngsilang_home.webp'),
  },
  {
    id: '3',
    name: "People's Park",
    address: 'Tagaytay City, Cavite',
    type: 'Park',
    hours: 'Open 24 hours',
    latitude: 14.1133,
    longitude: 120.9383,
    image: require('../assets/images/Peoplespark_home.webp'),
  },
  {
    id: '4',
    name: 'Aguinaldo Shrine',
    address: 'Kawit, Cavite',
    type: 'Historical Site',
    hours: '8:00 AM - 4:00 PM',
    latitude: 14.4444,
    longitude: 120.9056,
    image: require('../assets/images/Aguinaldoshrine_home.webp'),
  },
];

// Recent searches (empty initially, will be populated from user's search history)
export const recentSearches: string[] = [];

// Nearby places for home (SM Dasmariñas, Tagaytay Picnic Grove, Starbucks Silang, Robinsons Dasma)
export const nearbyPlaces: Place[] = [
  {
    id: '1',
    name: 'SM Dasmariñas',
    address: 'Dasmariñas City, Cavite',
    type: 'Shopping Mall',
    hours: '10:00 AM - 9:00 PM',
    latitude: 14.3297,
    longitude: 120.9367,
  },
  {
    id: '2',
    name: 'Tagaytay Picnic Grove',
    address: 'Tagaytay City, Cavite',
    type: 'Park',
    hours: 'Open 24 hours',
    latitude: 14.1133,
    longitude: 120.9383,
  },
  {
    id: '3',
    name: 'Starbucks Silang',
    address: 'Silang, Cavite',
    type: 'Cafe',
    hours: '7:00 AM - 9:00 PM',
    latitude: 14.2311,
    longitude: 120.9753,
  },
  {
    id: '4',
    name: 'Robinsons Dasma',
    address: 'Silang, Cavite',
    type: 'Shopping Mall',
    hours: '10:00 AM - 9:00 PM',
    latitude: 14.3300,
    longitude: 120.9370,
  },
];

// Mock places (full list)
export const mockPlaces: Place[] = [
  ...nearbyPlaces,
  ...trendingSpots,
];

// Mock routes/history
export const mockRoutes: Route[] = [
  {
    id: '1',
    name: 'Home to Tagaytay',
    from: 'Home',
    to: 'Tagaytay Picnic Grove',
    departureTime: '8:45 AM',
    duration: '1hr',
    date: '2026-02-13',
  },
  {
    id: '2',
    name: 'Robinsons Pala-pala to Trece',
    from: 'Robinsons Pala-pala',
    to: 'Trece Terminal',
    departureTime: '10:00 AM',
    duration: '30mins',
    date: '2026-02-13',
  },
  {
    id: '3',
    name: 'Home to Trece Terminal',
    from: 'Home',
    to: 'Trece Terminal',
    departureTime: '10:00 AM',
    duration: '40mins',
    date: '2026-02-12',
  },
  {
    id: '4',
    name: 'SM Dasma to Perlas ng Silang',
    from: 'SM Dasma',
    to: 'Perlas ng Silang',
    departureTime: '10:00 AM',
    duration: '50mins',
    date: '2026-02-12',
  },
  {
    id: '5',
    name: 'NU Dasma to Balisasayaw Silang',
    from: 'NU Dasma',
    to: 'Balisasayaw Silang',
    departureTime: '1:00 PM',
    duration: '40mins',
    date: '2026-02-12',
  },
  {
    id: '6',
    name: 'General Trias to Vermosa',
    from: 'General Trias',
    to: 'Vermosa',
    departureTime: '12:00 NN',
    duration: '30mins',
    date: '2026-01-01',
  },
];

// Mock route steps for directions
export const mockRouteSteps: RouteStep[] = [
  {
    id: '1',
    type: 'walk',
    instruction: 'Go to the Washington Place Main Gate along the highway',
    duration: '5 mins',
    fare: 'Free',
    icon: 'walk',
  },
  {
    id: '2',
    type: 'bus',
    instruction: 'Take a bus with destination signboard. Tell conductor your destination, pay, and get your ticket',
    duration: '45 mins',
    fare: '₱45',
    icon: 'bus',
  },
  {
    id: '3',
    type: 'walk',
    instruction: 'Get off at Olivarez Rotonda (the center of Tagaytay)',
    duration: '2 mins',
    fare: 'Free',
    icon: 'walk',
  },
  {
    id: '4',
    type: 'jeepney',
    instruction: 'Look for a Jeepney with signboard "People\'s Park" or "Picnic Grove"',
    duration: '15 mins',
    fare: '₱25',
    icon: 'car',
  },
];

// Mock saved lists
export const mockSavedLists: SavedList[] = [
  {
    id: '1',
    name: 'Saved places',
    icon: 'bookmark',
    iconColor: '#9C27B0',
    isPrivate: true,
    placeCount: 0,
  },
  {
    id: '2',
    name: 'Starred places',
    icon: 'star',
    iconColor: '#FFC107',
    isPrivate: true,
    placeCount: 0,
  },
  {
    id: '3',
    name: 'Favorite places',
    icon: 'heart',
    iconColor: '#F44336',
    isPrivate: true,
    placeCount: 0,
  },
  {
    id: '4',
    name: 'Favorite Terminal',
    icon: 'business',
    iconColor: '#2196F3',
    isPrivate: true,
    placeCount: 0,
  },
  {
    id: '5',
    name: 'Saved trips',
    icon: 'flag',
    iconColor: '#1B4D4D',
    isPrivate: true,
    placeCount: 0,
  },
];

// Mock notifications
export const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'traffic',
    title: 'Heavy traffic alert',
    message: 'Heavy traffic detected on Aguinaldo Highway near SM Dasma. Expect 20-minute delays.',
    date: '2026-02-13',
    time: '8:30 AM',
  },
  {
    id: '2',
    type: 'arrival',
    title: 'Almost There!',
    message: 'You are 500m away from your stop (Robinson\'s Place Imus). Get ready to alight!',
    date: '2026-02-13',
    time: '9:15 AM',
  },
  {
    id: '3',
    type: 'route-change',
    title: 'Route change',
    message: 'Jeepney route via Langkaan is currently detouring due to road repairs.',
    date: '2026-02-12',
    time: '2:00 PM',
  },
];

// Categories for home screen
export const categories = [
  { id: '1', name: 'Terminals', icon: 'business' },
  { id: '2', name: 'Jeepney Stops', icon: 'car' },
  { id: '3', name: 'Tricycle Stops', icon: 'bicycle' },
  { id: '4', name: 'Bus Stops', icon: 'bus' },
];

// Mock terminals
export const mockTerminals: Terminal[] = [
  {
    id: '1',
    name: 'Robinsons Pala-pala terminal',
    category: 'dasma-bayan',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 100',
    paymentType: 'Cash',
    primaryRoutes: [
      { label: 'To Tagaytay (Bus/Jeep)', fare: '₱50 approx.' },
      { label: 'To Dasma Bayan (Bus/Jeep)', fare: '₱11-20' },
    ],
    reminders: [
      'Expect long lines from 5:00 PM to 8:00 PM',
      'Reminder to have Student/Senior Citizen/PWD IDs ready for the 20% discount.',
    ],
    latitude: 14.3297,
    longitude: 120.9367,
  },
  {
    id: '2',
    name: 'SM Pala-pala terminal',
    category: 'dasma-bayan',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 100',
    paymentType: 'Cash',
    primaryRoutes: [
      { label: 'To Tagaytay (Bus/Jeep)', fare: '₱50 approx.' },
      { label: 'To Dasma Bayan (Bus/Jeep)', fare: '₱11-20' },
    ],
    reminders: [
      'Expect long lines from 5:00 PM to 8:00 PM',
      'Reminder to have Student/Senior Citizen/PWD IDs ready for the 20% discount.',
    ],
    latitude: 14.3300,
    longitude: 120.9370,
  },
  {
    id: '3',
    name: 'SM Dasmariñas Pala-pala Terminal',
    category: 'dasma-bayan',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 100',
    paymentType: 'Cash',
    primaryRoutes: [
      { label: 'To Tagaytay (Bus/Jeep)', fare: '₱50 approx.' },
      { label: 'To Dasma Bayan (Bus/Jeep)', fare: '₱11-20' },
    ],
    reminders: [
      'Expect long lines from 5:00 PM to 8:00 PM',
      'Reminder to have Student/Senior Citizen/PWD IDs ready for the 20% discount.',
    ],
    latitude: 14.3297,
    longitude: 120.9367,
  },
  {
    id: '4',
    name: 'General Trias terminal',
    category: 'other',
    transportTypes: ['Jeepney', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 10PM',
    averageFare: 'PHP 12 - 50',
    paymentType: 'Cash',
    primaryRoutes: [{ label: 'To Baclaran', fare: '₱35 approx.' }],
    reminders: [],
    latitude: 14.4167,
    longitude: 120.8833,
  },
  {
    id: '5',
    name: 'Imus terminal',
    category: 'other',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 80',
    paymentType: 'Cash',
    primaryRoutes: [{ label: 'To Manila', fare: '₱45-80' }],
    reminders: [],
    latitude: 14.4297,
    longitude: 120.9367,
  },
  {
    id: '6',
    name: 'All Homes terminal',
    category: 'other',
    transportTypes: ['Jeepney'],
    status: 'OPEN',
    operatingHours: '6AM - 8PM',
    averageFare: 'PHP 10 - 30',
    paymentType: 'Cash',
    primaryRoutes: [],
    reminders: [],
    latitude: 14.3500,
    longitude: 120.9200,
  },
];
