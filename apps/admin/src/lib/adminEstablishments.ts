import type { SupabaseClient } from '@supabase/supabase-js';
import { formatAdminDate } from './adminUsers';

export { formatAdminDate };

export const ESTABLISHMENT_MANAGEMENT_SQL_HINT =
  'Run ESTABLISHMENT_INVITE_ADMIN.sql in the Supabase SQL Editor, then reload.';

export const ESTABLISHMENT_INVITE_FN_HINT =
  'Deploy the invite-establishment Edge Function (see ESTABLISHMENT_INVITE_ADMIN.sql), then try again.';

export type OwnerVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'invited';

export type OwnerAccountStatus = 'active' | 'disabled' | 'deleted';

export type EstablishmentListMode = 'all' | 'pending' | 'deactivated';

export type AdminEstablishment = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessType: string;
  lgu: string;
  address: string;
  googleMapsLink: string;
  avatarUrl: string | null;
  verificationStatus: OwnerVerificationStatus;
  accountStatus: OwnerAccountStatus;
  publicVisible: boolean;
  notes: string;
  invitedAt: string | null;
  setupCompletedAt: string | null;
  createdAt: string | null;
  initials: string;
  /** UUID of the linked STA catalog row (auto-created on invite). */
  staPlaceId: string | null;
  /** Active QR check-in code for this establishment (CT-XXXXXXXX). */
  checkinCode: string | null;
};

export type EstablishmentProfilePatch = {
  businessName: string;
  businessType: string;
  lgu: string;
  address: string;
  googleMapsLink: string;
  fullName: string;
  phone: string;
  email: string;
};

export type InviteEstablishmentInput = {
  businessName: string;
  email: string;
  fullName: string;
  businessType: string;
  address: string;
  lgu: string;
  phone?: string;
  googleMapsLink?: string;
};

const SELECT_FULL =
  'id, email, full_name, phone, business_name, business_type, lgu, address, google_maps_link, avatar_url, verification_status, account_status, notes, created_at, invited_at, setup_completed_at, public_visible, sta_place_id, place_checkin_codes!establishment_owners_sta_place_id_fkey(code, is_active)';

const SELECT_BASE =
  'id, email, full_name, phone, business_name, business_type, lgu, address, google_maps_link, avatar_url, verification_status, account_status, notes, created_at, sta_place_id';

function isMissingRelationError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? '').toLowerCase();
  return (
    error.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    (msg.includes('could not find the') && msg.includes('column'))
  );
}

function friendlyAdminError(err: { message?: string; code?: string }, fallback: string): Error {
  const msg = err.message ?? fallback;
  if (err.code === '42501' || /row-level security|permission denied/i.test(msg)) {
    return new Error(ESTABLISHMENT_MANAGEMENT_SQL_HINT);
  }
  if (isMissingRelationError(err) || (/column/i.test(msg) && /does not exist/i.test(msg))) {
    return new Error(ESTABLISHMENT_MANAGEMENT_SQL_HINT);
  }
  return new Error(msg);
}

function parseVerification(raw: unknown): OwnerVerificationStatus {
  const v = String(raw ?? 'pending').trim().toLowerCase();
  if (
    v === 'under_review' ||
    v === 'approved' ||
    v === 'rejected' ||
    v === 'suspended' ||
    v === 'invited'
  ) {
    return v;
  }
  return 'pending';
}

function parseAccount(raw: unknown): OwnerAccountStatus {
  const v = String(raw ?? 'active').trim().toLowerCase();
  if (v === 'disabled' || v === 'deleted') return v;
  return 'active';
}

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email.split('@')[0] || 'E';
  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0]?.charAt(0);
    const b = words[1]?.charAt(0);
    if (a && b) return (a + b).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || 'E';
}

function mapRow(row: Record<string, unknown>): AdminEstablishment {
  const businessName = String(row.business_name ?? '').trim() || 'Unnamed establishment';
  const fullName = String(row.full_name ?? '').trim();
  const email = String(row.email ?? '').trim();

  // place_checkin_codes is a joined relation (array or single object depending on PostgREST)
  let checkinCode: string | null = null;
  const codeRel = row.place_checkin_codes;
  if (Array.isArray(codeRel)) {
    const active = (codeRel as { code?: string; is_active?: boolean }[]).find((c) => c.is_active !== false);
    checkinCode = active?.code ? String(active.code) : null;
  } else if (codeRel && typeof codeRel === 'object') {
    const c = codeRel as { code?: string; is_active?: boolean };
    if (c.is_active !== false && c.code) checkinCode = String(c.code);
  }

  return {
    id: String(row.id),
    email,
    fullName,
    phone: String(row.phone ?? '').trim(),
    businessName,
    businessType: String(row.business_type ?? '').trim(),
    lgu: String(row.lgu ?? '').trim(),
    address: String(row.address ?? '').trim(),
    googleMapsLink: String(row.google_maps_link ?? '').trim(),
    avatarUrl: String(row.avatar_url ?? '').trim() || null,
    verificationStatus: parseVerification(row.verification_status),
    accountStatus: parseAccount(row.account_status),
    publicVisible: row.public_visible === true,
    notes: String(row.notes ?? '').trim(),
    invitedAt: row.invited_at ? String(row.invited_at) : null,
    setupCompletedAt: row.setup_completed_at ? String(row.setup_completed_at) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    initials: initialsFrom(businessName, email),
    staPlaceId: row.sta_place_id ? String(row.sta_place_id) : null,
    checkinCode,
  };
}

export function isPendingSetup(row: AdminEstablishment): boolean {
  return (
    row.accountStatus === 'active' &&
    !row.setupCompletedAt &&
    (row.verificationStatus === 'invited' || row.verificationStatus === 'pending')
  );
}

export function matchesEstablishmentList(row: AdminEstablishment, mode: EstablishmentListMode): boolean {
  if (row.accountStatus === 'deleted') return false;
  if (mode === 'pending') return isPendingSetup(row);
  if (mode === 'deactivated') return row.accountStatus === 'disabled';
  return true;
}

export function verificationLabel(status: OwnerVerificationStatus): string {
  if (status === 'invited') return 'Invited';
  if (status === 'under_review') return 'Corrections requested';
  if (status === 'approved') return 'Recognized';
  if (status === 'rejected') return 'Rejected';
  if (status === 'suspended') return 'Suspended';
  return 'Pending';
}

export function setupLabel(row: AdminEstablishment): string {
  if (row.accountStatus === 'disabled') return 'Deactivated';
  if (isPendingSetup(row)) return 'Pending setup';
  if (row.setupCompletedAt) return 'Active';
  return verificationLabel(row.verificationStatus);
}

async function selectOwners(client: SupabaseClient) {
  const full = await client.from('establishment_owners').select(SELECT_FULL).order('created_at', { ascending: false });
  if (!full.error) return full;
  const base = await client.from('establishment_owners').select(SELECT_BASE).order('created_at', { ascending: false });
  return base;
}

export async function fetchAdminEstablishments(client: SupabaseClient): Promise<AdminEstablishment[]> {
  const { data, error } = await selectOwners(client);
  if (error) throw friendlyAdminError(error, 'Failed to load establishments');
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

export async function fetchAdminEstablishment(
  client: SupabaseClient,
  id: string
): Promise<AdminEstablishment | null> {
  const rows = await fetchAdminEstablishments(client);
  return rows.find((r) => r.id === id) ?? null;
}

export async function updateEstablishmentProfile(
  client: SupabaseClient,
  id: string,
  patch: EstablishmentProfilePatch
): Promise<void> {
  const { error } = await client
    .from('establishment_owners')
    .update({
      business_name: patch.businessName.trim() || null,
      business_type: patch.businessType.trim() || null,
      lgu: patch.lgu.trim() || null,
      address: patch.address.trim() || null,
      google_maps_link: patch.googleMapsLink.trim() || null,
      full_name: patch.fullName.trim() || null,
      phone: patch.phone.trim() || null,
      email: patch.email.trim() || null,
    })
    .eq('id', id);
  if (error) throw friendlyAdminError(error, 'Failed to update establishment');
}

export async function setEstablishmentAccountStatus(
  client: SupabaseClient,
  id: string,
  status: 'active' | 'disabled'
): Promise<void> {
  const { error } = await client.from('establishment_owners').update({ account_status: status }).eq('id', id);
  if (error) throw friendlyAdminError(error, 'Failed to update account status');
}

export async function setEstablishmentPublicVisible(
  client: SupabaseClient,
  id: string,
  publicVisible: boolean
): Promise<void> {
  const { error } = await client.from('establishment_owners').update({ public_visible: publicVisible }).eq('id', id);
  if (error) throw friendlyAdminError(error, 'Failed to update public visibility');
}

async function readFunctionError(error: unknown, data: unknown): Promise<string> {
  const payload = data && typeof data === 'object' ? (data as { error?: string; message?: string }) : null;
  if (payload?.error) return payload.error;
  if (payload?.message) return payload.message;

  const err = error as { message?: string; context?: unknown };
  const ctx = err?.context;
  if (ctx && typeof ctx === 'object' && 'json' in ctx && typeof (ctx as Response).json === 'function') {
    try {
      const body = (await (ctx as Response).clone().json()) as { error?: string; message?: string };
      if (body?.error) return body.error;
      if (body?.message) return body.message;
    } catch {
      /* ignore */
    }
  }
  const msg = err?.message ?? '';
  if (/failed to send|not found|404|functions?relay/i.test(msg)) return ESTABLISHMENT_INVITE_FN_HINT;
  return msg || ESTABLISHMENT_INVITE_FN_HINT;
}

export async function inviteEstablishment(
  client: SupabaseClient,
  input: InviteEstablishmentInput,
  redirectTo: string,
  resend = false
): Promise<{ ownerId?: string }> {
  const { data, error } = await client.functions.invoke('invite-establishment', {
    body: {
      email: input.email.trim().toLowerCase(),
      businessName: input.businessName.trim(),
      fullName: input.fullName.trim(),
      businessType: input.businessType.trim(),
      lgu: input.lgu.trim(),
      address: input.address.trim(),
      phone: (input.phone ?? '').trim(),
      googleMapsLink: (input.googleMapsLink ?? '').trim(),
      redirectTo,
      resend,
    },
  });
  if (error) throw new Error(await readFunctionError(error, data));
  const payload = data as { error?: string; ownerId?: string } | null;
  if (payload?.error) throw new Error(payload.error);
  return { ownerId: payload?.ownerId };
}

export function establishmentSetupRedirect(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/establishment/setup`;
}

/** Build the printable QR poster URL for an establishment given its check-in code. */
export function establishmentQrPosterUrl(checkinCode: string): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/checkin/poster/${encodeURIComponent(checkinCode)}`;
}

/**
 * Ensure an existing establishment owner has a STA catalog row + QR code.
 * Calls the `ensure_establishment_owner_sta_row` DB function.
 * Returns the STA place UUID (or null if already exists / name missing).
 */
export async function ensureEstablishmentQr(
  client: SupabaseClient,
  ownerId: string
): Promise<string | null> {
  const { data, error } = await client.rpc('ensure_establishment_owner_sta_row', {
    p_owner_id: ownerId,
  });
  if (error) throw friendlyAdminError(error, 'Failed to generate QR code');
  return data ? String(data) : null;
}
