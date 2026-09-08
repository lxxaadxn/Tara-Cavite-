/** Published tourism / establishment notices for the traveler feed and bell. */

const ANNOUNCEMENT_SELECT =
  'id, kind, title, place, body, source, author_id, establishment_owner_id, is_published, published_at, created_at, updated_at, image_url, action_url, event_starts_at, event_ends_at, venue_name, latitude, longitude, maps_url';

const changeListeners = new Set();

export function subscribeAnnouncementsChanged(fn) {
  if (typeof fn !== 'function') return () => {};
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function emitAnnouncementsChanged() {
  for (const fn of changeListeners) {
    try {
      fn();
    } catch {
      // Listener errors should not break publishers.
    }
  }
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function parseAnnouncementKind(raw) {
  return raw === 'advisory' ? 'advisory' : 'event';
}

export function parseAnnouncementSource(raw) {
  return raw === 'establishment' ? 'establishment' : 'admin';
}

/** Prepend https:// when the user omits a scheme (e.g. www.example.com). */
export function normalizeExternalUrl(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  if (/^\/\//.test(text)) return `https:${text}`;
  return `https://${text}`;
}

function parseOptionalCoord(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function parseOptionalTimestamp(value, label) {
  if (value == null) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid ${label}`);
  return d.toISOString();
}

export function mapAnnouncementRow(row) {
  if (!row) return null;
  const id = String(row.id ?? '').trim();
  const title = String(row.title ?? '').trim();
  if (!id || !title) return null;
  const publishedAt = row.published_at ? String(row.published_at) : null;
  const eventStartsAt = row.event_starts_at ? String(row.event_starts_at) : null;
  const eventEndsAt = row.event_ends_at ? String(row.event_ends_at) : null;
  const latitude = parseOptionalCoord(row.latitude);
  const longitude = parseOptionalCoord(row.longitude);
  return {
    id,
    kind: parseAnnouncementKind(row.kind),
    title,
    place: String(row.place ?? '').trim(),
    body: String(row.body ?? '').trim(),
    source: parseAnnouncementSource(row.source),
    authorId: row.author_id ? String(row.author_id) : null,
    establishmentOwnerId: row.establishment_owner_id ? String(row.establishment_owner_id) : null,
    isPublished: row.is_published !== false,
    publishedAt,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
    imageUrl: String(row.image_url ?? '').trim(),
    actionUrl: String(row.action_url ?? '').trim(),
    eventStartsAt,
    eventEndsAt,
    venueName: String(row.venue_name ?? '').trim(),
    latitude,
    longitude,
    mapsUrl: String(row.maps_url ?? '').trim(),
  };
}

/** ISO used for the large calendar date on traveler cards. */
export function announcementDisplayDateIso(item) {
  if (!item) return null;
  if (item.kind === 'event' && item.eventStartsAt) return item.eventStartsAt;
  return item.publishedAt || null;
}

/** Venue · place line for cards and detail. */
export function announcementLocationLabel(item) {
  if (!item) return '';
  const venue = String(item.venueName ?? '').trim();
  const place = String(item.place ?? '').trim();
  if (venue && place) return `${venue} · ${place}`;
  return venue || place;
}

/**
 * Compact bell-inbox line: "Title, Venue - Place".
 * Falls back when venue and/or place are missing.
 */
export function announcementNotificationSummary(item) {
  if (!item) return '';
  const title = String(item.title ?? '').trim();
  const venue = String(item.venueName ?? '').trim();
  const place = String(item.place ?? '').trim();
  if (title && venue && place) return `${title}, ${venue} - ${place}`;
  if (title && venue) return `${title}, ${venue}`;
  if (title && place) return `${title} - ${place}`;
  return title || venue || place;
}

/** Google Maps link for Open map (stored URL, coords, or venue/place search). */
export function announcementMapUrl(item) {
  if (!item) return '';
  const stored = String(item.mapsUrl ?? '').trim();
  if (stored) return normalizeExternalUrl(stored);

  const lat = parseOptionalCoord(item.latitude);
  const lng = parseOptionalCoord(item.longitude);
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }

  const venue = String(item.venueName ?? '').trim();
  const place = String(item.place ?? '').trim();
  const q = [venue, place].filter(Boolean).join(', ');
  if (!q) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

/** Escape HTML then apply **bold** only. Returns safe HTML string. */
export function formatAnnouncementBodyHtml(raw) {
  const text = String(raw ?? '');
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />');
}

/** Parts for the large calendar-style date on announcement cards. */
export function announcementCardDateParts(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: String(date.getDate()),
    month: date.toLocaleDateString('en-PH', { month: 'short' }),
    year: String(date.getFullYear()),
  };
}

export function formatAnnouncementDateLabel(iso, now = new Date()) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffDays = Math.round((startOfLocalDay(now) - startOfLocalDay(date)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays}d ago`;
  if (diffDays === -1) return 'Tomorrow';
  if (diffDays < 0) {
    return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function formatAnnouncementDateTimeRange(startsAt, endsAt) {
  const parts = formatAnnouncementDateTimeParts(startsAt, endsAt);
  if (!parts.length) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} – ${parts[1]}`;
}

/** Start/end labels for stacked right-side display (each on its own line). */
export function formatAnnouncementDateTimeParts(startsAt, endsAt) {
  if (!startsAt) return [];
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return [];
  const opts = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  const startLabel = start.toLocaleString('en-PH', opts);
  if (!endsAt) return [startLabel];
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return [startLabel];
  return [startLabel, end.toLocaleString('en-PH', opts)];
}

export function formatAnnouncementRelativeShort(iso, now = new Date()) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60000));
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function announcementDayGroup(iso, now = new Date()) {
  const label = formatAnnouncementDateLabel(iso, now);
  if (label === 'Today') return 'Today';
  if (label === 'Yesterday') return 'Yesterday';
  return 'Earlier';
}

export function groupAnnouncementsByDay(items, now = new Date()) {
  const buckets = { Today: [], Yesterday: [], Earlier: [] };
  for (const item of items ?? []) {
    buckets[announcementDayGroup(item.publishedAt, now)].push(item);
  }
  return ['Today', 'Yesterday', 'Earlier']
    .map((group) => {
      const groupItems = buckets[group];
      const newest = groupItems[0];
      return {
        group,
        items: groupItems,
        timeLabel: newest ? formatAnnouncementRelativeShort(newest.publishedAt, now) : '',
      };
    })
    .filter((g) => g.items.length > 0);
}

/** Admin list / form: draft | scheduled | published from flags + published_at. */
export function announcementVisibilityStatus(item, now = new Date()) {
  if (!item || item.isPublished === false) return 'draft';
  const at = item.publishedAt ? new Date(item.publishedAt) : null;
  if (at && !Number.isNaN(at.getTime()) && at.getTime() > now.getTime()) return 'scheduled';
  return 'published';
}

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function isLivePublished(row, now = new Date()) {
  if (!row?.isPublished || !row.publishedAt) return false;
  const at = new Date(row.publishedAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() <= now.getTime();
}

export async function fetchPublishedAnnouncements(client) {
  if (!client) return [];
  const nowIso = new Date().toISOString();
  const { data, error } = await client
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('is_published', true)
    .lte('published_at', nowIso)
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map(mapAnnouncementRow)
    .filter(Boolean)
    .filter((row) => isLivePublished(row));
}

export async function fetchAllAnnouncements(client) {
  if (!client) return [];
  const { data, error } = await client
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAnnouncementRow).filter(Boolean);
}

export async function fetchOwnAnnouncements(client, ownerId) {
  if (!client || !ownerId) return [];
  const { data, error } = await client
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('establishment_owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAnnouncementRow).filter(Boolean);
}

export async function unreadAnnouncementCount(client, userId) {
  if (!client || !userId) return 0;
  const published = await fetchPublishedAnnouncements(client);
  if (!published.length) return 0;
  const { data, error } = await client
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', userId)
    .in(
      'announcement_id',
      published.map((row) => row.id)
    );
  if (error) throw new Error(error.message);
  const read = new Set((data ?? []).map((row) => String(row.announcement_id)));
  return published.filter((row) => !read.has(row.id)).length;
}

export async function markAnnouncementsRead(client, userId, ids) {
  if (!client || !userId) return;
  const unique = [...new Set((ids ?? []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!unique.length) {
    emitAnnouncementsChanged();
    return;
  }
  const rows = unique.map((announcement_id) => ({
    user_id: userId,
    announcement_id,
  }));
  const { error } = await client.from('announcement_reads').upsert(rows, {
    onConflict: 'user_id,announcement_id',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(error.message);
  emitAnnouncementsChanged();
}

function parsePublishedAt(value) {
  return parseOptionalTimestamp(value, 'posted date');
}

function buildAnnouncementWriteFields(input) {
  const kind = parseAnnouncementKind(input?.kind);
  const eventStartsAt = parseOptionalTimestamp(input?.eventStartsAt, 'event start');
  const eventEndsAt = parseOptionalTimestamp(input?.eventEndsAt, 'event end');
  if (kind === 'event' && !eventStartsAt) {
    throw new Error('Event start date/time is required for events');
  }
  if (eventStartsAt && eventEndsAt && new Date(eventEndsAt).getTime() < new Date(eventStartsAt).getTime()) {
    throw new Error('Event end must be on or after the start');
  }
  const actionRaw = String(input?.actionUrl ?? '').trim();
  const actionUrl = actionRaw ? normalizeExternalUrl(actionRaw) : '';
  const mapsRaw = String(input?.mapsUrl ?? '').trim();
  const mapsUrl = mapsRaw ? normalizeExternalUrl(mapsRaw) : '';
  return {
    kind,
    title: requireText(input?.title, 'Title'),
    place: requireText(input?.place, 'Place'),
    body: requireText(input?.body, 'Details'),
    is_published: input?.isPublished !== false,
    image_url: String(input?.imageUrl ?? '').trim() || null,
    action_url: actionUrl || null,
    event_starts_at: eventStartsAt,
    event_ends_at: eventEndsAt,
    venue_name: String(input?.venueName ?? '').trim() || null,
    latitude: parseOptionalCoord(input?.latitude),
    longitude: parseOptionalCoord(input?.longitude),
    maps_url: mapsUrl || null,
  };
}

export async function createAnnouncement(client, input) {
  if (!client) throw new Error('Not signed in');
  const source = parseAnnouncementSource(input?.source);
  const payload = {
    ...buildAnnouncementWriteFields(input),
    source,
    author_id: input?.authorId || null,
    establishment_owner_id:
      source === 'establishment' ? input?.establishmentOwnerId || input?.authorId || null : null,
  };
  if (input?.publishedAt !== undefined) {
    payload.published_at = parsePublishedAt(input.publishedAt);
  }
  if (payload.is_published && payload.published_at) {
    // Allow future published_at for scheduled posts (trigger keeps it).
  }
  const { error } = await client.from('announcements').insert(payload);
  if (error) throw new Error(error.message);
  emitAnnouncementsChanged();
}

export async function updateAnnouncement(client, id, input) {
  if (!client) throw new Error('Not signed in');
  const announcementId = String(id ?? '').trim();
  if (!announcementId) throw new Error('Missing announcement');
  const patch = buildAnnouncementWriteFields(input);
  if (input?.publishedAt !== undefined) {
    patch.published_at = parsePublishedAt(input.publishedAt);
  }
  const { error } = await client.from('announcements').update(patch).eq('id', announcementId);
  if (error) throw new Error(error.message);
  emitAnnouncementsChanged();
}

export async function deleteAnnouncement(client, id) {
  if (!client) throw new Error('Not signed in');
  const announcementId = String(id ?? '').trim();
  if (!announcementId) throw new Error('Missing announcement');
  const { error } = await client.from('announcements').delete().eq('id', announcementId);
  if (error) throw new Error(error.message);
  emitAnnouncementsChanged();
}
