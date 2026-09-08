import { supabase } from './supabase';

/** Dedupe PKCE exchanges (React Strict Mode remounts + double navigations). */
const exchangeByCode = new Map();

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

/** Supabase wording varies ("state not found or expired", "flow_state_not_found", PKCE mismatch). */
export function isStaleOAuthStateError(message) {
  return /oauth state|flow_state|invalid flow state|code verifier|code_verifier|pkce/i.test(String(message || ''));
}

function isRecoverableOAuthExchangeError(message) {
  return isStaleOAuthStateError(message) || /already been used/i.test(String(message || ''));
}

async function waitForExistingSession(attempts = 10, delayMs = 60) {
  for (let i = 0; i < attempts; i += 1) {
    const { data } = await supabase.auth.getSession();
    if (data.session) return data.session;
    await new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
    });
  }
  return null;
}

async function exchangeCodeOnce(code) {
  const cached = exchangeByCode.get(code);
  if (cached) return cached;

  const task = (async () => {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return;

    const session = await waitForExistingSession();
    if (session) return;

    if (isRecoverableOAuthExchangeError(error.message)) {
      const retrySession = await waitForExistingSession(15, 80);
      if (retrySession) return;
    }
    throw error;
  })();

  exchangeByCode.set(code, task);
  try {
    await task;
  } catch (err) {
    exchangeByCode.delete(code);
    throw err;
  }
  return task;
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
    const detail = oauthErrorDescription || oauthError;
    if (isRecoverableOAuthExchangeError(detail)) {
      const session = await waitForExistingSession();
      if (session) return;
    }
    throw new Error(detail);
  }

  const code = params.get('code');
  if (code) {
    await exchangeCodeOnce(code);
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
