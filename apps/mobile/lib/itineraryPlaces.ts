import type { ItineraryStopContent, PublishedItinerary } from '../data/publishedItineraries';
import type { Place } from '../data/mockData';
import { haversineDistanceKm } from './placesFromSupabase';

export type FeaturedPlace = {
  id: string;
  name: string;
  address: string;
  image: string | null;
};

export type EnrichedStop = ItineraryStopContent & {
  place: FeaturedPlace | null;
};

export type EnrichedItinerary = PublishedItinerary & {
  stopList: EnrichedStop[];
  stops: number;
  image: string;
};

export function resolveEstablishment(
  ref: { placeId?: string } | undefined,
  catalog: Place[]
): Place | undefined {
  const placeId = String(ref?.placeId ?? '').trim();
  if (!placeId || !catalog.length) return undefined;
  return catalog.find((p) => p.id === placeId);
}

export function catalogPlaceToFeatured(place: Place | undefined): FeaturedPlace | null {
  if (!place) return null;
  const galleryFirst =
    Array.isArray(place.gallery) && place.gallery.length
      ? typeof place.gallery[0] === 'string'
        ? place.gallery[0]
        : null
      : null;
  const image = (typeof place.image === 'string' ? place.image : null) || galleryFirst;
  return {
    id: place.id,
    name: place.name,
    address: place.address || '',
    image,
  };
}

function optimizeStopsOrder(stops: ItineraryStopContent[], catalog: Place[]): ItineraryStopContent[] {
  if (!stops.length) return [];

  const entries = stops.map((stop, index) => ({
    stop,
    index,
    place: resolveEstablishment(stop.establishment, catalog),
  }));

  const routed = entries.filter((e) => e.place?.latitude != null && e.place?.longitude != null);
  const passthrough = entries.filter((e) => e.place?.latitude == null || e.place?.longitude == null);

  if (routed.length < 2) return stops;

  const start = routed.reduce(
    (best, e) => ((e.place!.latitude ?? 0) > (best.place!.latitude ?? 0) ? e : best),
    routed[0]
  );
  const remaining = new Set(routed.map((e) => e.index));
  remaining.delete(start.index);

  const ordered = [start];
  let current = start;

  while (remaining.size > 0) {
    let nearest: (typeof entries)[0] | null = null;
    let minKm = Infinity;
    for (const idx of remaining) {
      const candidate = routed.find((e) => e.index === idx)!;
      const km = haversineDistanceKm(
        current.place!.latitude!,
        current.place!.longitude!,
        candidate.place!.latitude!,
        candidate.place!.longitude!
      );
      if (km < minKm) {
        minKm = km;
        nearest = candidate;
      }
    }
    if (!nearest) break;
    ordered.push(nearest);
    remaining.delete(nearest.index);
    current = nearest;
  }

  const orderedIndices = new Set(ordered.map((e) => e.index));
  const tail = passthrough
    .filter((e) => !orderedIndices.has(e.index))
    .sort((a, b) => a.index - b.index);

  return [...ordered, ...tail].map((e) => e.stop);
}

export function buildEnrichedItinerary(
  template: PublishedItinerary,
  catalog: Place[]
): EnrichedItinerary {
  const orderedStops = optimizeStopsOrder(template.stopList || [], catalog);
  const stopList: EnrichedStop[] = orderedStops.map((stop) => {
    const catalogPlace = resolveEstablishment(stop.establishment, catalog);
    return {
      ...stop,
      place: catalogPlaceToFeatured(catalogPlace),
    };
  });

  const heroFromCatalog = stopList.find((s) => s.place?.image)?.place?.image;

  return {
    ...template,
    stopList,
    stops: stopList.length,
    image: heroFromCatalog || template.image,
  };
}
