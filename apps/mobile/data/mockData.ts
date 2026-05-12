/**
 * Mock / offline fallback data. Live Cavite STA listings use `v_cavite_establishments`.
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
  /** Extra bundled photos (see `establishmentLocalImages.ts`) */
  gallery?: any[];
  /** Shown on home cards (Figma) */
  rating?: string;
  /** From Supabase / LGU STA inventory */
  description?: string;
  ntdp_category?: string;
  /** LGU label when loaded from Cavite view */
  city_mun?: string;
}

export interface Route {
  id: string;
  name: string;
  from: string;
  to: string;
  departureTime: string;
  duration: string;
  date: string;
  /** When set (mock history only), `date` is replaced at runtime relative to “today”. */
  historyRelative?: 'today' | 'yesterday' | 'lastMonth';
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
    id: 'tr-silang',
    name: 'Tinatangi Cafe',
    address: 'Silang, Cavite',
    type: 'Cafe',
    hours: '8:00 AM - 10:00 PM',
    latitude: 14.2156,
    longitude: 120.9719,
    image: require('../assets/images/picture-7.png'),
    rating: '5.0',
  },
  {
    id: 'tr-cavite-city',
    name: 'Corregidor Island ferry point',
    address: 'Cavite City, Cavite',
    type: 'Tourism transport',
    hours: 'See operator',
    latitude: 14.4826,
    longitude: 120.908,
    image: require('../assets/images/picture-15.png'),
    rating: '4.9',
  },
  {
    id: 'tr-tagaytay',
    name: 'Taal Volcano View',
    address: 'Tagaytay City, Cavite',
    type: 'Tourist Spot',
    hours: 'Open 24 hours',
    latitude: 14.1133,
    longitude: 120.9383,
    image: require('../assets/images/picture-23.png'),
    rating: '4.8',
  },
  {
    id: 'tr-dasma',
    name: 'Immaculate Conception Parish',
    address: 'Dasmariñas City, Cavite',
    type: 'Church',
    hours: 'Open for mass',
    latitude: 14.3271,
    longitude: 120.9358,
    image: require('../assets/images/picture-31.png'),
    rating: '5.0',
  },
];

// Recent searches (empty initially, will be populated from user's search history)
export const recentSearches: string[] = [];

// Nearby places for home (offline fallback — spread across Cavite LGUs; live data from Supabase)
export const nearbyPlaces: Place[] = [
  {
    id: 'nb-bacoor',
    name: 'SM City Bacoor',
    address: 'Bacoor City, Cavite',
    type: 'Shopping Mall',
    hours: '10:00 AM - 9:00 PM',
    latitude: 14.4594,
    longitude: 120.9605,
    image: require('../assets/images/picture-43.png'),
    rating: '5.0',
  },
  {
    id: 'nb-imus',
    name: 'Imus Cathedral',
    address: 'Imus City, Cavite',
    type: 'Church',
    hours: 'See parish schedule',
    latitude: 14.4296,
    longitude: 120.9377,
    image: require('../assets/images/picture-51.png'),
    rating: '4.9',
  },
  {
    id: 'nb-tagaytay',
    name: 'Tagaytay Picnic Grove',
    address: 'Tagaytay City, Cavite',
    type: 'Nature / Park',
    hours: '6:00 AM - 10:00 PM',
    latitude: 14.1153,
    longitude: 120.9621,
    image: require('../assets/images/picture-59.png'),
    rating: '4.8',
  },
  {
    id: 'nb-silang',
    name: 'Silang Town Plaza',
    address: 'Silang, Cavite',
    type: 'Town center',
    hours: 'Open daily',
    latitude: 14.2156,
    longitude: 120.9719,
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
    historyRelative: 'today',
  },
  {
    id: '2',
    name: 'Anytown to Pleasantville',
    from: 'Anytown, NY 12345',
    to: 'Pleasantville, NY 12345',
    departureTime: '10:00 AM',
    duration: '30mins',
    date: '2026-02-13',
    historyRelative: 'today',
  },
  {
    id: '3',
    name: 'Greenville to Springfield',
    from: 'Greenville, NY 12345',
    to: 'Springfield, IL 67890',
    departureTime: '10:00 AM',
    duration: '40mins',
    date: '2026-02-12',
    historyRelative: 'yesterday',
  },
  {
    id: '4',
    name: 'SM Dasma to Perlas ng Silang',
    from: 'SM Dasma',
    to: 'Perlas ng Silang',
    departureTime: '10:00 AM',
    duration: '50mins',
    date: '2026-02-12',
    historyRelative: 'yesterday',
  },
  {
    id: '5',
    name: 'NU Dasma to Balisasayaw Silang',
    from: 'NU Dasma',
    to: 'Balisasayaw Silang',
    departureTime: '1:00 PM',
    duration: '40mins',
    date: '2026-02-12',
    historyRelative: 'yesterday',
  },
  {
    id: '6',
    name: 'General Trias to Vermosa',
    from: 'General Trias',
    to: 'Vermosa',
    departureTime: '12:00 NN',
    duration: '30mins',
    date: '2026-01-01',
    historyRelative: 'lastMonth',
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

/** Resolves to a `Place` from `trendingSpots` or `nearbyPlaces` (use distinct string ids per pool). */
export type ItineraryStopEstablishmentRef = {
  source: 'trending' | 'nearby';
  placeId: string;
};

/** Leg / stop copy for itinerary detail screen */
export interface ItineraryStopContent {
  name: string;
  description: string;
  leg?: string;
  /** Featured establishment for this stop (detail screen + “Places in this route”). */
  establishment?: ItineraryStopEstablishmentRef;
}

/** Saved / featured itineraries (Itineraries tab — Figma) */
export interface ItineraryCard {
  id: string;
  title: string;
  subtitle: string;
  image: any;
  stops?: number;
  durationLabel?: string;
  tags?: string[];
  summary?: string;
  highlights?: string[];
  stopList?: ItineraryStopContent[];
  tips?: string[];
  bestTime?: string;
}

export const mockItineraries: ItineraryCard[] = [
  {
    id: '1',
    title: 'Highlands Getaway',
    subtitle: 'Silang → Tagaytay ridge',
    image: require('../assets/images/itinerary-green-hills.png'),
    stops: 5,
    durationLabel: '1 day',
    tags: ['Views', 'Food'],
    summary:
      'Upland cafés and ridge views — cool air, slow mornings, and easy hops by bus or trike. Built for photos and long chats.',
    highlights: [
      'Alfresco coffee with Taal-leaning vistas',
      'Flexible pacing for half- or full-day',
      'Mix of bus + tricycle last mile',
    ],
    stopList: [
      {
        name: 'Silang town proper',
        description: 'Meet the route, grab water, confirm trike fares upland.',
        leg: 'Jeepneys from Dasma / Aguinaldo Hwy often pass through.',
        establishment: { source: 'trending', placeId: 'tr-silang' },
      },
      {
        name: 'Garden café strip',
        description: 'Patios and local roasters — ideal first meal.',
        leg: 'Short trike hops; agree return if late.',
        establishment: { source: 'nearby', placeId: 'nb-silang' },
      },
      {
        name: 'Ridge approach',
        description: 'Climb with lookout pockets; weekend traffic builds noon–4pm.',
        leg: 'Bus or van along the highway spine.',
        establishment: { source: 'nearby', placeId: 'nb-tagaytay' },
      },
      {
        name: 'Tagaytay viewpoint',
        description: 'Classic panorama — mist after rain is normal.',
        leg: 'Walk from drop-offs; bring a wind layer.',
        establishment: { source: 'trending', placeId: 'tr-tagaytay' },
      },
      {
        name: 'Sunset dinner',
        description: 'West-facing grills and bistros — book on holidays.',
        leg: 'Vans early evening; ride-apps after dark.',
        establishment: { source: 'nearby', placeId: 'nb-bacoor' },
      },
    ],
    tips: ['Light jacket after 4pm', 'Cash for trikes', 'Long weekends = heavier traffic'],
    bestTime: 'Weekday mornings · clearer Dec–May',
  },
  {
    id: '2',
    title: 'Highlands & Hidden Gems',
    subtitle: 'Alfonso – Magallanes – Maragondon',
    image: require('../assets/images/itinerary-cycling-vista.png'),
    stops: 4,
    durationLabel: 'Full day',
    tags: ['Nature', 'Cycling'],
    summary:
      'A longer loop for riders and road-trippers — inland breeze, smaller towns, and quieter roads than the main Tagaytay strip.',
    highlights: ['Mix of inland greenery and town stops', 'Good for bikes or a hired van', 'Less mall-heavy than ridge-only days'],
    stopList: [
      {
        name: 'Alfonso jump-off',
        description: 'Coffee, tires/air check, and route briefing.',
        leg: 'Private car or van from Silang / Tagaytay access roads.',
        establishment: { source: 'trending', placeId: 'tr-silang' },
      },
      {
        name: 'Magallanes sidestreets',
        description: 'Low-traffic pockets; respect local school zones.',
        leg: 'Rolling segments — hydrate every hour.',
        establishment: { source: 'trending', placeId: 'tr-cavite-city' },
      },
      {
        name: 'Maragondon approach',
        description: 'Greener stretch; photo stops off the shoulder only.',
        leg: 'Narrow lanes — single-file if cycling.',
        establishment: { source: 'trending', placeId: 'tr-tagaytay' },
      },
      {
        name: 'Late lunch bayan',
        description: 'Carinderia or small grill before the return climb.',
        leg: 'Jeepney connections toward coastal roads if extending the trip.',
        establishment: { source: 'nearby', placeId: 'nb-silang' },
      },
    ],
    tips: ['Helmet + lights if biking', 'Check weather for afternoon storms', 'Carry repair kit on long rides'],
    bestTime: 'Start at dawn on weekends',
  },
];

/** Resolve a featured establishment for an itinerary stop (`trending` vs `nearby` disambiguates pools). */
export function resolveItineraryEstablishment(ref: ItineraryStopEstablishmentRef): Place | undefined {
  const pool = ref.source === 'trending' ? trendingSpots : nearbyPlaces;
  return pool.find((p) => p.id === ref.placeId);
}

/** Unique establishments linked from itinerary stops (order follows stops; duplicates omitted). */
export function getItineraryEstablishments(itineraryRefId: string): Place[] {
  const it = mockItineraries.find((x) => x.id === itineraryRefId);
  if (!it?.stopList?.length) return [];
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const s of it.stopList) {
    if (!s.establishment) continue;
    const key = `${s.establishment.source}:${s.establishment.placeId}`;
    if (seen.has(key)) continue;
    const p = resolveItineraryEstablishment(s.establishment);
    if (p) {
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

// Categories for home screen
export const categories = [
  { id: '1', name: 'Terminals', icon: 'business' },
  { id: '2', name: 'Jeepney Stops', icon: 'car' },
  { id: '3', name: 'Tricycle Stops', icon: 'bicycle' },
  { id: '4', name: 'Bus Stops', icon: 'bus' },
];

// Mock terminals — six waypoints from the demo logistics route (NY → IL)
export const mockTerminals: Terminal[] = [
  {
    id: '1',
    name: 'Anytown, NY 12345',
    municipality: 'Anytown',
    addressLine: '123 Main St',
    description:
      'Northeast staging point on the demo corridor. Connects to regional freight and passenger services toward Pleasantville.',
    category: 'other',
    transportTypes: ['Bus', 'Van'],
    status: 'OPEN',
    operatingHours: '24 hours',
    averageFare: 'Varies by carrier',
    paymentType: 'Cash / Card',
    primaryRoutes: [{ label: 'To Pleasantville, NY' }, { label: 'Regional connections' }],
    reminders: ['Confirm cargo documentation before departure.'],
    latitude: 42.8142,
    longitude: -73.9396,
  },
  {
    id: '2',
    name: 'Pleasantville, NY 12345',
    municipality: 'Pleasantville',
    addressLine: '789 Oak Dr',
    description:
      'Westchester-area waypoint with organized loading zones. Mid-route pickups before continuing toward Greenville.',
    category: 'other',
    transportTypes: ['Bus', 'Van'],
    status: 'OPEN',
    operatingHours: '5:00 AM – 11:00 PM',
    averageFare: 'Varies by carrier',
    paymentType: 'Cash / Card',
    primaryRoutes: [{ label: 'To Greenville, NY' }, { label: 'To Anytown, NY' }],
    reminders: [],
    latitude: 41.1329,
    longitude: -73.794,
  },
  {
    id: '3',
    name: 'Greenville, NY 12345',
    municipality: 'Greenville',
    addressLine: 'ul. Słoneczna 10',
    description:
      'Final New York segment stop before long-haul transfer west. Confirm manifests and handoff windows with dispatch.',
    category: 'other',
    transportTypes: ['Bus', 'Van'],
    status: 'OPEN',
    operatingHours: '6:00 AM – 10:00 PM',
    averageFare: 'Varies by carrier',
    paymentType: 'Cash / Card',
    primaryRoutes: [{ label: 'To Springfield, IL' }, { label: 'NY regional' }],
    reminders: ['Long-haul transfers — verify trailer seals.'],
    latitude: 42.4153,
    longitude: -73.8232,
  },
  {
    id: '4',
    name: 'Springfield, IL 67890',
    municipality: 'Springfield',
    addressLine: '456 Elm Avenue',
    description:
      'Illinois hub — central state routes. Peak activity midday; allow extra time for dock assignment.',
    category: 'other',
    transportTypes: ['Bus', 'Van'],
    status: 'OPEN',
    operatingHours: '24 hours',
    averageFare: 'Varies by carrier',
    paymentType: 'Cash / Card',
    primaryRoutes: [{ label: 'To Lakeside, IL' }, { label: 'Central IL corridors' }],
    reminders: [],
    latitude: 39.7817,
    longitude: -89.6501,
  },
  {
    id: '5',
    name: 'Lakeside, IL 67890',
    municipality: 'Lakeside',
    addressLine: '456 Tanager Drive',
    description:
      'Lake-adjacent access. Staged unloading before the final leg to Mountain View.',
    category: 'other',
    transportTypes: ['Bus', 'Van'],
    status: 'OPEN',
    operatingHours: '5:00 AM – 12:00 AM',
    averageFare: 'Varies by carrier',
    paymentType: 'Cash / Card',
    primaryRoutes: [{ label: 'To Mountain View, IL' }],
    reminders: [],
    latitude: 42.0189,
    longitude: -87.6618,
  },
  {
    id: '6',
    name: 'Mountain View, IL 67890',
    municipality: 'Mountain View',
    addressLine: '321 Maple Lane',
    description:
      'End-of-route terminal in the northwest corridor. Final delivery confirmation and driver notes apply here.',
    category: 'other',
    transportTypes: ['Bus', 'Van'],
    status: 'OPEN',
    operatingHours: '24 hours',
    averageFare: 'Varies by carrier',
    paymentType: 'Cash / Card',
    primaryRoutes: [{ label: 'End of demo route' }],
    reminders: ['Inspect cargo before signing delivery.'],
    latitude: 42.0664,
    longitude: -88.0043,
  },
];
