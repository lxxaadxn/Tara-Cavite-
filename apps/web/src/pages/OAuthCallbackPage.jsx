import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  completeOAuthFromUrl,
  urlHasOAuthParams,
  waitForSupabaseSession,
} from '../lib/oauthCallback';
import { supabase } from '../lib/supabase';
import { isAdminReservedEmail } from '../lib/adminReservedEmail';
import { markLocationPromptPending } from '../lib/promptLocationOnLogin';
import { TRAVELER_ACCOUNT_DISABLED_MESSAGE } from 'cavitour-shared/accountStatus';
import { rejectDisabledTraveler } from '../lib/rejectDisabledTraveler';
import { resolveAccountHome } from '../lib/accountHome';

function safeNextPath(raw) {
  const next = String(raw ?? '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

/** Finishes Google (and other Supabase OAuth) redirects on the web app. */
export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Please wait while we complete your sign in.');

  useEffect(() => {
    let active = true;
    const nextPath = safeNextPath(searchParams.get('next'));

    const finish = async () => {
      let authError = null;

      try {
        const href = window.location.href;
        if (urlHasOAuthParams(href)) {
          await completeOAuthFromUrl(href);
          const cleanPath = window.location.pathname;
          const cleanSearch = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
          window.history.replaceState({}, document.title, `${cleanPath}${cleanSearch}`);
        }
      } catch (err) {
        authError = err instanceof Error ? err.message : 'Google sign in failed';
      }

      if (!active) return;

      if (authError) {
        setStatusMessage(authError);
        window.setTimeout(() => {
          if (active) {
            const next = safeNextPath(searchParams.get('next'));
            const loginPath = '/login';
            navigate(loginPath, { replace: true, state: { googleError: authError } });
          }
        }, 2200);
        return;
      }

      let session = null;
      try {
        session = await waitForSupabaseSession();
      } catch (err) {
        setStatusMessage(err instanceof Error ? err.message : 'Could not read your session.');
        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true });
        }, 2200);
        return;
      }

      if (!active) return;

      const email = session?.user?.email?.trim().toLowerCase() ?? '';
      const wantsAdmin = Boolean(nextPath?.startsWith('/admin'));
      const isAdmin = Boolean(email && isAdminReservedEmail(email));

      if (!session) {
        setStatusMessage('Sign in did not complete. Try again.');
        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true });
        }, 2200);
        return;
      }

      if (wantsAdmin && !isAdmin) {
        await supabase.auth.signOut();
        const msg = 'Only the admin Google account can access the admin app.';
        setStatusMessage(msg);
        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true, state: { googleError: msg } });
        }, 2200);
        return;
      }

      if (!isAdmin) {
        const allowed = await rejectDisabledTraveler(session);
        if (!allowed) {
          setStatusMessage(TRAVELER_ACCOUNT_DISABLED_MESSAGE);
          window.setTimeout(() => {
            if (active) {
              navigate('/login', { replace: true, state: { accountDisabled: true } });
            }
          }, 2200);
          return;
        }
      }

      const home = await resolveAccountHome(supabase, session, nextPath);
      if (home.blocked) {
        await supabase.auth.signOut();
        setStatusMessage(home.message || TRAVELER_ACCOUNT_DISABLED_MESSAGE);
        window.setTimeout(() => {
          if (active) navigate('/login', { replace: true, state: { accountDisabled: true } });
        }, 2200);
        return;
      }
      if (!String(home.path).startsWith('/establishment') && !isAdmin) {
        markLocationPromptPending(session.user?.id);
      }
      navigate(home.path, { replace: true });
    };

    void finish();

    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ct-cream)] px-4 font-['Poppins',sans-serif]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-neutral-300 border-t-[var(--ct-teal)]" />
        <p className="text-base font-semibold text-neutral-900">Authenticating with Google</p>
        <p className="mt-1 text-sm text-neutral-600">{statusMessage}</p>
      </div>
    </div>
  );
}

/** @deprecated Use OAuthCallbackPage — kept for older redirect URLs in Supabase. */
export const GoogleAuthProcessingPage = OAuthCallbackPage;
