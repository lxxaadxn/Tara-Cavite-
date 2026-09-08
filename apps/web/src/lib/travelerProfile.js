import {
  hasCustomAvatarFromSources,
  resolveAvatarFromSources,
} from 'cavitour-shared/defaultAvatar';
import { changePasswordWithSupabase } from 'cavitour-shared/changePassword';
import { deleteUserAvatarFiles } from './avatarStorage';
import { isItinerarySavedItem } from './savedPlaces';
import {
  BIO_MAX_LENGTH,
  normalizeInterestTags,
  normalizeSocialUrl,
} from './travelerInterests';

export const AVATAR_UPDATED_EVENT = 'cavitour:avatar-updated';
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const PROFILE_SELECT =
  'username, avatar_url, city, phone, birthday, bio, interest_tags, cover_url, social_instagram, social_facebook, social_tiktok';
const PROFILE_SELECT_FALLBACK = 'username, avatar_url, city, phone';

export function dateOnly(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return raw.slice(0, 10);
}

export function displayBirthday(value) {
  const iso = dateOnly(value);
  if (!iso) return '';
  const dt = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function deriveProfile(user, profileRow) {
  const meta = user?.user_metadata ?? {};
  const nickname =
    profileRow?.username ||
    meta.nickname ||
    meta.username ||
    (user?.email ? user.email.split('@')[0] : '');
  const fullName =
    meta.full_name ||
    meta.name ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    nickname ||
    (user?.email ? user.email.split('@')[0] : 'Tara, Cavite! User');
  const created = user?.created_at ? new Date(user.created_at) : null;
  const daysOnPlatform = created ? Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000)) : 0;
  return {
    name: fullName,
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
    avatarUrl: resolveAvatarFromSources(profileRow, meta),
    hasCustomPhoto: hasCustomAvatarFromSources(profileRow, meta),
  };
}

export async function fetchProfileRow(client, userId) {
  const full = await client.from('user_profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle();
  if (!full.error) return full.data ?? null;
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
    if (!mid.error) return mid.data ?? null;
    const retry = await client.from('user_profiles').select(PROFILE_SELECT_FALLBACK).eq('id', userId).maybeSingle();
    return retry.data ?? null;
  }
  return null;
}

export function countSavedPlaces(lists) {
  const seen = new Set();
  let count = 0;
  for (const list of lists ?? []) {
    for (const item of list.items ?? []) {
      if (isItinerarySavedItem(item)) continue;
      const id = String(item.id ?? '');
      if (!id || seen.has(id)) continue;
      seen.add(id);
      count += 1;
    }
  }
  return count;
}

export function usernameForRow(profile, user) {
  return (
    String(profile?.nickname ?? '').trim() ||
    String(profile?.name ?? '').trim() ||
    user?.user_metadata?.nickname ||
    user?.user_metadata?.username ||
    (user?.email ? user.email.split('@')[0] : 'User')
  );
}

/**
 * Saves identity + preference fields (not password).
 * @returns {{ profileRow: object | null, user: object, emailChangePending: boolean, birthdaySkipped: boolean }}
 */
export async function saveProfileIdentity(
  client,
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
  }
) {
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
      { emailRedirectTo: `${window.location.origin}/profile` }
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
    data: { ...u.user_metadata, username: nick, nickname: nick },
  });

  const profileRow = await fetchProfileRow(client, u.id);
  const { data: refreshed } = await client.auth.getUser();
  return { profileRow, user: refreshed?.user ?? u, emailChangePending, birthdaySkipped };
}

export function assertAvatarFile(file) {
  if (!file) return;
  if (file.size > AVATAR_MAX_BYTES) {
    throw new Error('Please choose an image under 5 MB.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
}

async function uploadProfileImage(client, file, { pathPrefix, column }) {
  assertAvatarFile(file);
  const { data: authData, error: authReadErr } = await client.auth.getUser();
  if (authReadErr) throw authReadErr;
  const u = authData?.user;
  if (!u) throw new Error('Sign in to upload an image.');

  const rawExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
  const safeExt = ['jpg', 'png', 'webp'].includes(rawExt) ? rawExt : 'jpg';
  const mime =
    file.type && file.type.startsWith('image/')
      ? file.type
      : safeExt === 'png'
        ? 'image/png'
        : safeExt === 'webp'
          ? 'image/webp'
          : 'image/jpeg';

  const path = `${u.id}/${pathPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${safeExt}`;
  const { error: upErr } = await client.storage.from('avatars').upload(path, file, {
    upsert: true,
    contentType: mime,
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
        'Storage bucket "avatars" is missing. Create it under Storage in the Supabase Dashboard, mark it public if you use public URLs, then apply storage-policies.sql.'
      );
    }
    throw upErr;
  }

  const { data: urlData } = client.storage.from('avatars').getPublicUrl(path);
  return { user: u, publicUrl: urlData.publicUrl, column };
}

export async function uploadUserAvatar(client, file, username) {
  const { user: u, publicUrl } = await uploadProfileImage(client, file, {
    pathPrefix: 'avatar',
    column: 'avatar_url',
  });

  const { error: profileErr } = await client.from('user_profiles').upsert(
    {
      id: u.id,
      username: username || usernameForRow(null, u),
      avatar_url: publicUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
  if (profileErr) throw profileErr;

  const { error: metaErr } = await client.auth.updateUser({
    data: {
      ...u.user_metadata,
      avatar_url: publicUrl,
      picture: publicUrl,
      cavitour_use_default_avatar: false,
    },
  });
  if (metaErr) throw metaErr;

  await client.auth.refreshSession();
  const { data: refreshed } = await client.auth.getUser();
  const sessionUser = refreshed?.user ?? u;
  const profileRow = await fetchProfileRow(client, u.id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT));
  }
  return { user: sessionUser, profileRow };
}

export async function uploadUserCover(client, file, username) {
  const { user: u, publicUrl } = await uploadProfileImage(client, file, {
    pathPrefix: 'cover',
    column: 'cover_url',
  });

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
  return { user: u, profileRow };
}

export async function removeUserCover(client, username) {
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
  return { user: u, profileRow };
}

export async function canRemoveAvatar(client) {
  const { data } = await client.auth.getUser();
  const u = data?.user;
  if (!u) return false;
  const { data: profileRow } = await client.from('user_profiles').select('avatar_url').eq('id', u.id).maybeSingle();
  return hasCustomAvatarFromSources(profileRow, u.user_metadata ?? {});
}

export async function removeUserAvatar(client, username) {
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
  const { data: refreshed } = await client.auth.getUser();
  const sessionUser = refreshed?.user ?? u;
  const profileRow = await fetchProfileRow(client, u.id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AVATAR_UPDATED_EVENT));
  }
  return { user: sessionUser, profileRow };
}

export async function updateAccountPassword(client, { currentPassword, newPassword, confirmPassword }) {
  const { data: authData } = await client.auth.getUser();
  const u = authData?.user;
  if (!u?.email) {
    throw new Error('Sign in with an email account to change your password.');
  }
  await changePasswordWithSupabase(client, {
    email: u.email,
    currentPassword,
    newPassword,
    confirmPassword,
  });
}

export async function deleteOwnAccount(client) {
  const { data: authData, error: authReadErr } = await client.auth.getUser();
  if (authReadErr) throw authReadErr;
  if (!authData?.user) throw new Error('Sign in to delete your account.');

  const { error: rpcErr } = await client.rpc('delete_own_account');
  if (rpcErr) {
    const msg = rpcErr.message || '';
    if (/function.*does not exist|could not find/i.test(msg)) {
      throw new Error(
        'Account deletion is not enabled yet. Run the migration supabase/migrations/20260520140000_delete_own_account.sql in the Supabase SQL Editor.'
      );
    }
    throw rpcErr;
  }

  try {
    await deleteUserAvatarFiles(client, authData.user.id, null);
  } catch {
    /* storage cleanup is best-effort after the account row is gone */
  }

  await client.auth.signOut();
}
