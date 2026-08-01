import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  clearCachedUserLocation,
  clearLocationPromptPending,
  dismissLocationPromptForUser,
  isLocationPromptPending,
  markLocationPromptPending,
  readCachedUserLocation,
  requestBrowserLocationFromUserGesture,
  wasLocationDismissedForUser,
} from '../lib/promptLocationOnLogin';

/**
 * After login, show an in-app dialog. The native browser location prompt only
 * appears when the user clicks "Allow location" (required by Chrome/Edge).
 */
export function LocationPromptOnLogin() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const maybeOpen = useCallback((uid) => {
    if (!uid) return;
    if (readCachedUserLocation()) {
      clearLocationPromptPending();
      return;
    }
    if (wasLocationDismissedForUser(uid) && !isLocationPromptPending()) return;
    setUserId(uid);
    setError('');
    setPermissionDenied(false);
    setOpen(true);

    // Pre-check if the browser already blocked this origin.
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          if (status.state === 'denied') {
            setPermissionDenied(true);
            setError(
              'Location is blocked for this site. Unlock it in the browser, then tap Try again.'
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        clearCachedUserLocation();
        setOpen(false);
        setUserId(null);
        return;
      }
      if (event === 'SIGNED_IN' && session?.user?.id) {
        markLocationPromptPending(session.user.id);
        window.setTimeout(() => maybeOpen(session.user.id), 500);
      }
    });
    return () => subscription.unsubscribe();
  }, [maybeOpen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isLocationPromptPending()) return;
      const path = location.pathname;
      if (path === '/login' || path === '/signup' || path.startsWith('/auth/')) return;
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const uid = data.session?.user?.id;
      if (uid) maybeOpen(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, maybeOpen]);

  const handleAllow = async () => {
    setBusy(true);
    setError('');
    try {
      await requestBrowserLocationFromUserGesture(userId);
      setOpen(false);
      setPermissionDenied(false);
      clearLocationPromptPending();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not get your location.';
      setError(message);
      if (/blocked|denied/i.test(message)) setPermissionDenied(true);
    } finally {
      setBusy(false);
    }
  };

  const handleNotNow = () => {
    dismissLocationPromptForUser(userId);
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end justify-center bg-black/40 px-4 py-6 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cavitour-location-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)] sm:p-6">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#7EA00E]/15">
          <svg className="h-5 w-5 text-[#7EA00E]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
        </div>
        <h2 id="cavitour-location-title" className="font-['Poppins',sans-serif] text-lg font-semibold text-neutral-900">
          Share your location?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Tara, Cavite! uses your GPS so maps can place a green dot where you are and route you to
          establishments accurately.
        </p>

        {permissionDenied ? (
          <ol className="mt-3 list-decimal space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 pl-8 text-xs leading-relaxed text-amber-950">
            <li>
              Click the <strong>lock</strong> (or tune) icon left of the address bar.
            </li>
            <li>
              Open <strong>Site settings</strong> / <strong>Permissions</strong>.
            </li>
            <li>
              Set <strong>Location</strong> to <strong>Allow</strong>.
            </li>
            <li>
              Come back here and tap <strong>Try again</strong>.
            </li>
          </ol>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Tap Allow location — your browser will ask you to Allow or Block next.
          </p>
        )}

        {error && !permissionDenied ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleNotNow}
            disabled={busy}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-60"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleAllow}
            disabled={busy}
            className="rounded-xl bg-[#7EA00E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6d8c0c] disabled:opacity-60"
          >
            {busy ? 'Waiting for browser…' : permissionDenied ? 'Try again' : 'Allow location'}
          </button>
        </div>
      </div>
    </div>
  );
}
