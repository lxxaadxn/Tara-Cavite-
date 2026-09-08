import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Admin account settings live in Supabase auth user metadata rather than a
 * table: there is one row per admin, no SQL to run, and the session already
 * carries it, so the top bar updates as soon as the user record changes.
 */

const AVATAR_BUCKET = 'avatars';
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export type AdminPreferences = {
  /** An establishment posted an announcement. */
  establishmentAnnouncements: boolean;
  /** An establishment set a password from its invitation. */
  establishmentActivations: boolean;
};

export const DEFAULT_ADMIN_PREFERENCES: AdminPreferences = {
  establishmentAnnouncements: true,
  establishmentActivations: true,
};

export type AdminProfilePatch = {
  displayName: string;
  department: string;
};

function metadataOf(user: User | null | undefined): Record<string, unknown> {
  return (user?.user_metadata ?? {}) as Record<string, unknown>;
}

export function readAdminPreferences(user: User | null | undefined): AdminPreferences {
  const raw = metadataOf(user).admin_prefs;
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ADMIN_PREFERENCES };
  const saved = raw as Partial<Record<keyof AdminPreferences, unknown>>;
  return {
    establishmentAnnouncements: saved.establishmentAnnouncements !== false,
    establishmentActivations: saved.establishmentActivations !== false,
  };
}

async function currentUser(client: SupabaseClient): Promise<User> {
  const { data, error } = await client.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in again to update your account.');
  return data.user;
}

/** Merge into existing metadata so unrelated keys (Google name, picture) survive. */
async function patchMetadata(client: SupabaseClient, patch: Record<string, unknown>): Promise<User> {
  const user = await currentUser(client);
  const { data, error } = await client.auth.updateUser({
    data: { ...metadataOf(user), ...patch },
  });
  if (error) throw error;
  await client.auth.refreshSession();
  return data.user ?? user;
}

export async function saveAdminPreferences(
  client: SupabaseClient,
  prefs: AdminPreferences
): Promise<void> {
  await patchMetadata(client, { admin_prefs: prefs });
}

export async function updateAdminProfile(
  client: SupabaseClient,
  patch: AdminProfilePatch
): Promise<void> {
  const displayName = patch.displayName.trim();
  const department = patch.department.trim();
  if (!displayName) throw new Error('Enter a display name.');
  await patchMetadata(client, {
    full_name: displayName,
    name: displayName,
    display_name: displayName,
    department: department || null,
  });
}

/**
 * Supabase sends a confirmation link to the new address; the change only lands
 * once it is opened. Returns true when such a confirmation is pending.
 */
export async function updateAdminEmail(client: SupabaseClient, email: string): Promise<boolean> {
  const next = email.trim().toLowerCase();
  const user = await currentUser(client);
  if (!next || !next.includes('@')) throw new Error('Enter a valid email address.');
  if (next === (user.email ?? '').trim().toLowerCase()) return false;

  const redirectTo = typeof window === 'undefined' ? undefined : `${window.location.origin}/`;
  const { error } = await client.auth.updateUser({ email: next }, { emailRedirectTo: redirectTo });
  if (error) throw error;
  return true;
}

function assertAvatarFile(file: File): void {
  if (file.size > AVATAR_MAX_BYTES) throw new Error('Please choose an image under 5 MB.');
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
}

/** Object path inside the bucket, recovered from a public storage URL. */
function avatarObjectPath(url: string): string | null {
  const match = /\/storage\/v1\/object\/(?:public|sign)\/avatars\/(.+?)(?:\?|$)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function uploadAdminAvatar(client: SupabaseClient, file: File): Promise<string> {
  assertAvatarFile(file);
  const user = await currentUser(client);

  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const ext = ['jpg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const path = `${user.id}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    cacheControl: '3600',
  });
  if (error) {
    const msg = error.message || '';
    if (/policy|permission|row-level security|not authorized|denied/i.test(msg)) {
      throw new Error(
        'Upload blocked by storage rules. Run storage-policies.sql in the Supabase SQL Editor, then try again.'
      );
    }
    if (/bucket|not found|does not exist/i.test(msg)) {
      throw new Error('Storage bucket "avatars" is missing. Create it under Storage in Supabase, marked public.');
    }
    throw error;
  }

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  await patchMetadata(client, { avatar_url: publicUrl, picture: publicUrl });
  return publicUrl;
}

export async function removeAdminAvatar(client: SupabaseClient): Promise<void> {
  const user = await currentUser(client);
  const current = String(metadataOf(user).avatar_url ?? '').trim();
  const path = current ? avatarObjectPath(current) : null;

  await patchMetadata(client, { avatar_url: null, picture: null });
  // The metadata is what the UI reads, so a failed cleanup is not worth an error.
  if (path) await client.storage.from(AVATAR_BUCKET).remove([path]);
}
