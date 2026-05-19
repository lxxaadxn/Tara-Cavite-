/**
 * Mock data for the app - no API calls
 */

export type { Terminal } from '../lib/terminalTypes';
import type { Terminal } from '../lib/terminalTypes';
import { caviteTerminalsFromCsv } from './caviteTerminalsFromCsv';

export interface Place {
  id: string;
  name: string;
  address: string;
  type: string;
  hours: string;
  latitude: number;
  longitude: number;
  /** When opening Directions from a terminal (or curated spots), show commuter transport hints. */
  transportTypes?: string[];
  /** Matches `Terminal_Id` in sheets / Supabase; used to load Terminal_Routes on Directions. */
  terminalId?: string;
  image?: any; // For require() statements or URI strings
  /** Shown on home cards (Figma) */
  rating?: string;
  /** From Supabase / LGU STA inventory */
  description?: string;
  ntdp_category?: string
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

// Recent searches (empty initially, will be populated from user's search history)
export const recentSearches: string[] = [];

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

/** Cavite-wide terminals from `data/terminals_cavite_updated.csv` (see `caviteTerminalsFromCsv.ts`). */
export const mockTerminals: Terminal[] = caviteTerminalsFromCsv();
