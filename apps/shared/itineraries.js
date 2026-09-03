/** Curated itineraries stored in Supabase (admin write, published traveler read). */

const ITINERARY_SELECT = '*, itinerary_stops(*)';

const changeListeners = new Set();

export function subscribeItinerariesChanged(fn) {
  if (typeof fn !== 'function') return () => {};
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function emitItinerariesChanged() {
  for (const fn of changeListeners) {
    try {
      fn();
    } catch {
      // Listener errors should not break publishers.
    }
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value ?? '').trim()
  );
}

export function slugifyItineraryTitle(title) {
  const base = String(title ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || `itin-${Date.now().toString(36)}`;
}

export function matchItinerary(list, idOrSlug) {
  const needle = String(idOrSlug ?? '').trim();
  if (!needle) return null;
  return (
    (list ?? []).find((it) => {
      const keys = [it?.id, it?.slug, it?.publicId, it?.uuid];
      return keys.some((key) => String(key ?? '').trim() === needle);
    }) ?? null
  );
}

function mapStopRow(row, index) {
  const placeId = row?.place_id ? String(row.place_id) : '';
  const lat = typeof row?.venue_lat === 'number' && Number.isFinite(row.venue_lat) ? row.venue_lat : null;
  const lng = typeof row?.venue_lng === 'number' && Number.isFinite(row.venue_lng) ? row.venue_lng : null;
  const highlights = Array.isArray(row?.highlights) ? row.highlights.map((h) => String(h ?? '')) : [];
  const vibeTags = Array.isArray(row?.vibe_tags) ? row.vibe_tags.map((t) => String(t ?? '')).filter(Boolean) : [];
  return {
    clientId: String(row?.id ?? `stop-${index}`),
    name: String(row?.name ?? ''),
    description: String(row?.description ?? ''),
    timeWindow: String(row?.time_window ?? ''),
    durationHint: String(row?.duration_hint ?? ''),
    costType: String(row?.cost_type ?? ''),
    expectTag: String(row?.expect_tag ?? ''),
    vibeTags,
    venueName: String(row?.venue_name ?? ''),
    venueLat: lat,
    venueLng: lng,
    mapsUrl: String(row?.maps_url ?? ''),
    highlights,
    establishment: placeId ? { placeId } : undefined,
  };
}

export function mapItineraryRow(row) {
  if (!row) return null;
  const uuid = String(row.id ?? '').trim();
  if (!uuid) return null;
  const slug = String(row.slug ?? '').trim();
  const stops = Array.isArray(row.itinerary_stops)
    ? [...row.itinerary_stops].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];
  const highlights = Array.isArray(row.highlights) ? row.highlights.map((h) => String(h ?? '')).filter(Boolean) : [];
  const status = row.status === 'published' || row.status === 'flagged' ? row.status : 'draft';
  const tier = row.price_tier === 1 || row.price_tier === 3 ? row.price_tier : 2;
  return {
    id: uuid,
    slug: slug || uuid,
    publicId: slug || uuid,
    title: String(row.title ?? ''),
    subtitle: String(row.subtitle ?? ''),
    route: String(row.route ?? ''),
    image: String(row.image ?? ''),
    durationLabel: String(row.duration_label ?? ''),
    priceTier: tier,
    priceTierLabel: String(row.price_tier_label ?? ''),
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t ?? '')).filter(Boolean) : [],
    summary: String(row.summary ?? ''),
    highlights,
    itineraryHighlights: highlights,
    stopList: stops.map(mapStopRow),
    tips: Array.isArray(row.tips) ? row.tips.map((t) => String(t ?? '')).filter(Boolean) : [],
    bestTime: String(row.best_time ?? ''),
    status,
    featured: Boolean(row.featured),
  };
}

/** Traveler-facing shape: id is slug when present so existing URLs keep working. */
export function toPublishedItinerary(mapped) {
  if (!mapped) return null;
  const uuid = String(mapped.uuid || mapped.id || '').trim();
  return {
    ...mapped,
    uuid,
    id: mapped.publicId || mapped.slug || uuid,
  };
}

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export async function fetchPublishedItineraries(client) {
  if (!client) return [];
  const { data, error } = await client
    .from('itineraries')
    .select(ITINERARY_SELECT)
    .eq('status', 'published')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapItineraryRow).filter(Boolean).map(toPublishedItinerary);
}

export async function fetchAllItineraries(client) {
  if (!client) return [];
  const { data, error } = await client
    .from('itineraries')
    .select(ITINERARY_SELECT)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapItineraryRow).filter(Boolean);
}

export async function fetchItineraryByIdOrSlug(client, idOrSlug, { publishedOnly = false } = {}) {
  if (!client) return null;
  const needle = String(idOrSlug ?? '').trim();
  if (!needle) return null;
  let q = client.from('itineraries').select(ITINERARY_SELECT);
  if (isUuid(needle)) q = q.eq('id', needle);
  else q = q.eq('slug', needle);
  if (publishedOnly) q = q.eq('status', 'published');
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  const mapped = mapItineraryRow(data);
  return publishedOnly ? toPublishedItinerary(mapped) : mapped;
}

export function subscribeItineraries(client, onChange) {
  if (!client?.channel || typeof onChange !== 'function') return () => {};
  const channel = client
    .channel(`itineraries-live-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'itineraries' }, () => onChange())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'itinerary_stops' }, () => onChange())
    .subscribe();
  const unsubLocal = subscribeItinerariesChanged(onChange);
  return () => {
    unsubLocal();
    try {
      client.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}

export async function uploadItineraryCover(client, itineraryId, file) {
  if (!client) throw new Error('Not signed in');
  if (!file) return '';
  const ext = String(file.name || 'jpg').split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const path = `${itineraryId}/${Date.now()}.${safeExt}`;
  const { error } = await client.storage.from('itinerary-covers').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) throw new Error(error.message);
  const { data } = client.storage.from('itinerary-covers').getPublicUrl(path);
  return data?.publicUrl || '';
}

function stopPayload(stop, sortOrder) {
  const placeId = String(stop?.establishment?.placeId ?? '').trim();
  const highlights = Array.isArray(stop?.highlights)
    ? stop.highlights.map((h) => String(h ?? '').trim()).filter(Boolean)
    : [];
  const vibeTags = Array.isArray(stop?.vibeTags)
    ? stop.vibeTags.map((t) => String(t ?? '').trim()).filter(Boolean)
    : [];
  const payload = {
    sort_order: sortOrder,
    name: String(stop?.name ?? '').trim(),
    description: String(stop?.description ?? '').trim(),
    time_window: String(stop?.timeWindow ?? '').trim(),
    duration_hint: String(stop?.durationHint ?? '').trim(),
    cost_type: String(stop?.costType ?? '').trim(),
    expect_tag: String(stop?.expectTag ?? '').trim(),
    vibe_tags: vibeTags,
    venue_name: String(stop?.venueName ?? '').trim(),
    venue_lat: typeof stop?.venueLat === 'number' && Number.isFinite(stop.venueLat) ? stop.venueLat : null,
    venue_lng: typeof stop?.venueLng === 'number' && Number.isFinite(stop.venueLng) ? stop.venueLng : null,
    maps_url: String(stop?.mapsUrl ?? '').trim(),
    highlights,
    place_id: isUuid(placeId) ? placeId : null,
  };
  if (isUuid(stop?.clientId)) payload.id = String(stop.clientId);
  return payload;
}

export async function upsertItinerary(client, input) {
  if (!client) throw new Error('Not signed in');
  const title = requireText(input?.title, 'Title');
  const route = requireText(input?.route, 'Route');
  const existingId = isUuid(input?.id) ? String(input.id) : null;
  const slug = String(input?.slug ?? '').trim() || slugifyItineraryTitle(title);
  const status =
    input?.status === 'published' || input?.status === 'flagged' ? input.status : 'draft';
  const row = {
    slug,
    title,
    subtitle: String(input?.subtitle ?? '').trim() || route,
    route,
    image: String(input?.image ?? '').trim(),
    duration_label: String(input?.durationLabel ?? '').trim(),
    price_tier: input?.priceTier === 1 || input?.priceTier === 3 ? input.priceTier : 2,
    price_tier_label: String(input?.priceTierLabel ?? 'Moderate'),
    tags: Array.isArray(input?.tags) ? input.tags.map((t) => String(t ?? '').trim()).filter(Boolean) : [],
    summary: String(input?.summary ?? '').trim(),
    highlights: Array.isArray(input?.itineraryHighlights)
      ? input.itineraryHighlights.map((h) => String(h ?? '').trim()).filter(Boolean)
      : Array.isArray(input?.highlights)
        ? input.highlights.map((h) => String(h ?? '').trim()).filter(Boolean)
        : [],
    tips: Array.isArray(input?.tips) ? input.tips.map((t) => String(t ?? '').trim()).filter(Boolean) : [],
    best_time: String(input?.bestTime ?? '').trim(),
    status,
    featured: Boolean(input?.featured),
  };
  if (input?.createdBy) row.created_by = input.createdBy;

  let itineraryId = existingId;
  if (existingId) {
    const { error } = await client.from('itineraries').update(row).eq('id', existingId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await client.from('itineraries').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    itineraryId = data.id;
  }

  const { error: delErr } = await client.from('itinerary_stops').delete().eq('itinerary_id', itineraryId);
  if (delErr) throw new Error(delErr.message);

  const stops = Array.isArray(input?.stopList) ? input.stopList : [];
  if (stops.length) {
    const rows = stops.map((s, i) => ({ ...stopPayload(s, i), itinerary_id: itineraryId }));
    const { error: insErr } = await client.from('itinerary_stops').insert(rows);
    if (insErr) throw new Error(insErr.message);
  }

  emitItinerariesChanged();
  return itineraryId;
}

export async function setItineraryFeatured(client, id, featured) {
  if (!client) throw new Error('Not signed in');
  const itineraryId = String(id ?? '').trim();
  if (!itineraryId) throw new Error('Missing itinerary');
  const { error } = await client
    .from('itineraries')
    .update({ featured: Boolean(featured), updated_at: new Date().toISOString() })
    .eq('id', itineraryId);
  if (error) throw new Error(error.message);
  emitItinerariesChanged();
}

export async function deleteItinerary(client, id) {
  if (!client) throw new Error('Not signed in');
  const itineraryId = String(id ?? '').trim();
  if (!itineraryId) throw new Error('Missing itinerary');
  const { error } = await client.from('itineraries').delete().eq('id', itineraryId);
  if (error) throw new Error(error.message);
  emitItinerariesChanged();
}
