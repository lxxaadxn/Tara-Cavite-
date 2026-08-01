import { supabase } from './supabase';

const DEFAULT_CALLBACK_PATH = '/auth/callback';

/**
 * Start Google OAuth and navigate the browser to Google's consent screen.
 * @param {Object} [options]
 * @param {string} [options.callbackPath] Path on this origin for Supabase redirect.
 * @param {string | null} [options.next] In-app path after success (`/search`, etc.).
 */
export async function startGoogleOAuth({ callbackPath = DEFAULT_CALLBACK_PATH, next = null } = {}) {
  const origin = window.location.origin;
  const nextQuery =
    next && next.startsWith('/') && !next.startsWith('//')
      ? `?next=${encodeURIComponent(next)}`
      : '';
  const redirectTo = `${origin}${callbackPath}${nextQuery}`;

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
