import { useEffect, useState } from 'react';

const EXPO_REDIRECT_KEY = 'cavitour_expo_oauth_redirect';

/**
 * After Google → Supabase, lands on the PC web server, then opens Expo Go.
 * Must be reachable at the CURRENT PC LAN IP (not a stale Wi‑Fi address).
 */
export function MobileExpoOAuthBridgePage() {
  const [message, setMessage] = useState('Finishing sign in…');

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const oauthError = search.get('error') || hash.get('error');
    const oauthErrorDescription =
      search.get('error_description') || hash.get('error_description');

    if (oauthError) {
      setMessage(oauthErrorDescription || oauthError);
      return;
    }

    const fromQuery = search.get('expo_redirect');
    if (fromQuery) {
      try {
        sessionStorage.setItem(EXPO_REDIRECT_KEY, fromQuery);
      } catch {
        /* ignore */
      }
    }

    let expoRedirect = fromQuery;
    if (!expoRedirect) {
      try {
        expoRedirect = sessionStorage.getItem(EXPO_REDIRECT_KEY);
      } catch {
        expoRedirect = null;
      }
    }

    if (!expoRedirect) {
      setMessage(
        'Missing return link. From the phone, sign in again with Google while this PC runs: cd apps/web && npm run dev'
      );
      return;
    }

    let target;
    try {
      target = new URL(expoRedirect);
    } catch {
      setMessage('Invalid return link. Sign in again from the mobile app.');
      return;
    }

    const code = search.get('code') || hash.get('code');
    const accessToken = hash.get('access_token') || search.get('access_token');
    const refreshToken = hash.get('refresh_token') || search.get('refresh_token');

    if (code) {
      target.searchParams.set('code', code);
    } else if (accessToken && refreshToken) {
      target.searchParams.set('access_token', accessToken);
      target.searchParams.set('refresh_token', refreshToken);
    } else {
      setMessage('No sign-in code received. Try Google again from the app.');
      return;
    }

    setMessage('Opening Tara, Cavite!…');
    // Small delay so the UI paints, then hand off to Expo Go.
    const t = window.setTimeout(() => {
      window.location.replace(target.toString());
    }, 50);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f0e8] px-4 font-['Poppins',sans-serif]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
        <p className="text-base font-semibold text-neutral-900">Google sign in</p>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <p className="mt-4 text-xs text-neutral-400">If this hangs, close and return to Expo Go.</p>
      </div>
    </div>
  );
}
