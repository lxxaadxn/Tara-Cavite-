import type { SupabaseClient } from '@supabase/supabase-js';
import { isAllowedAdminEmail } from './adminEmail';

export const USER_MANAGEMENT_SQL_HINT =
  'Run USER_MANAGEMENT_ADMIN.sql in the Supabase SQL Editor, then reload.';

export type TravelerAccountStatus = 'active' | 'disabled' | 'deleted';

export type AccountRole = 'admin' | 'user' | 'establishment';

export type AdminTraveler = {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  city: string;
  phone: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  accountStatus: TravelerAccountStatus;
  initials: string;
  role: AccountRole;
};

export function accountRoleLabel(role: AccountRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'establishment') return 'Establishment';
  return 'User';
}

export type UserVisitActivity = {
  id: string;
  placeId: string;
  placeName: string;
  source: string;
  createdAt: string;
};

export type UserReviewActivity = {
  id: string;
  placeId: string;
  placeName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type UserRouteActivity = {
  id: string;
  name: string;
  fromLocation: string;
  toLocation: string;
  createdAt: string;
};

export type UserActivity = {
  visits: UserVisitActivity[];
  reviews: UserReviewActivity[];
  routes: UserRouteActivity[];
};

export type UserReportStatus = 'open' | 'resolved';

export type UserReportRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: AccountRole;
  reason: string;
  notes: string;
  status: UserReportStatus;
  createdAt: string;
};

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

function friendlyAdminError(err: { message?: string; code?: string }, fallback: string): Error {
  const msg = err.message ?? fallback;
  if (err.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new Error(USER_MANAGEMENT_SQL_HINT);
  }
  if (isMissingRelationError(err)) {
    return new Error(USER_MANAGEMENT_SQL_HINT);
  }
  return new Error(msg);
}

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.split('@')[0] || 'U';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0]?.charAt(0);
    const b = words[1]?.charAt(0);
    if (a && b) return (a + b).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || 'U';
}

function parseStatus(raw: unknown): TravelerAccountStatus {
  const v = String(raw ?? 'active').trim().toLowerCase();
  if (v === 'disabled' || v === 'deleted') return v;
  return 'active';
}

function displayNameOf(row: { display_name?: string | null; username?: string | null; email?: string | null }): string {
  return (
    String(row.display_name ?? '').trim() ||
    String(row.username ?? '').trim() ||
    String(row.email ?? '').split('@')[0] ||
    'Traveler'
  );
}

export function formatAdminDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatAdminRelative(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never';
  const diffMs = Date.now() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffMs < 0) return formatAdminDate(iso);
  if (diffMs < 60 * 60 * 1000) return 'Just now';
  if (diffDays < 1) return 'Today';
  if (diffDays < 2) return 'Yesterday';
  if (diffDays < 7) return `${Math.floor(diffDays)} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatAdminDate(iso);
}

const RECENT_USE_MS = 30 * 24 * 60 * 60 * 1000;

export function isRecentlyActive(iso: string | null | undefined): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() <= RECENT_USE_MS;
}

function blankAccount(id: string): AdminTraveler {
  return {
    id,
    username: '',
    displayName: '',
    email: '',
    avatarUrl: null,
    city: '',
    phone: '',
    createdAt: null,
    lastUsedAt: null,
    accountStatus: 'active',
    initials: 'U',
    role: 'user',
  };
}

function laterDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

function earlierDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return new Date(a).getTime() <= new Date(b).getTime() ? a : b;
}

function mergeAccount(prev: AdminTraveler, patch: Partial<AdminTraveler>): AdminTraveler {
  const displayName = (patch.displayName ?? '').trim() || prev.displayName;
  const email = (patch.email ?? '').trim() || prev.email;
  const role: AccountRole =
    prev.role === 'establishment' || patch.role === 'establishment' ? 'establishment' : patch.role ?? prev.role;
  return {
    ...prev,
    username: (patch.username ?? '').trim() || prev.username,
    displayName,
    email,
    avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl || prev.avatarUrl : prev.avatarUrl,
    city: (patch.city ?? '').trim() || prev.city,
    phone: (patch.phone ?? '').trim() || prev.phone,
    createdAt: earlierDate(prev.createdAt, patch.createdAt ?? null),
    lastUsedAt: laterDate(prev.lastUsedAt, patch.lastUsedAt ?? null),
    accountStatus: patch.accountStatus ?? prev.accountStatus,
    initials: initialsFrom(displayName, email),
    role,
  };
}

function finishAccount(row: AdminTraveler): AdminTraveler {
  const email = row.email;
  const role: AccountRole = isAllowedAdminEmail(email) ? 'admin' : row.role;
  const displayName = row.displayName.trim() || email.split('@')[0] || (role === 'admin' ? 'Admin' : 'User');
  return {
    ...row,
    role,
    displayName,
    initials: initialsFrom(displayName, email),
  };
}

export async function fetchAdminTravelers(client: SupabaseClient): Promise<AdminTraveler[]> {
  const [profilesRes, travelersRes, ownersRes, lastSignInsRes] = await Promise.all([
    client
      .from('user_profiles')
      .select('id, username, display_name, email, avatar_url, city, phone, created_at, updated_at')
      .order('created_at', { ascending: false }),
    client.from('users').select('id, account_status, email, username, display_name, phone, city, avatar_url, created_at, updated_at'),
    client
      .from('establishment_owners')
      .select('id, email, full_name, business_name, phone, avatar_url, account_status, created_at, updated_at'),
    client.rpc('admin_user_last_sign_ins'),
  ]);

  if (profilesRes.error) throw friendlyAdminError(profilesRes.error, 'Failed to load users');
  if (travelersRes.error && !isMissingRelationError(travelersRes.error)) {
    throw friendlyAdminError(travelersRes.error, 'Failed to load account status');
  }
  if (ownersRes.error && !isMissingRelationError(ownersRes.error)) {
    throw friendlyAdminError(ownersRes.error, 'Failed to load establishment accounts');
  }

  const byId = new Map<string, AdminTraveler>();
  const put = (id: string, patch: Partial<AdminTraveler>) => {
    const key = String(id);
    if (!key) return;
    byId.set(key, mergeAccount(byId.get(key) ?? blankAccount(key), { ...patch, id: key }));
  };

  for (const row of profilesRes.data ?? []) {
    const email = String(row.email ?? '').trim();
    put(String(row.id), {
      username: String(row.username ?? '').trim(),
      displayName: displayNameOf(row),
      email,
      avatarUrl: String(row.avatar_url ?? '').trim() || null,
      city: String(row.city ?? '').trim(),
      phone: String(row.phone ?? '').trim(),
      createdAt: row.created_at ? String(row.created_at) : null,
      lastUsedAt: row.updated_at ? String(row.updated_at) : null,
      role: 'user',
    });
  }

  for (const row of travelersRes.data ?? []) {
    put(String(row.id), {
      username: String(row.username ?? '').trim(),
      displayName: displayNameOf(row),
      email: String(row.email ?? '').trim(),
      avatarUrl: String(row.avatar_url ?? '').trim() || null,
      city: String(row.city ?? '').trim(),
      phone: String(row.phone ?? '').trim(),
      createdAt: row.created_at ? String(row.created_at) : null,
      lastUsedAt: row.updated_at ? String(row.updated_at) : null,
      accountStatus: parseStatus(row.account_status),
      role: 'user',
    });
  }

  for (const row of ownersRes.data ?? []) {
    const business = String(row.business_name ?? '').trim();
    const fullName = String(row.full_name ?? '').trim();
    put(String(row.id), {
      displayName: fullName || business,
      email: String(row.email ?? '').trim(),
      avatarUrl: String(row.avatar_url ?? '').trim() || null,
      phone: String(row.phone ?? '').trim(),
      createdAt: row.created_at ? String(row.created_at) : null,
      lastUsedAt: row.updated_at ? String(row.updated_at) : null,
      accountStatus: parseStatus(row.account_status),
      role: 'establishment',
    });
  }

  for (const row of lastSignInsRes.data ?? []) {
    const lastUsedAt = row.last_sign_in_at ? String(row.last_sign_in_at) : null;
    if (!lastUsedAt) continue;
    put(String(row.id), { lastUsedAt });
  }

  return [...byId.values()]
    .map(finishAccount)
    .sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
}

export async function fetchAdminTraveler(
  client: SupabaseClient,
  userId: string
): Promise<AdminTraveler | null> {
  const rows = await fetchAdminTravelers(client);
  return rows.find((r) => r.id === userId) ?? null;
}

export async function setListedAccountStatus(
  client: SupabaseClient,
  user: AdminTraveler,
  status: 'active' | 'disabled'
): Promise<void> {
  if (user.role === 'admin') {
    throw new Error('Admin accounts cannot be deactivated from User Management.');
  }
  if (user.role === 'establishment') {
    const { error } = await client.from('establishment_owners').update({ account_status: status }).eq('id', user.id);
    if (error) throw friendlyAdminError(error, 'Failed to update account status');
    return;
  }
  await setTravelerAccountStatus(client, user, status);
}

export async function setTravelerAccountStatus(
  client: SupabaseClient,
  user: AdminTraveler,
  status: 'active' | 'disabled'
): Promise<void> {
  const { data: existing, error: existingError } = await client
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (existingError && !isMissingRelationError(existingError)) {
    throw friendlyAdminError(existingError, 'Failed to update account status');
  }
  if (existingError && isMissingRelationError(existingError)) {
    throw new Error(USER_MANAGEMENT_SQL_HINT);
  }

  if (!existing) {
    const { error } = await client.from('users').insert({
      id: user.id,
      email: user.email || null,
      username: user.username || null,
      display_name: user.displayName || null,
      phone: user.phone || null,
      city: user.city || null,
      avatar_url: user.avatarUrl,
      account_status: status,
    });
    if (error) throw friendlyAdminError(error, 'Failed to update account status');
    return;
  }

  const { error } = await client.from('users').update({ account_status: status }).eq('id', user.id);
  if (error) throw friendlyAdminError(error, 'Failed to update account status');
}

export async function fetchPlaceNamesById(client: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const { data: sta } = await client.from('sta_v3_cavite_2025').select('id, ta_name').in('id', unique);
  for (const row of sta ?? []) {
    const name = String(row.ta_name ?? '').trim();
    if (name) map.set(String(row.id), name);
  }

  const missing = unique.filter((id) => !map.has(id));
  if (missing.length === 0) return map;

  const { data: places } = await client.from('places').select('id, name').in('id', missing);
  for (const row of places ?? []) {
    const name = String(row.name ?? '').trim();
    if (name) map.set(String(row.id), name);
  }
  return map;
}

export async function fetchUserActivity(client: SupabaseClient, userId: string): Promise<UserActivity> {
  const [visitsRes, reviewsRes, routesRes] = await Promise.all([
    client
      .from('place_visits')
      .select('id, place_id, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25),
    client
      .from('place_reviews')
      .select('id, place_id, rating, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25),
    client
      .from('route_history')
      .select('id, name, from_location, to_location, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  const visitRows = visitsRes.error ? [] : visitsRes.data ?? [];
  const reviewRows = reviewsRes.error ? [] : reviewsRes.data ?? [];
  const routeRows = routesRes.error ? [] : routesRes.data ?? [];

  const names = await fetchPlaceNamesById(client, [
    ...visitRows.map((r) => String(r.place_id ?? '')),
    ...reviewRows.map((r) => String(r.place_id ?? '')),
  ]);

  return {
    visits: visitRows.map((r) => ({
      id: String(r.id),
      placeId: String(r.place_id ?? ''),
      placeName: names.get(String(r.place_id ?? '')) || 'Unknown place',
      source: String(r.source ?? ''),
      createdAt: String(r.created_at ?? ''),
    })),
    reviews: reviewRows.map((r) => ({
      id: String(r.id),
      placeId: String(r.place_id ?? ''),
      placeName: names.get(String(r.place_id ?? '')) || 'Unknown place',
      rating: Number(r.rating) || 0,
      body: String(r.body ?? ''),
      createdAt: String(r.created_at ?? ''),
    })),
    routes: routeRows.map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      fromLocation: String(r.from_location ?? ''),
      toLocation: String(r.to_location ?? ''),
      createdAt: String(r.created_at ?? ''),
    })),
  };
}

export async function fetchOpenUserReports(client: SupabaseClient): Promise<UserReportRow[]> {
  const { data, error } = await client
    .from('user_reports')
    .select('id, user_id, reason, notes, status, created_at')
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) throw friendlyAdminError(error, 'Failed to load reports');

  const reports = data ?? [];
  const userIds = [...new Set(reports.map((r) => String(r.user_id)))];
  const travelers = userIds.length ? await fetchAdminTravelers(client) : [];
  const byId = new Map(travelers.map((t) => [t.id, t]));

  return reports.map((row) => {
    const user = byId.get(String(row.user_id));
    return {
      id: String(row.id),
      userId: String(row.user_id),
      userName: user?.displayName || 'Unknown user',
      userEmail: user?.email || '—',
      userRole: user?.role ?? 'user',
      reason: String(row.reason ?? ''),
      notes: String(row.notes ?? ''),
      status: String(row.status ?? 'open') === 'resolved' ? 'resolved' : 'open',
      createdAt: String(row.created_at ?? ''),
    };
  });
}

export async function createUserReport(
  client: SupabaseClient,
  input: { userId: string; reason: string; notes?: string; createdBy?: string | null }
): Promise<void> {
  const reason = input.reason.trim();
  if (!reason) throw new Error('Enter a reason for the report.');
  const { error } = await client.from('user_reports').insert({
    user_id: input.userId,
    reason,
    notes: input.notes?.trim() || null,
    status: 'open',
    created_by: input.createdBy ?? null,
  });
  if (error) throw friendlyAdminError(error, 'Failed to create report');
}

export async function resolveUserReport(client: SupabaseClient, reportId: string): Promise<void> {
  const { error } = await client.from('user_reports').update({ status: 'resolved' }).eq('id', reportId);
  if (error) throw friendlyAdminError(error, 'Failed to resolve report');
}
