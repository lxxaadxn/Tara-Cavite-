import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAnnouncement as createAnnouncementRow,
  deleteAnnouncement as deleteAnnouncementRow,
  fetchAllAnnouncements,
  formatAnnouncementDateLabel,
  updateAnnouncement as updateAnnouncementRow,
} from 'cavitour-shared/announcements';

export type AnnouncementKind = 'event' | 'advisory';
export type AnnouncementSource = 'admin' | 'establishment';

export type AnnouncementAdminRow = {
  id: string;
  kind: AnnouncementKind;
  title: string;
  place: string;
  body: string;
  source: AnnouncementSource;
  is_published: boolean;
  published_at: string | null;
};

export function announcementDateLabel(iso: string | null): string {
  return formatAnnouncementDateLabel(iso);
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
}): AnnouncementAdminRow {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    place: row.place,
    body: row.body,
    source: row.source,
    is_published: row.isPublished,
    published_at: row.publishedAt,
  };
}

export async function fetchAnnouncementsAdmin(client: SupabaseClient): Promise<AnnouncementAdminRow[]> {
  const rows = await fetchAllAnnouncements(client);
  return rows.map(toAdminRow);
}

export async function createAnnouncementAdmin(
  client: SupabaseClient,
  form: Omit<AnnouncementAdminRow, 'id' | 'source' | 'published_at'>,
  authorId: string
): Promise<void> {
  await createAnnouncementRow(client, {
    kind: form.kind,
    title: form.title,
    place: form.place,
    body: form.body,
    source: 'admin',
    authorId,
    isPublished: form.is_published,
  });
}

export async function updateAnnouncementAdmin(
  client: SupabaseClient,
  id: string,
  form: Omit<AnnouncementAdminRow, 'id' | 'source' | 'published_at'>
): Promise<void> {
  await updateAnnouncementRow(client, id, {
    kind: form.kind,
    title: form.title,
    place: form.place,
    body: form.body,
    isPublished: form.is_published,
  });
}

export async function deleteAnnouncementAdmin(client: SupabaseClient, id: string): Promise<void> {
  await deleteAnnouncementRow(client, id);
}
