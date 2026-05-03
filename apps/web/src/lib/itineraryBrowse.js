import { publishedItineraries } from '../data/mockItineraries';
import { cityMunMatchesFilter } from './placeFilterHelpers';

const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80';

export function extractMunicipalityFromStopPlace(place) {
  if (!place) return null;
  if (place.city_mun) return String(place.city_mun).trim();
  const address = place.address ?? '';
  const parts = address
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const caviteIdx = parts.findIndex((p) => /^cavite$/i.test(p));
  if (caviteIdx > 0) return parts[caviteIdx - 1];
  return parts[0] || null;
}

export function buildRouteEstablishmentRows() {
  const rows = [];
  const seen = new Set();
  for (const itinerary of publishedItineraries) {
    for (const stop of itinerary.stopList || []) {
      if (!stop.place?.name) continue;
      const key = `${stop.place.name}::${stop.place.address || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const city_mun = extractMunicipalityFromStopPlace(stop.place);
      rows.push({
        key: `route-${key}`,
        kind: 'route',
        name: stop.place.name,
        address: stop.place.address || 'Cavite, Philippines',
        image: stop.place.image || itinerary.image,
        city_mun,
        type: stop.place.type || 'Featured stop',
        ntdp_category: stop.place.ntdp_category ?? null,
        type_code: stop.place.type_code ?? null,
        ta_category: stop.place.ta_category ?? null,
        lgu_slug: stop.place.lgu_slug ?? null,
        description: stop.place.description ?? null,
        searchable_text: stop.place.searchable_text ?? null,
        created_at: stop.place.created_at ?? null,
        lat: stop.place.lat ?? null,
        lng: stop.place.lng ?? null,
        itineraryId: itinerary.id,
        itineraryTitle: itinerary.title,
      });
    }
  }
  return rows;
}

function findHostItineraryForMunicipality(cityMun) {
  if (!cityMun) return null;
  return (
    publishedItineraries.find((it) =>
      (it.stopList || []).some((stop) => {
        const cm = extractMunicipalityFromStopPlace(stop.place);
        return cm && cityMunMatchesFilter(cityMun, cm);
      })
    ) ?? null
  );
}

/**
 * Adds Supabase establishments whose `city_mun` matches any featured-route stop municipality.
 * @param {any[]} routeRows from {@link buildRouteEstablishmentRows}
 * @param {any[]} supabasePlaces from {@link import('./placesFromSupabase').fetchAllPlacesFromSupabase}
 */
export function mergeSupabaseIntoItineraryBrowse(routeRows, supabasePlaces) {
  const munLabels = [];
  for (const r of routeRows) {
    if (r.city_mun && !munLabels.includes(r.city_mun)) munLabels.push(r.city_mun);
  }
  if (!munLabels.length || !supabasePlaces?.length) return routeRows;

  const out = [...routeRows];
  for (const p of supabasePlaces) {
    const ok = munLabels.some((m) => cityMunMatchesFilter(p.city_mun, m));
    if (!ok) continue;
    if (out.some((r) => r.kind === 'supabase' && r.placeId === p.id)) continue;
    const hostIt = findHostItineraryForMunicipality(p.city_mun);
    out.push({
      key: `sb-${p.id}`,
      kind: 'supabase',
      name: p.name,
      address: p.address || 'Cavite, Philippines',
      image: p.imageUrl || PLACEHOLDER_IMG,
      city_mun: p.city_mun,
      type: p.type,
      ntdp_category: p.ntdp_category ?? null,
      type_code: p.type_code ?? null,
      ta_category: p.ta_category ?? null,
      lgu_slug: p.lgu_slug ?? null,
      description: p.description ?? null,
      searchable_text: p.searchable_text ?? null,
      created_at: p.created_at ?? null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      placeId: p.id,
      itineraryId: hostIt?.id ?? routeRows[0]?.itineraryId,
      itineraryTitle: hostIt ? `${hostIt.title} · more nearby` : 'Ideas near featured routes',
    });
  }
  return out;
}

