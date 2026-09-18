/**
 * Password-recovery link handling, mirrored from apps/web/src/lib/passwordRecovery.js
 * so the admin app completes recovery links exactly like the web app does.
 */
import type { Session, SupabaseClient } from '@supabase/supabase-js';

/** Password-recovery params from an email link (PKCE `code` or implicit hash). */
export function getPasswordRecoveryParams(
  href: string = typeof window !== 'undefined' ? window.location.href : ''
): URLSearchParams {
  const merged = new URLSearchParams();
  const hashIdx = href.indexOf('#');
  const base = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const queryIdx = base.indexOf('?');
  if (queryIdx >= 0) {
    new URLSearchParams(base.slice(queryIdx + 1)).forEach((v, k) => {
      merged.append(k, v);
    });
  }
  if (hashIdx >= 0) {
    new URLSearchParams(href.slice(hashIdx + 1)).forEach((v, k) => {
      merged.append(k, v);
    });
  }
  return merged;
}

/** True when Supabase stored a PKCE verifier marked for password recovery. */
export function storedVerifierLooksLikeRecovery(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key || !key.includes('code-verifier')) continue;
      const val = localStorage.getItem(key) || '';
      if (val.includes('/PASSWORD_RECOVERY')) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Detect password-recovery links without stealing Google OAuth `?code=` callbacks.
 * OAuth returns to `/auth/callback`; recovery should use `/auth/reset-password`
 * (or the Site URL `/` with a recovery verifier).
 */
export function urlLooksLikePasswordRecovery(
  href: string = typeof window !== 'undefined' ? window.location.href : ''
): boolean {
  const params = getPasswordRecoveryParams(href);
  if ((params.get('type') || '').toLowerCase() === 'invite') return false;
  if ((params.get('type') || '').toLowerCase() === 'recovery') return true;
  if (params.get('access_token') && params.get('type') === 'recovery') return true;
  if (params.get('code') && /reset-password/i.test(href)) return true;

  // Site URL fallback: `/` with only `?code=` — treat as recovery only if the stored verifier says so.
  try {
    const path = new URL(href).pathname.replace(/\/+$/, '') || '/';
    if ((path === '/' || path === '') && params.get('code')) {
      return storedVerifierLooksLikeRecovery();
    }
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Exchange recovery link params for a session so the user can set a password.
 * Mirrors the web app's completePasswordRecoveryFromUrl.
 */
export async function completePasswordRecoveryFromUrl(
  client: SupabaseClient,
  href: string = window.location.href
): Promise<Session | null> {
  const params = getPasswordRecoveryParams(href);
  const err = params.get('error');
  if (err) {
    throw new Error(params.get('error_description') || err);
  }

  const code = params.get('code');
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) {
      const { data } = await client.auth.getSession();
      if (data.session) return data.session;
      throw error;
    }
    const { data } = await client.auth.getSession();
    return data.session;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = (params.get('type') || '').toLowerCase();
  if (
    (type === 'recovery' || type === 'invite' || type === 'signup' || type === 'magiclink') &&
    accessToken &&
    refreshToken
  ) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    const { data } = await client.auth.getSession();
    return data.session;
  }

  const { data } = await client.auth.getSession();
  return data.session;
}

export function stripAuthParamsFromUrl(pathname = '/auth/reset-password'): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, pathname);
}
