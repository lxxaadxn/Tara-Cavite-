import { supabase } from './supabase';

/** Merge query string and hash fragment (Supabase PKCE `code` or implicit tokens). */
export function parseAuthParams(url) {
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

export function urlHasOAuthParams(href) {
  return /[?&#](code|access_token|error)=/.test(href);
}

/**
 * Exchange Google OAuth redirect params for a Supabase session (web SPA).
 * @param {string} href Full callback URL (location.href).
 */
export async function completeOAuthFromUrl(href) {
  const params = parseAuthParams(href);
  const oauthError = params.get('error');
  const oauthErrorDescription = params.get('error_description');
  if (oauthError) {
    throw new Error(oauthErrorDescription || oauthError);
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        return;
      }
      throw error;
    }
    return;
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      throw error;
    }
    return;
  }

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session) {
    return;
  }
}

/** Wait briefly for Supabase to persist the session after code exchange. */
export async function waitForSupabaseSession(maxAttempts = 25, delayMs = 120) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    if (data.session) {
      return data.session;
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
    });
  }
  return null;
}
