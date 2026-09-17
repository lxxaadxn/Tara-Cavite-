import { supabase } from './supabase';

const OAUTH_INTENT_COOKIE = 'cavitour_oauth_intent';
const OAUTH_NEXT_KEY = 'cavitour.oauth.next';

/** Shared across localhost ports so :5173 can forward orphaned admin OAuth codes. */
function markAdminOAuthIntent() {
  document.cookie = `${OAUTH_INTENT_COOKIE}=admin; path=/; max-age=600; SameSite=Lax`;
}

/** Always use localhost in local dev so Supabase Redirect URLs + PKCE stay on :3001. */
function oauthOrigin(): string {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001';
  }
  const { protocol, hostname, port } = window.location;
  const isPrivateLan =
    /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) || hostname === '0.0.0.0';
  const host = isPrivateLan || hostname === '127.0.0.1' ? 'localhost' : hostname;
  const portPart = port ? `:${port}` : '';
  return `${protocol}//${host}${portPart}`;
}

/**
 * Start Google OAuth and send the browser to Google's consent screen.
 * `next` is the in-app path after success (`/web/dashboard`).
 */
export async function startAdminGoogleOAuth(next: string) {
  if (import.meta.env.DEV && window.location.hostname === '127.0.0.1') {
    const port = window.location.port || '3001';
    try {
      sessionStorage.setItem('cavitour.oauth.pendingGoogle', '1');
      if (next.startsWith('/') && !next.startsWith('//')) {
        sessionStorage.setItem(OAUTH_NEXT_KEY, next);
      }
    } catch {
      /* ignore */
    }
    window.location.replace(
      `http://localhost:${port}${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    return;
  }

  const origin = oauthOrigin();
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/web/dashboard';
  try {
    sessionStorage.setItem(OAUTH_NEXT_KEY, safeNext);
  } catch {
    /* ignore */
  }
  markAdminOAuthIntent();

  // Include next in redirectTo (also mirrored in sessionStorage). Keep this URL
  // allowlisted in Supabase Auth → Redirect URLs:
  //   http://localhost:3001/auth/callback**
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      // Always show Google's account chooser — otherwise Google auto-selects the
      // browser's signed-in account, which may not be an allowlisted admin.
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Unable to start Google sign in.');

  window.location.assign(data.url);
}

export function peekAdminOAuthNextPath(): string | null {
  try {
    const next = sessionStorage.getItem(OAUTH_NEXT_KEY);
    return next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  } catch {
    return null;
  }
}

export function clearAdminOAuthNextPath() {
  try {
    sessionStorage.removeItem(OAUTH_NEXT_KEY);
  } catch {
    /* ignore */
  }
}

export function consumePendingAdminGoogleOAuth() {
  try {
    if (sessionStorage.getItem('cavitour.oauth.pendingGoogle') !== '1') return false;
    sessionStorage.removeItem('cavitour.oauth.pendingGoogle');
    return true;
  } catch {
    return false;
  }
}
