import { supabase } from './supabase';

/** Dedupe PKCE exchanges (React Strict Mode remounts + double navigations). */
const exchangeByCode = new Map<string, Promise<void>>();

function parseAuthParams(url: string) {
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

export function urlHasOAuthParams(href: string) {
  return /[?&#](code|access_token|error)=/.test(href);
}

function isRecoverableOAuthExchangeError(message: string) {
  return /oauth state has expired|flow_state_expired|flow_state_not_found|already been used|invalid flow state|code verifier/i.test(
    message || ''
  );
}

/** Match the web app's `isStaleOAuthStateError` naming for shared semantics. */
export function isStaleOAuthStateError(message: string): boolean {
  return isRecoverableOAuthExchangeError(message);
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

async function exchangeCodeOnce(code: string) {
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

export async function completeOAuthFromUrl(href: string) {
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
    if (error) throw error;
  }
}

export async function waitForSupabaseSession(maxAttempts = 25, delayMs = 120) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (data.session) return data.session;
    await new Promise((resolve) => {
      window.setTimeout(resolve, delayMs);
    });
  }
  return null;
}
