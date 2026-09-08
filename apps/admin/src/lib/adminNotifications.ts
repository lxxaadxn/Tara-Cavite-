import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { AdminPreferences } from './adminProfile';

/**
 * Admin inbox rows are broadcast (one row per event, not per admin), so read
 * state comes from per-admin receipts and preference filtering happens here.
 */

export type AdminNotificationKind =
  | 'establishment_announcement'
  | 'establishment_activated'
  | 'review_reported';

export type AdminNotification = {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  body: string;
  createdAt: string | null;
  announcementId: string | null;
  establishmentOwnerId: string | null;
  read: boolean;
};

const SELECT = 'id, kind, title, body, created_at, announcement_id, establishment_owner_id';
const FETCH_LIMIT = 30;

/** Kinds the admin still wants to see. Reported reviews have no toggle: they always show. */
function enabledKinds(prefs: AdminPreferences): AdminNotificationKind[] {
  const kinds: AdminNotificationKind[] = ['review_reported'];
  if (prefs.establishmentAnnouncements) kinds.push('establishment_announcement');
  if (prefs.establishmentActivations) kinds.push('establishment_activated');
  return kinds;
}

/** The SQL file may not be applied yet; the bell should stay quiet, not crash. */
function isMissingTable(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    error.code === '42P01' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache')
  );
}

export async function fetchAdminNotifications(
  client: SupabaseClient,
  adminId: string,
  prefs: AdminPreferences
): Promise<AdminNotification[]> {
  const kinds = enabledKinds(prefs);
  if (!adminId || kinds.length === 0) return [];

  const { data, error } = await client
    .from('admin_notifications')
    .select(SELECT)
    .in('kind', kinds)
    .order('created_at', { ascending: false })
    .limit(FETCH_LIMIT);
  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const ids = rows.map((row) => String(row.id));
  const readIds = await fetchReadIds(client, adminId, ids);

  return rows.map((row) => ({
    id: String(row.id),
    kind: row.kind as AdminNotificationKind,
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    createdAt: row.created_at ? String(row.created_at) : null,
    announcementId: row.announcement_id ? String(row.announcement_id) : null,
    establishmentOwnerId: row.establishment_owner_id ? String(row.establishment_owner_id) : null,
    read: readIds.has(String(row.id)),
  }));
}

async function fetchReadIds(
  client: SupabaseClient,
  adminId: string,
  ids: string[]
): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await client
    .from('admin_notification_reads')
    .select('notification_id')
    .eq('admin_id', adminId)
    .in('notification_id', ids);
  if (error) return new Set();
  return new Set((data ?? []).map((row) => String(row.notification_id)));
}

export async function markAdminNotificationsRead(
  client: SupabaseClient,
  adminId: string,
  ids: string[]
): Promise<void> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!adminId || unique.length === 0) return;
  await client.from('admin_notification_reads').upsert(
    unique.map((notification_id) => ({ admin_id: adminId, notification_id })),
    { onConflict: 'admin_id,notification_id', ignoreDuplicates: true }
  );
}

/** Fires whenever a new admin notification lands, so the badge can refresh. */
export function subscribeAdminNotifications(
  client: SupabaseClient,
  onChange: () => void
): RealtimeChannel {
  return client
    .channel(`admin-notifications-${Math.random().toString(36).slice(2, 9)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
      () => onChange()
    )
    .subscribe();
}
