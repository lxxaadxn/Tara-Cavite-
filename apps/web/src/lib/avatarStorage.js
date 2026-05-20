/**
 * @param {string | null | undefined} publicUrl
 * @returns {string | null} Storage object path inside the avatars bucket
 */
export function avatarObjectPathFromPublicUrl(publicUrl) {
  const raw = String(publicUrl ?? '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/(.+)$/i);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Delete uploaded avatar file(s) for a user from the avatars bucket.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function deleteUserAvatarFiles(supabase, userId, currentPublicUrl) {
  const uid = String(userId ?? '').trim();
  if (!uid) return;

  const paths = new Set();
  const fromUrl = avatarObjectPathFromPublicUrl(currentPublicUrl);
  if (fromUrl) paths.add(fromUrl);

  const { data: listed, error: listErr } = await supabase.storage.from('avatars').list(uid, { limit: 100 });
  if (listErr) {
    if (/not found|does not exist/i.test(listErr.message || '')) {
      if (paths.size === 0) return;
    } else if (paths.size === 0) {
      throw listErr;
    }
  } else {
    for (const item of listed ?? []) {
      if (item?.name) paths.add(`${uid}/${item.name}`);
    }
  }

  if (paths.size === 0) return;

  const { error: delErr } = await supabase.storage.from('avatars').remove([...paths]);
  if (delErr) throw delErr;
}
