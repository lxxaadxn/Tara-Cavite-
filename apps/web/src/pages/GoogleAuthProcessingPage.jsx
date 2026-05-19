import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isAdminReservedEmail } from '../lib/adminReservedEmail';
import { ADMIN_APP_HOME_PATH } from '../lib/adminPortalPath';

const AUTH_POPUP_MS = 1500;

export function GoogleAuthProcessingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const processGoogleAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const email = data?.session?.user?.email?.trim().toLowerCase() ?? '';
      const destination = !data?.session
        ? '/login'
        : email && isAdminReservedEmail(email)
          ? ADMIN_APP_HOME_PATH
          : '/search';

      // Keep this visible briefly so users always see authentication feedback.
      window.setTimeout(() => {
        if (active) {
          navigate(destination, { replace: true });
        }
      }, AUTH_POPUP_MS);
    };

    processGoogleAuth();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--ct-cream)] px-4 font-['Inter',sans-serif]">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-neutral-300 border-t-[var(--ct-teal)]" />
        <p className="text-base font-semibold text-neutral-900">Authenticating with Google</p>
        <p className="mt-1 text-sm text-neutral-600">Please wait while we complete your sign in.</p>
      </div>
    </div>
  );
}
