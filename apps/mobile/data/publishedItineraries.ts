/**
 * Curated itineraries — featured stops reference rows in `public.places` by UUID.
 * Keep in sync with apps/web/src/data/mockItineraries.js
 */
export type ItineraryStopEstablishmentRef = {
  placeId: string;
};

export interface ItineraryStopContent {
  name: string;
  description: string;
  leg?: string;
  establishment?: ItineraryStopEstablishmentRef;
}

export interface PublishedItinerary {
  id: string;
  title: string;
  subtitle: string;
  route?: string;
  image: string;
  stops?: number;
  durationLabel?: string;
  tags?: string[];
  summary?: string;
  highlights?: string[];
  stopList?: ItineraryStopContent[];
  tips?: string[];
  bestTime?: string;
}

export const publishedItineraries: PublishedItinerary[] = [
  {
    id: 'highlands',
    title: 'Highlands Getaway',
    subtitle: 'Silang → Tagaytay ridge',
    route: 'Silang - Tagaytay',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
    durationLabel: '1 day',
    tags: ['Views', 'Food'],
    summary:
      'Upland farms, outlet shopping, and ridge viewpoints — a full Silang-to-Tagaytay day using verified Cavite establishments.',
    highlights: [
      'Starts in Silang cafés and farms, ends at Tagaytay lookouts',
      'Stops ordered for minimal backtracking',
      'Every featured spot opens in Search',
    ],
    stopList: [
      {
        name: 'Farm & café morning',
        description: 'Begin with gardens and local roasts before heading upland.',
        establishment: { placeId: '93e95b24-12e1-4bb6-a69e-100fbd9137e1' },
      },
      {
        name: 'Designer outlet break',
        description: 'Walkable retail village — good for snacks and souvenirs.',
        establishment: { placeId: '9e65d893-01c9-4200-9dc0-505392aca8bc' },
      },
      {
        name: 'Ridge picnic stop',
        description: 'Classic Tagaytay green space with Taal-facing views.',
        establishment: { placeId: 'a22975da-b031-4baa-9353-d9dbabe980a2' },
      },
      {
        name: 'Skyline finale',
        description: 'End at the high lookout while light is still clear.',
        establishment: { placeId: '693db4c7-29af-4571-8fe7-4f40a2bf2f4d' },
      },
    ],
    tips: ['Light jacket after 4 PM', 'Cash for trikes', 'Long weekends have heavier traffic'],
    bestTime: 'Weekday mornings · clearer Dec–May',
  },
  {
    id: 'heritage',
    title: 'Heritage & Horizons Trail',
    subtitle: 'Imus → Bacoor → Noveleta',
    route: 'Imus - Bacoor - Noveleta',
    image: 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop&q=80',
    durationLabel: 'Full day',
    tags: ['Culture', 'History'],
    summary:
      'Flag heritage in Imus, ancestral houses toward the bay, and Noveleta’s tribunal — all linked to catalogued sites.',
    highlights: [
      'National flag shrine and cathedral in Imus',
      'Ancestral architecture on the corridor south',
      'Waterfront-adjacent finish in Noveleta',
    ],
    stopList: [
      {
        name: 'National flag shrine',
        description: 'Start at the historic declaration site in Imus.',
        establishment: { placeId: '6b95f300-1cd6-4097-ba75-371a75041aca' },
      },
      {
        name: 'Imus cathedral',
        description: 'Short hop to the plaza and cathedral district.',
        establishment: { placeId: '9194ec49-4a06-418b-b6b9-582c96737e25' },
      },
      {
        name: 'Ancestral corridor',
        description: 'Heritage house stop before reaching the coast.',
        establishment: { placeId: '490c7feb-ecd4-4391-94ae-58486b908d10' },
      },
      {
        name: 'Noveleta tribunal',
        description: 'Wrap with a preserved civic landmark by the shore.',
        establishment: { placeId: '3d882e76-90b2-42ad-923c-e5056446cdbf' },
      },
    ],
    tips: ['Wear breathable clothes', 'Bring water', 'Most sites close early evenings'],
    bestTime: 'Morning to late afternoon',
  },
  {
    id: 'coastal',
    title: 'Coastal Calm Journey',
    subtitle: 'Tanza → Julugan → Bacoor',
    route: 'Tanza - Bacoor',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80',
    durationLabel: '1 day',
    tags: ['Beach', 'Seafood'],
    summary:
      'Plaza heritage, hacienda grounds, fish port, and mangroves — a relaxed coastal day from Tanza toward Manila Bay.',
    highlights: ['Seafood and port stops in Tanza', 'Heritage plaza and hacienda', 'Mangrove boardwalk finish'],
    stopList: [
      {
        name: 'Town plaza',
        description: 'Meet the route at Tanza’s central plaza.',
        establishment: { placeId: '5b044510-baec-4acb-80f9-0945e7fc7865' },
      },
      {
        name: 'Hacienda grounds',
        description: 'Stroll heritage grounds before heading to the coast.',
        establishment: { placeId: '5fbb3395-a820-478b-a72b-d3ca6cd0adb5' },
      },
      {
        name: 'Fish port',
        description: 'Fresh catch and harbor views at Julugan.',
        establishment: { placeId: '606dfa63-4830-4fd7-9a8f-36c98a8b92d6' },
      },
      {
        name: 'Mangrove walk',
        description: 'Close with coastal greenery along the bay.',
        establishment: { placeId: 'b672165c-2baf-4992-bf29-a19bd8c3cd76' },
      },
    ],
    tips: ['Bring sunblock', 'Carry extra clothes', 'Check weather for waves'],
    bestTime: 'Late morning to sunset',
  },
  {
    id: 'bloomfields',
    title: 'Bloomfields & Breezes Route',
    subtitle: 'Silang → Amadeo → General Trias → Dasmariñas',
    route: 'Silang - Amadeo - General Trias - Dasmariñas',
    image: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
    durationLabel: 'Half day',
    tags: ['Gardens', 'Cafe'],
    summary:
      'Coffee country and cafés from Silang through Amadeo and General Trias, ending at a Dasmariñas museum stop.',
    highlights: ['Coffee trail through Amadeo', 'Café break in General Trias', 'Museum finish in Dasmariñas'],
    stopList: [
      {
        name: 'Silang farms',
        description: 'Morning stop at upland gardens and farm retail.',
        establishment: { placeId: '93e95b24-12e1-4bb6-a69e-100fbd9137e1' },
      },
      {
        name: 'Coffee heritage',
        description: 'Amadeo mural and coffee culture pause.',
        establishment: { placeId: '9316cff4-5bdd-4a20-a45c-2d96b67476ef' },
      },
      {
        name: 'Café break',
        description: 'Sit-down café before the final city leg.',
        establishment: { placeId: '7fbde5ad-390a-41cf-becd-17d5fbfce07b' },
      },
      {
        name: 'Museum close',
        description: 'End with indoor exhibits in Dasmariñas.',
        establishment: { placeId: 'e9cc0be2-b7c3-4c68-81a3-79455a689a92' },
      },
    ],
    tips: ['Weekdays are less crowded', 'Bring umbrella for midday sun'],
    bestTime: 'Early morning',
  },
];
