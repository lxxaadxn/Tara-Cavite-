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
  /** Shown on home cards (Figma) */
  rating?: string;
  /** From Supabase / LGU STA inventory */
  description?: string;
  ntdp_category?: string;
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
  /** City or municipality for location filter */
  municipality: string;
  /** Subtitle under title, e.g. barangay, city, region */
  addressLine?: string;
  /** Long description for detail “Description” tab */
  description?: string;
  category: 'dasma-bayan' | 'other';
  transportTypes: string[];
  status: 'OPEN' | 'CLOSED';
  operatingHours: string;
  averageFare: string;
  paymentType: string;
  /** Simple route list when the terminal has no gate groupings */
  primaryRoutes: { label: string }[];
  /** PITX-style: routes grouped by gate (accordion in UI) */
  routesByGate?: { gateName: string; routes: { label: string }[] }[];
  reminders: string[];
  latitude: number;
  longitude: number;
}

// Trending Tourist Spots for home screen (Figma dashboard export)
export const trendingSpots: Place[] = [
  {
    id: '1',
    name: 'Tinatangi Cafe',
    address: 'Silang, Cavite',
    type: 'Cafe',
    hours: '8:00 AM - 10:00 PM',
    latitude: 14.3297,
    longitude: 120.9367,
    image: require('../assets/images/picture-7.png'),
    rating: '5.0',
  },
  {
    id: '2',
    name: 'Aguinaldo Shrine',
    address: '15, 52 Tirona Hwy, Kawit, 4104 Cavite',
    type: 'Historical Site',
    hours: '8:00 AM - 4:00 PM',
    latitude: 14.4444,
    longitude: 120.9056,
    image: require('../assets/images/picture-15.png'),
    rating: '4.9',
  },
  {
    id: '3',
    name: 'Taal Volcano View',
    address: 'Tagaytay City',
    type: 'Tourist Spot',
    hours: 'Open 24 hours',
    latitude: 14.1133,
    longitude: 120.9383,
    image: require('../assets/images/picture-23.png'),
    rating: '4.8',
  },
  {
    id: '4',
    name: 'Immaculate Conception',
    address: 'Don Placido Campos Avenue, Dasmariñas',
    type: 'Church',
    hours: 'Open for mass',
    latitude: 14.3297,
    longitude: 120.9367,
    image: require('../assets/images/picture-31.png'),
    rating: '5.0',
  },
];

// Recent searches (empty initially, will be populated from user's search history)
export const recentSearches: string[] = [];

// Nearby places for home (Figma dashboard export)
export const nearbyPlaces: Place[] = [
  {
    id: '1',
    name: 'SM Dasmarinas',
    address: "4114 Governor's Dr, Brgy, Dasmariñas City",
    type: 'Shopping Mall',
    hours: '10:00 AM - 9:00 PM',
    latitude: 14.3297,
    longitude: 120.9367,
    image: require('../assets/images/picture-43.png'),
    rating: '5.0',
  },
  {
    id: '2',
    name: 'Museo De La Salle',
    address: 'De La Salle University - Dasma Brgy. Fatima 1, Dasmariñas City',
    type: 'Museum',
    hours: '9:00 AM - 4:00 PM',
    latitude: 14.3297,
    longitude: 120.9367,
    image: require('../assets/images/picture-51.png'),
    rating: '4.9',
  },
  {
    id: '3',
    name: "Volet's Hotel & Resort",
    address: 'Aguinaldo Hwy, Dasmariñas, Cavite',
    type: 'Hotel',
    hours: 'Open 24 hours',
    latitude: 14.33,
    longitude: 120.94,
    image: require('../assets/images/picture-59.png'),
    rating: '4.8',
  },
  {
    id: '4',
    name: 'Brewny Coffee Master',
    address: 'Immaculate Conception Academy Sports Complex',
    type: 'Cafe',
    hours: '7:00 AM - 9:00 PM',
    latitude: 14.3297,
    longitude: 120.9367,
    image: require('../assets/images/picture-67.png'),
    rating: '5.0',
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
    message: 'You are 500m away from your stop. Get ready to alight!',
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

/** Saved / featured itineraries (Itineraries tab — Figma) */
export interface ItineraryCard {
  id: string;
  title: string;
  subtitle: string;
  image: any;
}

export const mockItineraries: ItineraryCard[] = [
  {
    id: '1',
    title: 'Highlands Getaway',
    subtitle: 'Silang - Tagaytay',
    image: require('../assets/images/itinerary-green-hills.png'),
  },
  {
    id: '2',
    title: 'Highlands & Hidden Gems',
    subtitle: 'Alfonso – Magallanes – Maragondon',
    image: require('../assets/images/itinerary-cycling-vista.png'),
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
    municipality: 'Dasmariñas',
    category: 'dasma-bayan',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 100',
    paymentType: 'Cash',
    primaryRoutes: [
      { label: 'To Tagaytay (Bus/Jeep)' },
      { label: 'To Dasma Bayan (Bus/Jeep)' },
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
    municipality: 'Dasmariñas',
    category: 'dasma-bayan',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 100',
    paymentType: 'Cash',
    primaryRoutes: [
      { label: 'To Tagaytay (Bus/Jeep)' },
      { label: 'To Dasma Bayan (Bus/Jeep)' },
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
    municipality: 'Dasmariñas',
    category: 'dasma-bayan',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 100',
    paymentType: 'Cash',
    primaryRoutes: [
      { label: 'To Tagaytay (Bus/Jeep)' },
      { label: 'To Dasma Bayan (Bus/Jeep)' },
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
    municipality: 'General Trias',
    category: 'other',
    transportTypes: ['Jeepney', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 10PM',
    averageFare: 'PHP 12 - 50',
    paymentType: 'Cash',
    primaryRoutes: [{ label: 'To Baclaran' }],
    reminders: [],
    latitude: 14.4167,
    longitude: 120.8833,
  },
  {
    id: '5',
    name: 'Imus terminal',
    municipality: 'Imus',
    category: 'other',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 12MN',
    averageFare: 'PHP 15 - 80',
    paymentType: 'Cash',
    primaryRoutes: [{ label: 'To Manila' }],
    reminders: [],
    latitude: 14.4297,
    longitude: 120.9367,
  },
  {
    id: '6',
    name: 'All Homes terminal',
    municipality: 'Dasmariñas',
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
  {
    id: '7',
    name: 'PITX',
    municipality: 'Parañaque',
    addressLine: 'Tambo, Parañaque, Metro Manila',
    description:
      'The Parañaque Integrated Terminal Exchange (PITX) is a major land transport hub serving provincial buses, modern jeepneys, and city routes in Metro Manila. Passengers can transfer between regional services and local feeders, with amenities such as waiting areas, ticketing, and retail. Peak hours typically see higher passenger volume; plan arrivals with extra time for security and boarding.',
    category: 'other',
    transportTypes: ['Bus', 'Modern Jeepney', 'Jeepney', 'Van'],
    status: 'OPEN',
    operatingHours: '4AM - 12MN',
    averageFare: 'PHP 15 - 120',
    paymentType: 'Cash / Beep',
    primaryRoutes: [],
    routesByGate: [
      {
        gateName: 'Gate A — Provincial buses',
        routes: [
          { label: 'Cavite (Dasmariñas, Imus, Bacoor corridors)' },
          { label: 'Batangas / Lemery' },
          { label: 'Bicol express connections' },
        ],
      },
      {
        gateName: 'Gate B — City & metro feeders',
        routes: [
          { label: 'EDSA Carousel and city bus links' },
          { label: 'Parañaque & Pasay local loops' },
        ],
      },
      {
        gateName: 'Gate C — Jeepney & UV',
        routes: [
          { label: 'Modern jeepney bays' },
          { label: 'UV express pick-up zones' },
        ],
      },
    ],
    reminders: [],
    latitude: 14.5092,
    longitude: 120.9819,
  },
  {
    id: '8',
    name: 'SM Molino Terminal',
    municipality: 'Bacoor',
    category: 'other',
    transportTypes: ['Jeepney', 'Bus', 'Van', 'Modern Jeepney'],
    status: 'OPEN',
    operatingHours: '5AM - 10PM',
    averageFare: 'PHP 12 - 60',
    paymentType: 'Cash',
    primaryRoutes: [{ label: 'To Dasma / Manila' }],
    reminders: [],
    latitude: 14.3704,
    longitude: 120.9831,
  },
  {
    id: '9',
    name: 'Waltermart Dasma terminal',
    municipality: 'Dasmariñas',
    category: 'dasma-bayan',
    transportTypes: ['Jeepney', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '6AM - 9PM',
    averageFare: 'PHP 12 - 40',
    paymentType: 'Cash',
    primaryRoutes: [{ label: 'To Bayan' }],
    reminders: [],
    latitude: 14.3189,
    longitude: 120.9394,
  },
  {
    id: '10',
    name: 'Trece Martires terminal',
    municipality: 'Trece Martires',
    category: 'other',
    transportTypes: ['Jeepney', 'Bus', 'Tricycle'],
    status: 'OPEN',
    operatingHours: '5AM - 8PM',
    averageFare: 'PHP 10 - 50',
    paymentType: 'Cash',
    primaryRoutes: [],
    reminders: [],
    latitude: 14.2833,
    longitude: 120.8667,
  },
  {
    id: '11',
    name: 'Bacoor City Strike terminal',
    municipality: 'Bacoor',
    category: 'other',
    transportTypes: ['Jeepney', 'Bus'],
    status: 'OPEN',
    operatingHours: '5AM - 10PM',
    averageFare: 'PHP 12 - 45',
    paymentType: 'Cash',
    primaryRoutes: [],
    reminders: [],
    latitude: 14.4594,
    longitude: 120.9597,
  },
];
