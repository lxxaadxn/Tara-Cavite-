import type { Place } from './mockData';

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
  closesAtLabel?: string;
  mapCommute: MapCommuteGuide;
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

export function placeToMapSpot(place: Place): MapSpot {
  return {
    ...place,
    ratingCount: '—',
    closesAtLabel: place.hours?.includes('PM') || place.hours?.includes('AM') ? place.hours : 'See hours',
    mapCommute: defaultGuide(place),
  };
}

export function mapSpotsToMarkers(spots: MapSpot[]) {
  return spots.map((s) => ({ id: s.id, name: s.name, lat: s.latitude, lng: s.longitude }));
}
