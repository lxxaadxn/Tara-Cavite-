import type { SupabaseClient } from '@supabase/supabase-js';
import { formatAdminDate } from './adminUsers';

export { formatAdminDate };

export const ADMIN_AUDIT_SQL_HINT =
  'Run ADMIN_AUDIT_LOG.sql in the Supabase SQL Editor, then reload. New admin edits will appear here.';

export type AuditAction = 'insert' | 'update' | 'delete';

export type AdminAuditRow = {
  id: string;
  occurredAt: string;
  actorEmail: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  summary: string;
};

const ENTITY_LABELS: Record<string, string> = {
  site_content: 'Site content',
  sta_v3_cavite_2025: 'Attraction',
  itineraries: 'Itinerary',
  announcements: 'Announcement',
  place_reviews: 'Review',
  users: 'Traveler account',
  establishment_owners: 'Establishment',
  cities: 'City / municipality',
  app_filter_categories: 'App filter',
  user_reports: 'User report',
  ntdp_categories: 'NTDP category',
  ta_categories: 'Category',
  type_codes: 'Type code',
};

export function auditEntityLabel(entity: string): string {
  return ENTITY_LABELS[entity] || entity.replace(/_/g, ' ');
}

export function auditActionLabel(action: AuditAction): string {
  if (action === 'insert') return 'Created';
  if (action === 'delete') return 'Deleted';
  return 'Updated';
}

function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  );
}

function friendly(err: { message?: string; code?: string }): Error {
  const msg = err.message ?? 'Failed to load audit log';
  if (err.code === '42501' || /row-level security|permission denied/i.test(msg) || isMissingRelationError(err)) {
    return new Error(ADMIN_AUDIT_SQL_HINT);
  }
  return new Error(msg);
}

function parseAction(raw: unknown): AuditAction {
  const v = String(raw ?? '').toLowerCase();
  if (v === 'insert' || v === 'delete') return v;
  return 'update';
}

export async function fetchAdminAuditLog(client: SupabaseClient): Promise<AdminAuditRow[]> {
  const { data, error } = await client
    .from('admin_audit_log')
    .select('id, occurred_at, actor_email, action, entity, entity_id, summary')
    .order('occurred_at', { ascending: false })
    .limit(500);

  if (error) throw friendly(error);

  return (data ?? []).map((row) => ({
    id: String(row.id),
    occurredAt: row.occurred_at ? String(row.occurred_at) : '',
    actorEmail: String(row.actor_email ?? '').trim() || 'Unknown admin',
    action: parseAction(row.action),
    entity: String(row.entity ?? ''),
    entityId: String(row.entity_id ?? ''),
    summary: String(row.summary ?? ''),
  }));
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function auditLogToCsv(rows: AdminAuditRow[]): string {
  const header = ['When', 'Admin', 'Action', 'Area', 'Summary'];
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        csvCell(formatAdminDate(row.occurredAt)),
        csvCell(row.actorEmail),
        csvCell(auditActionLabel(row.action)),
        csvCell(auditEntityLabel(row.entity)),
        csvCell(row.summary),
      ].join(',')
    ),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

export function downloadAuditCsv(rows: AdminAuditRow[]): void {
  const blob = new Blob([auditLogToCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `tara-cavite-audit-log-${stamp}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
