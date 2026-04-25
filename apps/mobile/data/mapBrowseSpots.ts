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
  address: 'Aguinaldo Highway corridor, Cavite',
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
      { id: '1', title: 'PITX — Cavite corridor', subtitle: 'Provincial bus bay', kind: 'bus' },
      { id: '2', title: 'Central terminal / mall stop', badge: 'Drop off', kind: 'terminal' },
      { id: '3', title: 'Local tricycle line', subtitle: 'Tinatangi Cafe', kind: 'tricycle' },
      { id: '4', title: 'Tinatangi Cafe', badge: 'At line of destination', kind: 'destination' },
    ],
    detailSteps: [
      'From the provincial bus terminal, take a Cavite-bound bus on the Aguinaldo Highway corridor.',
      'Pay the conductor before or as soon as the bus starts moving.',
      'Get off at the stop nearest your destination town — ask the conductor if unsure.',
      'Walk to the local tricycle queue and give the establishment name for the last mile.',
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
