import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  completeOAuthFromUrl,
  isStaleOAuthStateError,
  urlHasOAuthParams,
  waitForSupabaseSession,
} from '../lib/oauthCallback';
import { supabase } from '../lib/supabase';
import { isAdminReservedEmailAsync } from '../lib/adminReservedEmail';
import { markLocationPromptPending } from '../lib/promptLocationOnLogin';
import { TRAVELER_ACCOUNT_DISABLED_MESSAGE } from 'cavitour-shared/accountStatus';
import { rejectDisabledTraveler } from '../lib/rejectDisabledTraveler';
import { resolveAccountHome } from '../lib/accountHome';
import { clearOAuthNextPath, peekOAuthNextPath, startGoogleOAuth } from '../lib/startGoogleOAuth';

/** Guards the one automatic restart so a broken redirect config cannot loop. */
const OAUTH_RESTARTED_KEY = 'cavitour.oauth.restarted';

function oauthRestartUsed() {
  try {
    return sessionStorage.getItem(OAUTH_RESTARTED_KEY) === '1';
  } catch {
    return true;
  }
}

function setOAuthRestartUsed(used) {
  try {
    if (used) sessionStorage.setItem(OAUTH_RESTARTED_KEY, '1');
    else sessionStorage.removeItem(OAUTH_RESTARTED_KEY);
  } catch {
    /* ignore */
  }
}

function safeNextPath(raw) {
  const next = String(raw ?? '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

function friendlyGoogleError(message) {
  const text = String(message || '').trim();
  if (isStaleOAuthStateError(text)) {
    return 'Google sign-in could not be completed on this browser. Tap “Sign in with Google” to try again.';
  }
  return text || 'Google sign in failed';
}

/** Finishes Google (and other Supabase OAuth) redirects on the web app. */
export function OAuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [statusMessage, setStatusMessage] = useState('Please wait while we complete your sign in.');

  useEffect(() => {
    let active = true;
    const nextPath = safeNextPath(searchParams.get('next')) || peekOAuthNextPath();

    const finish = async () => {
      const href = window.location.href;
      let authError = null;
      let staleState = false;

      try {
        if (urlHasOAuthParams(href)) {
          await completeOAuthFromUrl(href);
          clearOAuthNextPath();
          setOAuthRestartUsed(false);
          const cleanPath = window.location.pathname;
          const cleanSearch = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
          window.history.replaceState({}, document.title, `${cleanPath}${cleanSearch}`);
        }
      } catch (err) {
        const raw = err instanceof Error ? err.message : 'Google sign in failed';
        staleState = isStaleOAuthStateError(raw);
        authError = friendlyGoogleError(raw);
      }

      if (!active) return;

      // The security code that pairs this browser with Google is missing or spent —
      // usually a reused link or a stale tab. One fresh round trip fixes it.
      if (staleState && !oauthRestartUsed()) {
        setOAuthRestartUsed(true);
        setStatusMessage('Restarting Google sign-in…');
        try {
          await startGoogleOAuth({ next: nextPath });
          return;
        } catch {
          /* fall through to the error message below */
        }
      }

      if (authError) {
        setStatusMessage(authError);
        window.setTimeout(() => {
          if (active) {
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
      const isAdmin = Boolean(email && (await isAdminReservedEmailAsync(email)));

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
