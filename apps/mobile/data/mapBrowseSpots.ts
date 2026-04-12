import type { Place } from './mockData';
import { mockPlaces } from './mockData';

export type CommuteLegKind = 'bus' | 'tricycle' | 'walk' | 'terminal' | 'destination';

export type CommuteRouteLeg = {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  kind: CommuteLegKind;
};

export type MapCommuteGuide = {
  legs: CommuteRouteLeg[];
  detailSteps: string[];
};

/** Map + bottom-sheet flow: place row plus curated commuter legs / narrative. */
export type MapSpot = Place & {
  ratingCount?: string;
  /** Shown next to “Open” in the preview sheet, e.g. “Closes 10 PM”. */
  closesAtLabel?: string;
  mapCommute: MapCommuteGuide;
};

const tinatangiDemo: MapSpot = {
  id: 'map-tinatangi',
  name: 'Tinatangi Cafe',
  address: 'Aguinaldo Highway, Dasmariñas, Cavite',
  type: 'Cafe',
  hours: '7:00 AM - 10:00 PM',
  latitude: 14.3285,
  longitude: 120.9355,
  image: require('../assets/images/picture-67.png'),
  rating: '4.5',
  ratingCount: '81',
  closesAtLabel: 'Closes 10 PM',
  mapCommute: {
    legs: [
      { id: '1', title: 'PITX — Dasmariñas', subtitle: 'Gate 1, 2nd Floor', kind: 'bus' },
      { id: '2', title: 'Balibago — Central Mall Dasmariñas', badge: 'Drop Off', kind: 'terminal' },
      { id: '3', title: 'Balibago — Tricycle (Line 1)', subtitle: 'Tinatangi Cafe', kind: 'tricycle' },
      { id: '4', title: 'Tinatangi Cafe', badge: 'At line of destination', kind: 'destination' },
    ],
    detailSteps: [
      "In PITX, go to the 2nd Floor, Gate 1. Look for the bus labeled 'Dasma via Aguinaldo Hwy'.",
      'Pay the conductor ₱45.00 before or as soon as the bus starts moving.',
      'Get off at Central Mall Dasmariñas. You will see a big mall wall on your left — prepare to get off.',
      "Walk toward the blue tricycle terminal behind the mall and ask for 'Tinatangi Cafe'.",
    ],
  },
};

function defaultGuide(place: Place): MapCommuteGuide {
  const area = place.address.split(',')[0]?.trim() ?? 'the area';
  return {
    legs: [
      {
        id: `${place.id}-a`,
        title: 'Jeepney or bus toward the area',
        subtitle: `Corridor near ${area}`,
        kind: 'bus',
      },
      {
        id: `${place.id}-b`,
        title: place.name,
        badge: 'Destination',
        kind: 'destination',
      },
    ],
    detailSteps: [
      `Find a ride (jeepney, bus, or modern jeepney) that passes near ${area}.`,
      'Ask the driver to let you off at the safest corner closest to your stop.',
      `Walk or take a short tricycle ride to ${place.name} if it’s set back from the main road.`,
      'Confirm fare and route with the driver before boarding.',
    ],
  };
}

let cached: MapSpot[] | null = null;

export function getMapSpots(): MapSpot[] {
  if (cached) return cached;
  const byId = new Map<string, MapSpot>();
  byId.set(tinatangiDemo.id, tinatangiDemo);
  for (const p of mockPlaces) {
    if (byId.has(p.id)) continue;
    byId.set(p.id, {
      ...p,
      ratingCount: '120',
      closesAtLabel: p.hours?.includes('PM') || p.hours?.includes('AM') ? p.hours : 'See hours',
      mapCommute: defaultGuide(p),
    });
  }
  cached = Array.from(byId.values());
  return cached;
}

export function getMapSpotById(id: string): MapSpot | undefined {
  return getMapSpots().find((s) => s.id === id);
}

export function mapSpotsToMarkers(spots: MapSpot[]) {
  return spots.map((s) => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude }));
}
