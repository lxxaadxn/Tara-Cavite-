/** Published tourism / establishment notices for the traveler feed and bell. */

const ANNOUNCEMENT_SELECT =
  'id, kind, title, place, body, source, author_id, establishment_owner_id, is_published, published_at, created_at, updated_at';

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

export function mapAnnouncementRow(row) {
  if (!row) return null;
  const id = String(row.id ?? '').trim();
  const title = String(row.title ?? '').trim();
  if (!id || !title) return null;
  const publishedAt = row.published_at ? String(row.published_at) : null;
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

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

export async function fetchPublishedAnnouncements(client) {
  if (!client) return [];
  const { data, error } = await client
    .from('announcements')
    .select(ANNOUNCEMENT_SELECT)
    .eq('is_published', true)
    .order('published_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAnnouncementRow).filter(Boolean);
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

export async function createAnnouncement(client, input) {
  if (!client) throw new Error('Not signed in');
  const source = parseAnnouncementSource(input?.source);
  const payload = {
    kind: parseAnnouncementKind(input?.kind),
    title: requireText(input?.title, 'Title'),
    place: requireText(input?.place, 'Place'),
    body: requireText(input?.body, 'Details'),
    source,
    author_id: input?.authorId || null,
    establishment_owner_id: source === 'establishment' ? input?.establishmentOwnerId || input?.authorId || null : null,
    is_published: input?.isPublished !== false,
  };
  const { error } = await client.from('announcements').insert(payload);
  if (error) throw new Error(error.message);
  emitAnnouncementsChanged();
}

export async function updateAnnouncement(client, id, input) {
  if (!client) throw new Error('Not signed in');
  const announcementId = String(id ?? '').trim();
  if (!announcementId) throw new Error('Missing announcement');
  const patch = {
    kind: parseAnnouncementKind(input?.kind),
    title: requireText(input?.title, 'Title'),
    place: requireText(input?.place, 'Place'),
    body: requireText(input?.body, 'Details'),
    is_published: input?.isPublished !== false,
  };
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
