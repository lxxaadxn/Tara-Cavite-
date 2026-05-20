/**
 * Neutral blank profile photo used when a user has not uploaded an avatar.
 * Inline SVG so web and native can use the same asset without extra files.
 */
export const DEFAULT_AVATAR_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="">
  <rect width="64" height="64" fill="#e8ecef"/>
  <circle cx="32" cy="23" r="11" fill="#b8c4ce"/>
  <path fill="#b8c4ce" d="M10 56c3.5-11 11.5-17 22-17s18.5 6 22 17"/>
</svg>`
  );

/** Legacy branded placeholder (pre-blank default); treat as no custom photo. */
const LEGACY_BRANDED_AVATAR_MARKERS = ['%237ea00e', 'fill=\'%237ea00e\'', '>CT<'];

/**
 * @param {string | null | undefined} url
 * @returns {string}
 */
export function resolveAvatarUrl(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return DEFAULT_AVATAR_URL;
  if (LEGACY_BRANDED_AVATAR_MARKERS.some((m) => trimmed.includes(m))) return DEFAULT_AVATAR_URL;
  return trimmed;
}

/**
 * @param {string | null | undefined} url
 * @returns {boolean}
 */
export function hasCustomAvatar(url) {
  const trimmed = String(url ?? '').trim();
  if (!trimmed) return false;
  if (trimmed === DEFAULT_AVATAR_URL) return false;
  if (LEGACY_BRANDED_AVATAR_MARKERS.some((m) => trimmed.includes(m))) return false;
  return true;
}

/** User chose default avatar — ignore OAuth provider photos in metadata. */
export function usesDefaultAvatarPreference(meta) {
  return meta?.cavitour_use_default_avatar === true;
}

/**
 * Raw avatar URL before resolveAvatarUrl.
 * @param {{ avatar_url?: string | null } | null | undefined} profileRow
 * @param {Record<string, unknown> | null | undefined} meta
 */
export function pickRawAvatarUrl(profileRow, meta) {
  const uploaded = profileRow?.avatar_url || null;
  if (usesDefaultAvatarPreference(meta)) {
    return uploaded;
  }
  return uploaded || meta?.avatar_url || meta?.picture || null;
}

/**
 * @param {{ avatar_url?: string | null } | null | undefined} profileRow
 * @param {Record<string, unknown> | null | undefined} meta
 */
export function resolveAvatarFromSources(profileRow, meta) {
  return resolveAvatarUrl(pickRawAvatarUrl(profileRow, meta));
}

/**
 * @param {{ avatar_url?: string | null } | null | undefined} profileRow
 * @param {Record<string, unknown> | null | undefined} meta
 */
export function hasCustomAvatarFromSources(profileRow, meta) {
  return hasCustomAvatar(pickRawAvatarUrl(profileRow, meta));
}
