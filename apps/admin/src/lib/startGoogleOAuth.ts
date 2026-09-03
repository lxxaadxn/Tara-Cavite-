import { supabase } from './supabase';

/**
 * Start Google OAuth and send the browser to Google's consent screen.
 * `next` is the in-app path after success (`/admin/web/dashboard` or `/web/dashboard`).
 */
export async function startAdminGoogleOAuth(next: string) {
  const origin = window.location.origin;
  const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/web/dashboard';
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) throw error;
  if (!data?.url) throw new Error('Unable to start Google sign in.');

  window.location.assign(data.url);
}
