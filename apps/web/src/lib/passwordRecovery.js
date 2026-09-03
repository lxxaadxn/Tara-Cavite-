import { parseAuthParams } from './oauthCallback';

/** Password-recovery params from email link (PKCE `code` or implicit hash). */
export function getPasswordRecoveryParams(href = typeof window !== 'undefined' ? window.location.href : '') {
  return parseAuthParams(href);
}

/** True when Supabase stored a PKCE verifier marked for password recovery. */
export function storedVerifierLooksLikeRecovery() {
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

export function urlLooksLikeInvite(href = typeof window !== 'undefined' ? window.location.href : '') {
  const params = getPasswordRecoveryParams(href);
  if ((params.get('type') || '').toLowerCase() === 'invite') return true;
  try {
    const path = new URL(href).pathname.replace(/\/+$/, '') || '/';
    if (path === '/establishment/setup' && (params.get('code') || params.get('access_token'))) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Detect password-recovery links without stealing Google OAuth `?code=` callbacks.
 * OAuth returns to `/auth/callback`; recovery should use `/reset-password` (or Site URL `/` with a recovery verifier).
 */
export function urlLooksLikePasswordRecovery(href = typeof window !== 'undefined' ? window.location.href : '') {
  if (urlLooksLikeInvite(href)) return false;
  const params = getPasswordRecoveryParams(href);
  if (params.get('type') === 'recovery') return true;
  if (params.get('access_token') && params.get('type') === 'recovery') return true;
  if (params.get('code') && /reset-password/i.test(href)) return true;

  // Site URL fallback: `/` with only `?code=` — only treat as recovery if the stored verifier says so.
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
 * Exchange recovery or invite link params for a session so the user can set a password.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} [href]
 */
export async function completePasswordRecoveryFromUrl(supabase, href = window.location.href) {
  const params = getPasswordRecoveryParams(href);
  const err = params.get('error');
  if (err) {
    throw new Error(params.get('error_description') || err);
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return data.session;
      throw error;
    }
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const type = (params.get('type') || '').toLowerCase();
  if ((type === 'recovery' || type === 'invite' || type === 'signup' || type === 'magiclink') && accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    const { data } = await supabase.auth.getSession();
    return data.session;
  }

  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function stripAuthParamsFromUrl(pathname = '/reset-password') {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, pathname);
}
