import type { SupabaseClient } from '@supabase/supabase-js';

/** Merge query string and hash fragment into one param map (Supabase uses either PKCE `code` or implicit tokens). */
function parseAuthParams(url: string): URLSearchParams {
  const merged = new URLSearchParams();
  const hashIdx = url.indexOf('#');
  const base = hashIdx >= 0 ? url.slice(0, hashIdx) : url;
  const queryIdx = base.indexOf('?');
  if (queryIdx >= 0) {
    new URLSearchParams(base.slice(queryIdx + 1)).forEach((v, k) => merged.append(k, v));
  }
  if (hashIdx >= 0) {
    new URLSearchParams(url.slice(hashIdx + 1)).forEach((v, k) => merged.set(k, v));
  }
  return merged;
}

/** Must match `Linking.createURL('reset-password')` path (Expo uses e.g. /--/reset-password). */
function isResetPasswordDeepLink(url: string): boolean {
  return /reset-password/i.test(url);
}

/**
 * True if this deep link is our password reset return URL (not OAuth).
 * Supabase may use PKCE (`?code=`) or implicit hash (`#access_token=...&type=recovery`).
 */
export function isPasswordRecoveryUrl(url: string): boolean {
  if (!isResetPasswordDeepLink(url)) {
    return false;
  }
  const p = parseAuthParams(url);
  if (p.get('code')) {
    return true;
  }
  return p.get('type') === 'recovery' && Boolean(p.get('access_token')) && Boolean(p.get('refresh_token'));
}

export async function applyPasswordRecoveryFromUrl(
  supabase: SupabaseClient,
  url: string,
): Promise<boolean> {
  if (!isPasswordRecoveryUrl(url)) {
    return false;
  }
  const p = parseAuthParams(url);
  const code = p.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error && __DEV__) {
      console.warn('[authRecoveryDeepLink] exchangeCodeForSession:', error.message);
    }
    return !error;
  }
  const access_token = p.get('access_token') ?? '';
  const refresh_token = p.get('refresh_token') ?? '';
  if (p.get('type') === 'recovery' && access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error && __DEV__) {
      console.warn('[authRecoveryDeepLink] setSession:', error.message);
    }
    return !error;
  }
  return false;
}
