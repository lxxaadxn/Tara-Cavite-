import type { ItineraryStopContent, PublishedItinerary } from '../data/publishedItineraries';
import type { Place } from '../data/mockData';
import { haversineDistanceKm } from './placesFromSupabase';

export type FeaturedPlace = {
  id: string;
  name: string;
  address: string;
  image: string | null;
  lat?: number | null;
  lng?: number | null;
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
    lat: place.latitude ?? null,
    lng: place.longitude ?? null,
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

function stopsHaveSchedule(stops: ItineraryStopContent[]): boolean {
  return stops.some((stop) => String(stop?.timeWindow || '').trim());
}

export function itineraryPriceBadge(
  itinerary: PublishedItinerary | EnrichedItinerary | null | undefined
): string | null {
  const n = itinerary?.priceTier;
  const symbols = n === 1 ? '$' : n === 3 ? '$$$' : n === 2 ? '$$' : '';
  const label = itinerary?.priceTierLabel;
  if (label && symbols) return `${label} · ${symbols}`;
  return label || symbols || null;
}

export function itineraryStopsDurationLine(
  itinerary: PublishedItinerary | EnrichedItinerary | null | undefined
): string {
  const n = itinerary?.stopList?.length || itinerary?.stops;
  const parts: string[] = [];
  if (n) parts.push(`${n} ${n === 1 ? 'stop' : 'stops'}`);
  if (itinerary?.durationLabel) parts.push(itinerary.durationLabel);
  return parts.join(' · ');
}

export function stopVenueName(stop: ItineraryStopContent | EnrichedStop | null | undefined): string {
  const fromPlace = (stop as EnrichedStop | undefined)?.place?.name;
  return String(fromPlace || stop?.venueName || '').trim();
}

export function stopMapsQuery(stop: ItineraryStopContent | EnrichedStop | null | undefined): string {
  const enriched = stop as EnrichedStop | undefined;
  return [enriched?.place?.name, enriched?.place?.address, stop?.venueName, stop?.name]
    .filter(Boolean)
    .join(', ');
}

export function stopMapPoint(
  stop: ItineraryStopContent | EnrichedStop | null | undefined,
  index = 0
) {
  const enriched = stop as EnrichedStop | undefined;
  const lat = Number(enriched?.place?.lat ?? stop?.venueLat);
  const lng = Number(enriched?.place?.lng ?? stop?.venueLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: enriched?.place?.id || `stop-${index}`,
    name: stopVenueName(stop) || stop?.name || 'Stop',
    lat,
    lng,
  };
}

export function itineraryMapPlaces(stops: (ItineraryStopContent | EnrichedStop)[] | undefined) {
  return (stops || [])
    .map((stop, index) => stopMapPoint(stop, index))
    .filter((point): point is NonNullable<ReturnType<typeof stopMapPoint>> => point != null);
}

export function buildEnrichedItinerary(
  template: PublishedItinerary,
  catalog: Place[]
): EnrichedItinerary {
  const rawStops = template.stopList || [];
  const orderedStops = stopsHaveSchedule(rawStops) ? rawStops : optimizeStopsOrder(rawStops, catalog);
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

/** Unique photo URLs for list-card carousels: template hero, then stop photos. */
export function itineraryGalleryUrls(
  itinerary: PublishedItinerary | EnrichedItinerary | null | undefined
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const add = (value: unknown) => {
    const src = String(value || '').trim();
    if (!src || seen.has(src)) return;
    seen.add(src);
    urls.push(src);
  };
  add(itinerary?.image);
  const stops = (itinerary as EnrichedItinerary | undefined)?.stopList;
  if (stops) {
    for (const stop of stops) {
      add(stop?.place?.image);
    }
  }
  return urls;
}

export function itineraryCardChips(
  itinerary: PublishedItinerary | EnrichedItinerary | null | undefined
): string[] {
  const chips = [...(itinerary?.tags || [])].filter(Boolean) as string[];
  const n = itinerary?.stopList?.length || itinerary?.stops;
  if (n) chips.push(`${n} ${n === 1 ? 'stop' : 'stops'}`);
  return chips;
}
