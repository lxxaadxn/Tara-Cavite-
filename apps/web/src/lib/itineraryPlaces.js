import { haversineDistanceKm } from './placesFromSupabase';

/**
 * @param {{ placeId?: string }} ref
 * @param {import('./placesFromSupabase').rowToPlace extends Function ? ReturnType<import('./placesFromSupabase').rowToPlace>[] : object[]} catalog
 */
export function resolveEstablishment(ref, catalog) {
  const placeId = String(ref?.placeId ?? '').trim();
  if (!placeId || !catalog?.length) return null;
  return catalog.find((p) => p.id === placeId) ?? null;
}

/** Featured stop card payload for itinerary UI. */
export function catalogPlaceToFeatured(place) {
  if (!place) return null;
  return {
    id: place.id,
    name: place.name,
    address: place.address || '',
    image: place.imageUrl || place.galleryUrls?.[0] || null,
    city_mun: place.city_mun ?? null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    type: place.type ?? null,
    ntdp_category: place.ntdp_category ?? null,
    type_code: place.type_code ?? null,
    ta_category: place.ta_category ?? null,
    lgu_slug: place.lgu_slug ?? null,
    description: place.description ?? null,
    searchable_text: place.searchable_text ?? null,
    created_at: place.created_at ?? null,
  };
}

/**
 * Nearest-neighbor ordering for stops with catalog coordinates (minimizes backtracking).
 * @param {object[]} stops
 * @param {object[]} catalog
 */
export function optimizeStopsOrder(stops, catalog) {
  if (!stops?.length) return [];

  const entries = stops.map((stop, index) => ({
    stop,
    index,
    place: resolveEstablishment(stop.establishment, catalog),
  }));

  const routed = entries.filter((e) => e.place?.lat != null && e.place?.lng != null);
  const passthrough = entries.filter((e) => e.place?.lat == null || e.place?.lng == null);

  if (routed.length < 2) return stops;

  const start = routed.reduce((best, e) => (e.place.lat > best.place.lat ? e : best), routed[0]);
  const remaining = new Set(routed.map((e) => e.index));
  remaining.delete(start.index);

  const ordered = [start];
  let current = start;

  while (remaining.size > 0) {
    let nearest = null;
    let minKm = Infinity;
    for (const idx of remaining) {
      const candidate = routed.find((e) => e.index === idx);
      const km = haversineDistanceKm(
        current.place.lat,
        current.place.lng,
        candidate.place.lat,
        candidate.place.lng
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

/**
 * Resolve establishments from `public.places`, optimize stop order, attach featured cards.
 * @param {object} template itinerary from mockItineraries
 * @param {object[]} catalog
 */
function stopsHaveSchedule(stops) {
  return (stops || []).some((stop) => String(stop?.timeWindow || '').trim());
}

export function itineraryPriceBadge(itinerary) {
  const n = itinerary?.priceTier;
  const symbols = n === 1 ? '$' : n === 3 ? '$$$' : n === 2 ? '$$' : '';
  const label = itinerary?.priceTierLabel;
  if (label && symbols) return `${label} · ${symbols}`;
  return label || symbols || null;
}

export function itineraryStopsDurationLine(itinerary) {
  const n = itinerary?.stopList?.length || itinerary?.stops;
  const parts = [];
  if (n) parts.push(`${n} ${n === 1 ? 'stop' : 'stops'}`);
  if (itinerary?.durationLabel) parts.push(itinerary.durationLabel);
  return parts.join(' · ');
}

export function stopVenueName(stop) {
  return String(stop?.place?.name || stop?.venueName || '').trim();
}

export function stopMapsQuery(stop) {
  return [stop?.place?.name, stop?.place?.address, stop?.venueName, stop?.name].filter(Boolean).join(', ');
}

export function stopMapPoint(stop, index = 0) {
  const lat = Number(stop?.place?.lat ?? stop?.place?.latitude ?? stop?.venueLat);
  const lng = Number(stop?.place?.lng ?? stop?.place?.longitude ?? stop?.venueLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: stop?.place?.id || `stop-${index}`,
    name: stopVenueName(stop) || stop?.name || 'Stop',
    lat,
    lng,
    ntdp_category: stop?.place?.ntdp_category ?? null,
  };
}

export function itineraryMapPlaces(stops) {
  return (stops || []).map((stop, index) => stopMapPoint(stop, index)).filter(Boolean);
}

export function buildEnrichedItinerary(template, catalog) {
  if (!template) return null;

  const rawStops = template.stopList || [];
  const orderedStops = stopsHaveSchedule(rawStops) ? rawStops : optimizeStopsOrder(rawStops, catalog);
  const stopList = orderedStops.map((stop) => {
    const catalogPlace = resolveEstablishment(stop.establishment, catalog);
    return {
      ...stop,
      place: catalogPlaceToFeatured(catalogPlace),
    };
  });

  return {
    ...template,
    stopList,
    stops: stopList.length,
    // Keep the itinerary cover photo — never replace with establishment images.
    image: String(template.image || '').trim() || null,
  };
}

/** Cover photo only for list cards (itinerary image, not stop/establishment photos). */
export function itineraryGalleryUrls(itinerary) {
  const src = String(itinerary?.image || '').trim();
  return src ? [src] : [];
}

/** Route + stop count for card subtitle, e.g. "Silang → Tagaytay · 5 stops". */
export function itineraryCardSubtitle(itinerary) {
  const route = String(itinerary?.route || itinerary?.subtitle || '').trim();
  const n = itinerary?.stopList?.length || itinerary?.stops;
  const stopPart = n ? `${n} ${n === 1 ? 'stop' : 'stops'}` : '';
  if (route && stopPart) return `${route} · ${stopPart}`;
  return route || stopPart || '';
}

export function itineraryCardChips(itinerary) {
  return [...(itinerary?.tags || [])].filter(Boolean);
}
