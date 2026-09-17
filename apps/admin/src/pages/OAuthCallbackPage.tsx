import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { adminAllowlistHint, isAllowedAdminEmailAsync } from '../lib/adminEmail';
import { completeOAuthFromUrl, urlHasOAuthParams, waitForSupabaseSession } from '../lib/oauthCallback';
import { clearAdminOAuthNextPath, peekAdminOAuthNextPath } from '../lib/startGoogleOAuth';
import { supabase } from '../lib/supabase';
import { useAdminHref } from '../contexts/AdminPathPrefixContext';
import styles from './LoginPage.module.css';

function safeNextPath(raw: string | null) {
  const next = String(raw ?? '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

function friendlyGoogleError(message: string) {
  const text = String(message || '').trim();
  if (/oauth state has expired|flow_state_expired|flow_state_not_found|invalid flow state/i.test(text)) {
    return 'Google sign-in expired. Please try Sign in with Google again.';
  }
  if (/pkce code verifier/i.test(text)) {
    return 'Google sign-in could not finish in this browser tab. Try again from http://localhost:3001/login.';
  }
  return text || 'Google sign in failed';
}

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginHref = '/login';
  const dashboardHref = useAdminHref('/web/dashboard');
  const [statusMessage, setStatusMessage] = useState('Please wait while we complete your sign in.');

  useEffect(() => {
    let active = true;
    const nextPath =
      safeNextPath(searchParams.get('next')) || peekAdminOAuthNextPath() || dashboardHref;

    const finish = async () => {
      let authError: string | null = null;

      try {
        const href = window.location.href;
        if (urlHasOAuthParams(href)) {
          if (active) setStatusMessage('Exchanging the Google security code…');
          await completeOAuthFromUrl(href);
          clearAdminOAuthNextPath();
          document.cookie = 'cavitour_oauth_intent=; path=/; max-age=0; SameSite=Lax';
          const cleanPath = window.location.pathname;
          window.history.replaceState({}, document.title, `${cleanPath}?next=${encodeURIComponent(nextPath)}`);
        }
      } catch (err) {
        authError = friendlyGoogleError(err instanceof Error ? err.message : 'Google sign in failed');
      }

      if (!active) return;

      const goLogin = (message: string) => {
        setStatusMessage(message);
        window.setTimeout(() => {
          if (active) navigate(loginHref, { replace: true, state: { googleError: message } });
        }, 2500);
      };

      if (authError) {
        goLogin(authError);
        return;
      }

      if (active) setStatusMessage('Reading your session…');

      let session = null;
      try {
        session = await waitForSupabaseSession();
      } catch (err) {
        goLogin(err instanceof Error ? err.message : 'Could not read your session.');
        return;
      }

      if (!active) return;

      if (!session) {
        // Be explicit — a missing session here means the code exchange silently
        // failed; a generic "not allowlisted" message would be misleading.
        goLogin('Google finished, but no session was created. Please try again.');
        return;
      }

      const email = session?.user?.email?.trim().toLowerCase() ?? '';
      if (!(await isAllowedAdminEmailAsync(supabase, email))) {
        // Show WHICH account Google actually returned — this exposes wrong-account
        // auto-selection instead of hiding behind a generic allowlist message.
        await supabase.auth.signOut();
        goLogin(
          `Google returned “${email || 'an unknown account'}”, but only ${adminAllowlistHint()} can access the admin app.`
        );
        return;
      }

      if (active) setStatusMessage(`Signed in as ${email}. Opening the dashboard…`);
      navigate(nextPath, { replace: true });
    };

    void finish();
    return () => {
      active = false;
    };
  }, [dashboardHref, loginHref, navigate, searchParams]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.title}>Authenticating with Google</p>
        <p className={styles.hint}>{statusMessage}</p>
      </div>
    </div>
  );
}
