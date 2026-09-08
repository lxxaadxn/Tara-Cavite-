import type { SupabaseClient } from '@supabase/supabase-js';
import {
  announcementVisibilityStatus,
  createAnnouncement as createAnnouncementRow,
  deleteAnnouncement as deleteAnnouncementRow,
  fetchAllAnnouncements,
  formatAnnouncementDateLabel,
  updateAnnouncement as updateAnnouncementRow,
} from 'cavitour-shared/announcements';
import { parseCoordsFromMapsUrl } from './staV3CatalogAdmin';

export type AnnouncementKind = 'event' | 'advisory';
export type AnnouncementSource = 'admin' | 'establishment';
export type AnnouncementVisibility = 'draft' | 'published' | 'scheduled';

export type AnnouncementAdminRow = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  place: string;
  body: string;
  source: AnnouncementSource;
  is_published: boolean;
  published_at: string | null;
  image_url: string;
  action_url: string;
  event_starts_at: string;
  event_ends_at: string;
  venue_name: string;
  /** Form-only Google Maps URL used to pin lat/lng. */
  google_maps_link: string;
  latitude: string;
  longitude: string;
  /** Form-only: draft | published | scheduled */
  visibility: AnnouncementVisibility;
};

export function mapsLinkFromCoords(lat: string, lng: string): string {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return '';
  return `https://www.google.com/maps/search/?api=1&query=${la},${ln}`;
}

export function announcementDateLabel(iso: string | null): string {
  return formatAnnouncementDateLabel(iso);
}

/** Convert ISO / DB timestamp to a value for `<input type="datetime-local">`. */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function visibilityFromRow(row: {
  isPublished: boolean;
  publishedAt: string | null;
}): AnnouncementVisibility {
  return announcementVisibilityStatus(row) as AnnouncementVisibility;
}

function toAdminRow(row: {
  id: string;
  kind: AnnouncementKind;
  title: string;
  place: string;
  body: string;
  source: AnnouncementSource;
  isPublished: boolean;
  publishedAt: string | null;
  imageUrl?: string;
  actionUrl?: string;
  eventStartsAt?: string | null;
  eventEndsAt?: string | null;
  venueName?: string;
  latitude?: number | null;
  longitude?: number | null;
  mapsUrl?: string;
}): AnnouncementAdminRow {
  const latitude =
    row.latitude != null && Number.isFinite(row.latitude) ? String(row.latitude) : '';
  const longitude =
    row.longitude != null && Number.isFinite(row.longitude) ? String(row.longitude) : '';
  const mapsLink =
    String(row.mapsUrl ?? '').trim() || mapsLinkFromCoords(latitude, longitude);
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    place: row.place,
    body: row.body,
    source: row.source,
    is_published: row.isPublished,
    published_at: row.publishedAt,
    image_url: row.imageUrl ?? '',
    action_url: row.actionUrl ?? '',
    event_starts_at: row.eventStartsAt ?? '',
    event_ends_at: row.eventEndsAt ?? '',
    venue_name: row.venueName ?? '',
    google_maps_link: mapsLink,
    latitude,
    longitude,
    visibility: visibilityFromRow(row),
  };
}

/**
 * Announcement form fields to the shared write input. Exported because the
 * establishment portal posts the same form and must apply the same visibility,
 * scheduling and coordinate rules.
 */
export function announcementFormToWriteInput(form: Omit<AnnouncementAdminRow, 'id' | 'source'>) {
  const visibility = (form.visibility || 'draft') as AnnouncementVisibility;
  const isPublished = visibility !== 'draft';
  let publishedAt = form.published_at || null;
  if (visibility === 'published' && !publishedAt) {
    publishedAt = new Date().toISOString();
  }
  if (visibility === 'scheduled') {
    if (!publishedAt) throw new Error('Schedule a publish date/time');
    const when = new Date(publishedAt);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      throw new Error('Scheduled publish must be in the future');
    }
  }
  let lat = form.latitude.trim() ? Number(form.latitude) : null;
  let lng = form.longitude.trim() ? Number(form.longitude) : null;
  const mapsLink = String(form.google_maps_link ?? '').trim();
  if ((lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) && mapsLink) {
    const fromUrl = parseCoordsFromMapsUrl(mapsLink);
    if (fromUrl) {
      lat = fromUrl.lat;
      lng = fromUrl.lng;
    }
  }
  const resolvedMapsUrl =
    mapsLink ||
    (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)
      ? mapsLinkFromCoords(String(lat), String(lng))
      : '');
  return {
    kind: form.kind,
    title: form.title,
    place: form.place,
    body: form.body,
    isPublished,
    imageUrl: form.image_url,
    actionUrl: form.action_url,
    publishedAt,
    eventStartsAt: form.event_starts_at || null,
    eventEndsAt: form.event_ends_at || null,
    venueName: form.venue_name,
    latitude: lat != null && Number.isFinite(lat) ? lat : null,
    longitude: lng != null && Number.isFinite(lng) ? lng : null,
    mapsUrl: resolvedMapsUrl,
  };
}

export async function fetchAnnouncementsAdmin(client: SupabaseClient): Promise<AnnouncementAdminRow[]> {
  const rows = await fetchAllAnnouncements(client);
  return rows.map(toAdminRow);
}

export async function createAnnouncementAdmin(
  client: SupabaseClient,
  form: Omit<AnnouncementAdminRow, 'id' | 'source'>,
  authorId: string
): Promise<void> {
  await createAnnouncementRow(client, {
    ...announcementFormToWriteInput(form),
    source: 'admin',
    authorId,
  });
}

export async function updateAnnouncementAdmin(
  client: SupabaseClient,
  id: string,
  form: Omit<AnnouncementAdminRow, 'id' | 'source'>
): Promise<void> {
  await updateAnnouncementRow(client, id, announcementFormToWriteInput(form));
}

export async function deleteAnnouncementAdmin(client: SupabaseClient, id: string): Promise<void> {
  await deleteAnnouncementRow(client, id);
}
