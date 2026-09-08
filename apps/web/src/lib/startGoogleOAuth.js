import { supabase } from './supabase';

const DEFAULT_CALLBACK_PATH = '/auth/callback';
const OAUTH_NEXT_KEY = 'cavitour.oauth.next';
const OAUTH_PENDING_KEY = 'cavitour.oauth.pendingGoogle';

export function peekOAuthNextPath() {
  try {
    const next = sessionStorage.getItem(OAUTH_NEXT_KEY);
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  } catch {
    return null;
  }
}

export function clearOAuthNextPath() {
  try {
    sessionStorage.removeItem(OAUTH_NEXT_KEY);
  } catch {
    /* ignore */
  }
}

/** After a localhost bounce, continue Google sign-in once. */
export function consumePendingGoogleOAuth() {
  try {
    if (sessionStorage.getItem(OAUTH_PENDING_KEY) !== '1') return false;
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * PKCE verifiers are origin-scoped. In local dev, bounce 127.0.0.1 / LAN hosts to
 * localhost so the redirect URL matches where the verifier is stored.
 * @returns {boolean} true if a navigation was started
 */
function bounceToLocalhostForOAuth(next) {
  if (!import.meta.env.DEV) return false;
  const { protocol, hostname, port, pathname, search, hash } = window.location;
  const isPrivateLan =
    /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) || hostname === '0.0.0.0';
  if (hostname !== '127.0.0.1' && !isPrivateLan) return false;

  try {
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      sessionStorage.setItem(OAUTH_NEXT_KEY, next);
    }
    sessionStorage.setItem(OAUTH_PENDING_KEY, '1');
  } catch {
    /* ignore */
  }

  const portPart = port ? `:${port}` : '';
  window.location.replace(`http://localhost${portPart}${pathname}${search}${hash}`);
  return true;
}

/** Prefer localhost over LAN IPs so OAuth returns to an allowlisted Redirect URL. */
function oauthOrigin() {
  if (import.meta.env.DEV) {
    const port = window.location.port || '5173';
    return `http://localhost:${port}`;
  }
  const { protocol, hostname, port } = window.location;
  const isPrivateLan =
    /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) || hostname === '0.0.0.0';
  const host = isPrivateLan || hostname === '127.0.0.1' ? 'localhost' : hostname;
  const portPart = port ? `:${port}` : '';
  return `${protocol}//${host}${portPart}`;
}

/**
 * Start Google OAuth and navigate the browser to Google's consent screen.
 * @param {Object} [options]
 * @param {string} [options.callbackPath] Path on this origin for Supabase redirect.
 * @param {string | null} [options.next] In-app path after success (`/search`, etc.).
 */
export async function startGoogleOAuth({ callbackPath = DEFAULT_CALLBACK_PATH, next = null } = {}) {
  if (bounceToLocalhostForOAuth(next)) return;

  const origin = oauthOrigin();
  // Keep redirectTo free of query params so Supabase Redirect URL allowlists match exactly.
  try {
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      sessionStorage.setItem(OAUTH_NEXT_KEY, next);
    } else {
      sessionStorage.removeItem(OAUTH_NEXT_KEY);
    }
  } catch {
    /* ignore */
  }

  const redirectTo = `${origin}${callbackPath}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }
  if (!data?.url) {
    throw new Error('Unable to start Google sign in.');
  }

  window.location.assign(data.url);
}
