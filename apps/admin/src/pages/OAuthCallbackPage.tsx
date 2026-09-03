import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ADMIN_ALLOWED_EMAIL, isAllowedAdminEmail } from '../lib/adminEmail';
import { completeOAuthFromUrl, urlHasOAuthParams, waitForSupabaseSession } from '../lib/oauthCallback';
import { supabase } from '../lib/supabase';
import { useAdminHref } from '../contexts/AdminPathPrefixContext';
import styles from './LoginPage.module.css';

function safeNextPath(raw: string | null) {
  const next = String(raw ?? '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const loginHref = '/login';
  const dashboardHref = useAdminHref('/web/dashboard');
  const [statusMessage, setStatusMessage] = useState('Please wait while we complete your sign in.');

  useEffect(() => {
    let active = true;
    const nextPath = safeNextPath(searchParams.get('next')) || dashboardHref;

    const finish = async () => {
      let authError: string | null = null;

      try {
        const href = window.location.href;
        if (urlHasOAuthParams(href)) {
          await completeOAuthFromUrl(href);
          const cleanPath = window.location.pathname;
          window.history.replaceState({}, document.title, `${cleanPath}?next=${encodeURIComponent(nextPath)}`);
        }
      } catch (err) {
        authError = err instanceof Error ? err.message : 'Google sign in failed';
      }

      if (!active) return;

      const goLogin = (message: string) => {
        setStatusMessage(message);
        window.setTimeout(() => {
          if (active) navigate(loginHref, { replace: true, state: { googleError: message } });
        }, 1600);
      };

      if (authError) {
        goLogin(authError);
        return;
      }

      let session = null;
      try {
        session = await waitForSupabaseSession();
      } catch (err) {
        goLogin(err instanceof Error ? err.message : 'Could not read your session.');
        return;
      }

      if (!active) return;

      const email = session?.user?.email?.trim().toLowerCase() ?? '';
      if (!session || !isAllowedAdminEmail(email)) {
        await supabase.auth.signOut();
        goLogin(`Only ${ADMIN_ALLOWED_EMAIL} can access the admin app.`);
        return;
      }

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
