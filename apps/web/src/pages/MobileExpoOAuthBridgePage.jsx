import { useEffect, useState } from 'react';

/**
 * Supabase OAuth return page for Expo Go on a physical device.
 * Supabase often allows http://localhost:5173 but not exp:// — this page runs on your
 * PC's LAN IP (Vite host: true) and forwards the auth code back into Expo.
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

    const expoRedirect = search.get('expo_redirect');
    if (!expoRedirect) {
      setMessage('Missing expo_redirect. Sign in again from the CaviTour mobile app.');
      return;
    }

    let target;
    try {
      target = new URL(expoRedirect);
    } catch {
      setMessage('Invalid expo_redirect. Sign in again from the mobile app.');
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
      setMessage('No sign-in code received. Try Google sign in again.');
      return;
    }

    setMessage('Opening CaviTour…');
    window.location.replace(target.toString());
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ct-cream)] px-4 font-['Inter',sans-serif]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
        <p className="text-base font-semibold text-neutral-900">Google sign in</p>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
      </div>
    </div>
  );
}
