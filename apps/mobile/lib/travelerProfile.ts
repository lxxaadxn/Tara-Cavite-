import type { SupabaseClient, User } from '@supabase/supabase-js';
import { DeviceEventEmitter } from 'react-native';
import * as Linking from 'expo-linking';
import {
  hasCustomAvatarFromSources,
  resolveAvatarFromSources,
} from 'cavitour-shared/defaultAvatar';
import { deleteUserAvatarFiles } from './avatarStorage';
import { getDevOAuthBridgeBaseUrl } from './authOAuth';
import { imageExtensionFromUri, imageMimeType, readLocalImageBytes } from './readImageBytes';
import {
  BIO_MAX_LENGTH,
  normalizeInterestTags,
  normalizeSocialUrl,
} from './travelerInterests';

export const AVATAR_UPDATED_EVENT = 'cavitour:avatar-updated';
export const COVER_UPDATED_EVENT = 'cavitour:cover-updated';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PROFILE_SELECT =
  'username, avatar_url, city, phone, birthday, bio, interest_tags, cover_url, social_instagram, social_facebook, social_tiktok';
const PROFILE_SELECT_FALLBACK = 'username, avatar_url, city, phone';

export type TravelerProfileView = {
  name: string;
  nickname: string;
  roleLabel: string;
  city: string;
  phone: string;
  email: string;
  birthday: string;
  bio: string;
  interestTags: string[];
  coverUrl: string;
  socialInstagram: string;
  socialFacebook: string;
  socialTiktok: string;
  memberSince: string;
  lastSignIn: string;
  avatarUrl: string;
  hasCustomPhoto: boolean;
};

export function dateOnly(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.slice(0, 10);
}

export function displayBirthday(value: unknown): string {
  const iso = dateOnly(value);
  if (!iso) return '';
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function deriveProfile(
  user: User | null,
  profileRow: Record<string, unknown> | null
): TravelerProfileView {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const nickname =
    String(profileRow?.username ?? '').trim() ||
    String(meta.nickname ?? '').trim() ||
    String(meta.username ?? '').trim() ||
    (user?.email ? user.email.split('@')[0] : '') ||
    '';
  const fullName =
    String(meta.full_name ?? '').trim() ||
    String(meta.name ?? '').trim() ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    nickname ||
    (user?.email ? user.email.split('@')[0] : 'Tara, Cavite! User');
  const created = user?.created_at ? new Date(user.created_at) : null;
  const daysOnPlatform = created
    ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000))
    : 0;
  return {
    name: String(fullName),
    nickname,
    roleLabel: daysOnPlatform ? `Traveler · ${daysOnPlatform} days on the platform` : 'Traveler',
    city: String(profileRow?.city || meta.city || '').trim(),
    phone: String(profileRow?.phone || user?.phone || meta.phone || '').trim(),
    email: user?.email || 'No email on account',
    birthday: dateOnly(profileRow?.birthday),
    bio: String(profileRow?.bio ?? '').trim(),
    interestTags: normalizeInterestTags(profileRow?.interest_tags),
    coverUrl: String(profileRow?.cover_url ?? '').trim(),
    socialInstagram: String(profileRow?.social_instagram ?? '').trim(),
    socialFacebook: String(profileRow?.social_facebook ?? '').trim(),
    socialTiktok: String(profileRow?.social_tiktok ?? '').trim(),
    memberSince: user?.created_at || '',
    lastSignIn: user?.last_sign_in_at || '',
    avatarUrl: resolveAvatarFromSources(
      profileRow as { avatar_url?: string | null },
      meta
    ),
    hasCustomPhoto: hasCustomAvatarFromSources(
      profileRow as { avatar_url?: string | null },
      meta
    ),
  };
}

export async function fetchProfileRow(
  client: SupabaseClient,
  userId: string
): Promise<Record<string, unknown> | null> {
  const full = await client.from('user_profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();
  if (!full.error) return (full.data as Record<string, unknown> | null) ?? null;
  const msg = String(full.error.message ?? '');
  if (
    /birthday|favorite_categories|preferred_lgus|accessibility_notes|bio|interest_tags|cover_url|social_|column/i.test(
      msg
    )
  ) {
    const mid = await client
      .from('user_profiles')
      .select('username, avatar_url, city, phone, birthday')
      .eq('id', userId)
      .maybeSingle();
    if (!mid.error) return (mid.data as Record<string, unknown> | null) ?? null;
    const retry = await client.from('user_profiles').select(PROFILE_SELECT_FALLBACK).eq('id', userId).maybeSingle();
    return (retry.data as Record<string, unknown> | null) ?? null;
  }
  return null;
}

export function usernameForRow(profile: { nickname?: string; name?: string } | null, user: User | null): string {
  return (
    String(profile?.nickname ?? '').trim() ||
    String(profile?.name ?? '').trim() ||
    String(user?.user_metadata?.nickname ?? '') ||
    String(user?.user_metadata?.username ?? '') ||
    (user?.email ? user.email.split('@')[0] : 'User')
  );
}

function emailChangeRedirectUrl(): string {
  const bridge = getDevOAuthBridgeBaseUrl();
  if (bridge) return `${bridge}/profile`;
  return Linking.createURL('auth/callback');
}

export async function saveProfileIdentity(
  client: SupabaseClient,
  {
    nickname,
    email,
    phone,
    city,
    birthday,
    bio,
    interestTags,
    socialInstagram,
    socialFacebook,
    socialTiktok,
  }: {
    nickname: string;
    email: string;
    phone: string;
    city: string;
    birthday: string;
    bio?: string;
    interestTags?: string[];
    socialInstagram?: string;
    socialFacebook?: string;
    socialTiktok?: string;
  }
): Promise<{
  profileRow: Record<string, unknown> | null;
  user: User;
  emailChangePending: boolean;
  birthdaySkipped: boolean;
}> {
  const { data: authData } = await client.auth.getUser();
  const u = authData?.user;
  if (!u) throw new Error('Sign in to save your profile.');

  const nick = String(nickname ?? '').trim();
  const emailTrim = String(email ?? '').trim().toLowerCase();
  const currentEmail = String(u.email ?? '').trim().toLowerCase();
  const bioTrim = String(bio ?? '').trim();
  if (bioTrim.length > BIO_MAX_LENGTH) {
    throw new Error(`Bio must be ${BIO_MAX_LENGTH} characters or fewer.`);
  }

  if (!nick) throw new Error('Please enter a nickname.');
  if (!emailTrim) throw new Error('Please enter an email address.');
  if (!EMAIL_RE.test(emailTrim)) throw new Error('Please enter a valid email address.');

  let emailChangePending = false;
  if (emailTrim !== currentEmail) {
    const { error: emailErr } = await client.auth.updateUser(
      { email: emailTrim },
      { emailRedirectTo: emailChangeRedirectUrl() }
    );
    if (emailErr) {
      const msg = emailErr.message || '';
      if (/already registered|already been registered|user already registered/i.test(msg)) {
        throw new Error('That email is already used by another account. Try a different address.');
      }
      if (/reauthentication|re-auth|same as the old/i.test(msg)) {
        throw new Error(
          'Email could not be changed right now. Sign out, sign in again, then try updating your email.'
        );
      }
      throw emailErr;
    }
    emailChangePending = true;
  }

  const payload = {
    id: u.id,
    username: nick,
    city: String(city ?? '').trim() || null,
    phone: String(phone ?? '').trim() || null,
    birthday: dateOnly(birthday) || null,
    bio: bioTrim || null,
    interest_tags: normalizeInterestTags(interestTags),
    social_instagram: normalizeSocialUrl(socialInstagram) || null,
    social_facebook: normalizeSocialUrl(socialFacebook) || null,
    social_tiktok: normalizeSocialUrl(socialTiktok) || null,
    updated_at: new Date().toISOString(),
  };

  let birthdaySkipped = false;
  let { error: upsertErr } = await client.from('user_profiles').upsert(payload, { onConflict: 'id' });
  if (upsertErr && /bio|interest_tags|social_|cover_url|column|schema cache/i.test(String(upsertErr.message ?? ''))) {
    const retryExtra = await client.from('user_profiles').upsert(
      {
        id: u.id,
        username: nick,
        city: payload.city,
        phone: payload.phone,
        birthday: payload.birthday,
        updated_at: payload.updated_at,
      },
      { onConflict: 'id' }
    );
    upsertErr = retryExtra.error;
  }
  if (upsertErr && /birthday|column|schema cache/i.test(String(upsertErr.message ?? ''))) {
    const retry = await client.from('user_profiles').upsert(
      {
        id: u.id,
        username: nick,
        city: payload.city,
        phone: payload.phone,
        updated_at: payload.updated_at,
      },
      { onConflict: 'id' }
    );
    upsertErr = retry.error;
    if (!retry.error) birthdaySkipped = true;
  }
  if (upsertErr) throw upsertErr;

  await client.auth.updateUser({
    data: { ...u.user_metadata, username: nick, nickname: nick, city: String(city ?? '').trim() },
  });

  const profileRow = await fetchProfileRow(client, u.id);
  const { data: refreshed } = await client.auth.getUser();
  return { profileRow, user: refreshed?.user ?? u, emailChangePending, birthdaySkipped };
}

export function emitAvatarUpdated() {
  DeviceEventEmitter.emit(AVATAR_UPDATED_EVENT);
}

export function emitCoverUpdated() {
  DeviceEventEmitter.emit(COVER_UPDATED_EVENT);
}

export async function canRemoveAvatar(client: SupabaseClient): Promise<boolean> {
  const { data } = await client.auth.getUser();
  const u = data?.user;
  if (!u) return false;
  const { data: profileRow } = await client.from('user_profiles').select('avatar_url').eq('id', u.id).maybeSingle();
  return hasCustomAvatarFromSources(profileRow, u.user_metadata ?? {});
}

export async function removeUserAvatar(client: SupabaseClient, username?: string): Promise<void> {
  const { data: authData, error: authReadErr } = await client.auth.getUser();
  if (authReadErr) throw authReadErr;
  const u = authData?.user;
  if (!u) throw new Error('Sign in to remove your profile picture.');

  const { data: profileBefore } = await client
    .from('user_profiles')
    .select('avatar_url')
    .eq('id', u.id)
    .maybeSingle();

  if (!hasCustomAvatarFromSources(profileBefore, u.user_metadata ?? {})) {
    throw new Error('No profile photo to remove.');
  }

  const currentUrl =
    profileBefore?.avatar_url || u.user_metadata?.avatar_url || u.user_metadata?.picture || null;

  try {
    await deleteUserAvatarFiles(client, u.id, typeof currentUrl === 'string' ? currentUrl : null);
  } catch (storageErr) {
    const msg = storageErr instanceof Error ? storageErr.message : '';
    if (/policy|permission|row-level security|not authorized|denied/i.test(msg)) {
      throw new Error(
        'Could not delete the file from storage. In Supabase, run storage-policies.sql so your account can delete files in the avatars bucket.'
      );
    }
    throw storageErr;
  }

  const { error: profileErr } = await client.from('user_profiles').upsert(
    {
      id: u.id,
      username: username || usernameForRow(null, u),
      avatar_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileErr) throw profileErr;

  const { error: metaErr } = await client.auth.updateUser({
    data: {
      ...u.user_metadata,
      avatar_url: null,
      picture: null,
      cavitour_use_default_avatar: true,
    },
  });
  if (metaErr) throw metaErr;
  await client.auth.refreshSession();
  emitAvatarUpdated();
}

export async function uploadUserCover(
  client: SupabaseClient,
  file: { uri: string; mimeType?: string; name?: string } | ArrayBuffer,
  username?: string
): Promise<{ user: User; profileRow: Record<string, unknown> | null; publicUrl: string }> {
  const { data: authData, error: authReadErr } = await client.auth.getUser();
  if (authReadErr) throw authReadErr;
  const u = authData?.user;
  if (!u) throw new Error('Sign in to upload a cover photo.');

  let buffer: ArrayBuffer;
  let mimeType = 'image/jpeg';
  let ext: 'jpg' | 'png' | 'webp' = 'jpg';

  if (file instanceof ArrayBuffer) {
    buffer = file;
  } else {
    buffer = await readLocalImageBytes(file.uri);
    ext = imageExtensionFromUri(file.uri);
    mimeType = imageMimeType(ext, file.mimeType);
  }

  const path = `${u.id}/cover-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const { error: upErr } = await client.storage.from('avatars').upload(path, buffer, {
    upsert: true,
    contentType: mimeType,
    cacheControl: '3600',
  });

  if (upErr) {
    const msg = upErr.message || '';
    if (/policy|permission|row-level security|not authorized|denied/i.test(msg)) {
      throw new Error(
        'Upload blocked by storage rules. In Supabase: create a public "avatars" bucket, then run storage-policies.sql from the project repo (SQL Editor).'
      );
    }
    if (/bucket|not found|does not exist/i.test(msg)) {
      throw new Error(
        'Storage bucket "avatars" is missing. Create it under Storage in the Supabase Dashboard, then apply storage-policies.sql.'
      );
    }
    throw upErr;
  }

  const { data: urlData } = client.storage.from('avatars').getPublicUrl(path);
  const publicUrl = urlData.publicUrl;

  const { error: profileErr } = await client.from('user_profiles').upsert(
    {
      id: u.id,
      username: username || usernameForRow(null, u),
      cover_url: publicUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileErr) {
    if (/cover_url|column|schema cache/i.test(String(profileErr.message ?? ''))) {
      throw new Error(
        'Cover photos are not enabled yet. Run supabase/migrations/20260907140000_user_profile_social_bio.sql in the Supabase SQL Editor.'
      );
    }
    throw profileErr;
  }

  const profileRow = await fetchProfileRow(client, u.id);
  emitCoverUpdated();
  return { user: u, profileRow, publicUrl };
}

export async function removeUserCover(
  client: SupabaseClient,
  username?: string
): Promise<{ user: User; profileRow: Record<string, unknown> | null }> {
  const { data: authData, error: authReadErr } = await client.auth.getUser();
  if (authReadErr) throw authReadErr;
  const u = authData?.user;
  if (!u) throw new Error('Sign in to remove your cover photo.');

  const { data: profileBefore } = await client
    .from('user_profiles')
    .select('cover_url')
    .eq('id', u.id)
    .maybeSingle();
  const currentUrl = String(profileBefore?.cover_url ?? '').trim();
  if (!currentUrl) throw new Error('No cover photo to remove.');

  try {
    await deleteUserAvatarFiles(client, u.id, currentUrl);
  } catch {
    /* best-effort storage cleanup */
  }

  const { error: profileErr } = await client.from('user_profiles').upsert(
    {
      id: u.id,
      username: username || usernameForRow(null, u),
      cover_url: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileErr) throw profileErr;

  const profileRow = await fetchProfileRow(client, u.id);
  emitCoverUpdated();
  return { user: u, profileRow };
}

