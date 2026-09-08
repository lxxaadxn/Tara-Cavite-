import type { SupabaseClient } from '@supabase/supabase-js';
import { formatAdminDate } from './adminUsers';

export { formatAdminDate };

export const ESTABLISHMENT_MANAGEMENT_SQL_HINT =
  'Run ESTABLISHMENT_INVITE_ADMIN.sql in the Supabase SQL Editor, then reload.';

export const ESTABLISHMENT_INVITE_FN_HINT =
  'Deploy the invite-establishment Edge Function (see ESTABLISHMENT_INVITE_ADMIN.sql), then try again.';

/** The admin write policies live in a different SQL file than the invite setup. */
export const ESTABLISHMENT_ADMIN_WRITE_HINT =
  'Supabase blocked this change. Run ESTABLISHMENT_MANAGEMENT_ADMIN.sql in the SQL Editor — it creates the "Admins update establishment owners" policy — then try again.';

const ESTABLISHMENT_ADMIN_SESSION_HINT =
  'Supabase does not recognise this session as an admin, so the change was blocked. Add this email to the admin allowlist (Settings → Admin access), then sign out and back in.';

/**
 * A write that changes no rows means RLS filtered it out. Ask Supabase whether
 * the session is admin so the message names the actual cause.
 */
async function blockedWriteError(client: SupabaseClient): Promise<Error> {
  const { data, error } = await client.rpc('is_cavitour_session_admin');
  if (!error && data === false) return new Error(ESTABLISHMENT_ADMIN_SESSION_HINT);
  return new Error(ESTABLISHMENT_ADMIN_WRITE_HINT);
}

export type OwnerVerificationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended'
  | 'invited';

export type OwnerAccountStatus = 'active' | 'disabled' | 'deleted';

export type EstablishmentListMode = 'all' | 'pending' | 'deactivated' | 'drafts';

export type AdminEstablishment = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessType: string;
  lgu: string;
  barangay: string;
  address: string;
  googleMapsLink: string;
  /** Optional note the admin recorded when inviting this establishment. */
  inviteMessage: string;
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
  barangay: string;
  address: string;
  googleMapsLink: string;
  fullName: string;
  phone: string;
  email: string;
  /** Only written when present, so detail-page edits leave the note alone. */
  inviteMessage?: string;
};

export type InviteEstablishmentInput = {
  businessName: string;
  email: string;
  fullName: string;
  businessType: string;
  address: string;
  lgu: string;
  barangay?: string;
  phone?: string;
  googleMapsLink?: string;
  inviteMessage?: string;
};

/** Columns every install has, back to the original owners table. */
const SELECT_CORE = [
  'id',
  'email',
  'full_name',
  'phone',
  'business_name',
  'business_type',
  'lgu',
  'address',
  'google_maps_link',
  'avatar_url',
  'verification_status',
  'account_status',
  'notes',
  'created_at',
  'sta_place_id',
];

/** Added by later SQL files. Each is dropped on its own if the DB lacks it. */
const SELECT_OPTIONAL = [
  'barangay',
  'invite_message',
  'invited_at',
  'setup_completed_at',
  'public_visible',
  'place_checkin_codes!establishment_owners_sta_place_id_fkey(code, is_active)',
];

/** Name Postgres would use for a select part, e.g. the table of an embed. */
function selectPartName(part: string): string {
  return part.split('!')[0].split('(')[0].trim();
}

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
    barangay: String(row.barangay ?? '').trim(),
    address: String(row.address ?? '').trim(),
    googleMapsLink: String(row.google_maps_link ?? '').trim(),
    inviteMessage: String(row.invite_message ?? '').trim(),
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

const TITLE_CASE_MINOR_WORDS = new Set(['a', 'an', 'and', 'at', 'by', 'de', 'del', 'for', 'in', 'ng', 'of', 'on', 'or', 'the', 'to']);

/** Display-only Title Case; stored Supabase values are never rewritten. */
export function toTitleCase(value: string): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  return trimmed
    .toLowerCase()
    .split(/(\s+)/)
    .map((chunk, index) => {
      if (!chunk.trim()) return chunk;
      return chunk
        .split(/([-'/.])/)
        .map((part, partIndex) => {
          if (!/[a-z0-9]/.test(part)) return part;
          if (index > 0 && partIndex === 0 && TITLE_CASE_MINOR_WORDS.has(part)) return part;
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join('');
    })
    .join('');
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
  if (mode === 'drafts') return false;
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

/**
 * Read the owners, dropping only the optional columns this database is missing.
 * A single unknown column used to knock out the whole optional set, which left
 * the UI reading public_visible (and the invite dates) as blank forever.
 */
async function selectOwners(client: SupabaseClient) {
  let optional = [...SELECT_OPTIONAL];

  for (;;) {
    const result = await client
      .from('establishment_owners')
      .select([...SELECT_CORE, ...optional].join(', '))
      .order('created_at', { ascending: false });
    if (!result.error || optional.length === 0) return result;

    const message = `${result.error.message ?? ''} ${result.error.details ?? ''}`.toLowerCase();
    const offending = optional.find((part) => message.includes(selectPartName(part).toLowerCase()));
    optional = offending ? optional.filter((part) => part !== offending) : [];
  }
}

export async function fetchAdminEstablishments(client: SupabaseClient): Promise<AdminEstablishment[]> {
  const { data, error } = await selectOwners(client);
  if (error) throw friendlyAdminError(error, 'Failed to load establishments');
  // The select list is built at runtime, so PostgREST can't type the rows.
  return (data ?? []).map((row) => mapRow(row as unknown as Record<string, unknown>));
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
  const { data, error } = await client
    .from('establishment_owners')
    .update({
      business_name: patch.businessName.trim() || null,
      business_type: patch.businessType.trim() || null,
      lgu: patch.lgu.trim() || null,
      barangay: patch.barangay.trim() || null,
      address: patch.address.trim() || null,
      google_maps_link: patch.googleMapsLink.trim() || null,
      full_name: patch.fullName.trim() || null,
      phone: patch.phone.trim() || null,
      email: patch.email.trim() || null,
    })
    .eq('id', id)
    .select('id');
  if (error) throw friendlyAdminError(error, 'Failed to update establishment');
  if (!data || data.length === 0) throw await blockedWriteError(client);

  if (patch.inviteMessage !== undefined) {
    // Older databases predate this column; the profile edit still counts.
    await client
      .from('establishment_owners')
      .update({ invite_message: patch.inviteMessage.trim() || null })
      .eq('id', id);
  }
}

export async function setEstablishmentAccountStatus(
  client: SupabaseClient,
  id: string,
  status: 'active' | 'disabled'
): Promise<void> {
  const { data, error } = await client
    .from('establishment_owners')
    .update({ account_status: status })
    .eq('id', id)
    .select('id, account_status');
  if (error) throw friendlyAdminError(error, 'Failed to update account status');
  // RLS hides rows the session may not write, so a blocked update looks like a
  // success with nothing changed. Treat that as the permission error it is.
  if (!data || data.length === 0) throw await blockedWriteError(client);
}

export async function setEstablishmentPublicVisible(
  client: SupabaseClient,
  id: string,
  publicVisible: boolean
): Promise<void> {
  const { data, error } = await client
    .from('establishment_owners')
    .update({ public_visible: publicVisible })
    .eq('id', id)
    .select('id, public_visible');
  if (error) throw friendlyAdminError(error, 'Failed to update public visibility');
  if (!data || data.length === 0) throw await blockedWriteError(client);
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
      barangay: (input.barangay ?? '').trim(),
      phone: (input.phone ?? '').trim(),
      googleMapsLink: (input.googleMapsLink ?? '').trim(),
      inviteMessage: (input.inviteMessage ?? '').trim(),
      redirectTo,
      resend,
    },
  });
  if (error) throw new Error(await readFunctionError(error, data));
  const payload = data as { error?: string; ownerId?: string } | null;
  if (payload?.error) throw new Error(payload.error);

  const ownerId = payload?.ownerId;
  const barangay = (input.barangay ?? '').trim();
  const inviteMessage = (input.inviteMessage ?? '').trim();
  if (ownerId && (barangay || inviteMessage)) {
    // Safety net for a not-yet-redeployed Edge Function, which drops these two
    // columns. The invitation is already sent; never fail the whole flow here.
    await client
      .from('establishment_owners')
      .update({ barangay: barangay || null, invite_message: inviteMessage || null })
      .eq('id', ownerId);
  }
  return { ownerId };
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

export const ESTABLISHMENT_DRAFTS_SQL_HINT =
  'Run 20260908120000_establishment_drafts.sql in the Supabase SQL Editor, then reload.';

export type EstablishmentDraft = {
  id: string;
  email: string;
  businessName: string;
  fullName: string;
  phone: string;
  businessType: string;
  lgu: string;
  barangay: string;
  address: string;
  googleMapsLink: string;
  inviteMessage: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type EstablishmentDraftInput = {
  email: string;
  businessName: string;
  fullName: string;
  phone: string;
  businessType: string;
  lgu: string;
  barangay: string;
  address: string;
  inviteMessage: string;
};

const DRAFT_SELECT =
  'id, email, business_name, full_name, phone, business_type, lgu, barangay, address, google_maps_link, invite_message, created_at, updated_at';

function mapDraft(row: Record<string, unknown>): EstablishmentDraft {
  return {
    id: String(row.id),
    email: String(row.email ?? '').trim(),
    businessName: String(row.business_name ?? '').trim(),
    fullName: String(row.full_name ?? '').trim(),
    phone: String(row.phone ?? '').trim(),
    businessType: String(row.business_type ?? '').trim(),
    lgu: String(row.lgu ?? '').trim(),
    barangay: String(row.barangay ?? '').trim(),
    address: String(row.address ?? '').trim(),
    googleMapsLink: String(row.google_maps_link ?? '').trim(),
    inviteMessage: String(row.invite_message ?? '').trim(),
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

function friendlyDraftError(err: { message?: string; code?: string }, fallback: string): Error {
  if (isMissingRelationError(err) || err.code === '42501') {
    return new Error(ESTABLISHMENT_DRAFTS_SQL_HINT);
  }
  return new Error(err.message ?? fallback);
}

export async function fetchEstablishmentDrafts(client: SupabaseClient): Promise<EstablishmentDraft[]> {
  const { data, error } = await client
    .from('establishment_drafts')
    .select(DRAFT_SELECT)
    .order('updated_at', { ascending: false });
  if (error) throw friendlyDraftError(error, 'Failed to load drafts');
  return (data ?? []).map((row) => mapDraft(row as Record<string, unknown>));
}

export async function saveEstablishmentDraft(
  client: SupabaseClient,
  form: EstablishmentDraftInput,
  id?: string
): Promise<void> {
  const payload = {
    email: form.email.trim().toLowerCase() || null,
    business_name: form.businessName.trim() || null,
    full_name: form.fullName.trim() || null,
    phone: form.phone.trim() || null,
    business_type: form.businessType.trim() || null,
    lgu: form.lgu.trim() || null,
    barangay: form.barangay.trim() || null,
    address: form.address.trim() || null,
    invite_message: form.inviteMessage.trim() || null,
  };
  const { error } = id
    ? await client.from('establishment_drafts').update(payload).eq('id', id)
    : await client.from('establishment_drafts').insert(payload);
  if (error) throw friendlyDraftError(error, 'Failed to save draft');
}

export async function deleteEstablishmentDraft(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('establishment_drafts').delete().eq('id', id);
  if (error) throw friendlyDraftError(error, 'Failed to delete draft');
}
