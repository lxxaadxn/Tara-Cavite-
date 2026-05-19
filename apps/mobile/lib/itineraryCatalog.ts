import type { Place } from '../data/mockData';
import { mockItineraries } from '../data/mockData';

function foldMunicipalityKey(place: Place): string {
  const raw = (place.city_mun ?? '').trim() || (place.address ?? '').split(',')[0]?.trim() || '';
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+city\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const ITINERARY_AREA_HINTS: { title: string; keys: string[] }[] = [
  { title: 'Highlands Getaway', keys: ['silang', 'tagaytay'] },
  { title: 'Highlands & Hidden Gems', keys: ['alfonso', 'magallanes', 'maragondon', 'cavite'] },
];

function itineraryTitleForPlace(place: Place): string {
  const mk = foldMunicipalityKey(place);
  const hay = `${mk} ${(place.address ?? '').toLowerCase()}`;
  for (const hint of ITINERARY_AREA_HINTS) {
    if (hint.keys.some((k) => hay.includes(k))) return hint.title;
  }
  return mockItineraries[0]?.title ?? 'Featured routes';
}

/** Browse establishments from Supabase catalog for the Itineraries tab. */
export function getBrowseEstablishmentsForItineraries(
  catalog: Place[]
): { place: Place; itineraryTitle: string }[] {
  return catalog.map((place) => ({
    place,
    itineraryTitle: itineraryTitleForPlace(place),
  }));
}
