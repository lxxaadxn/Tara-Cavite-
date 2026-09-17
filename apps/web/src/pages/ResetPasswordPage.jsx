import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';
import {
  completePasswordRecoveryFromUrl,
  stripAuthParamsFromUrl,
  urlLooksLikePasswordRecovery,
} from '../lib/passwordRecovery';
import { isAdminReservedEmail } from '../lib/adminReservedEmail';
import { ADMIN_APP_HOME_URL } from '../lib/adminPortalPath';
import { resolveAccountHome } from '../lib/accountHome';

const MIN_LEN = 8;
const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';
const cream = 'var(--ct-cream)';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setReady(true);
        setBootstrapping(false);
        setError('');
      }
    });

    const bootstrap = async () => {
      try {
        const href = window.location.href;
        // Only exchange recovery links here — never steal Google OAuth codes.
        if (urlLooksLikePasswordRecovery(href)) {
          const session = await completePasswordRecoveryFromUrl(supabase, href);
          if (!active) return;
          if (session) {
            stripAuthParamsFromUrl('/reset-password');
            setReady(true);
            setError('');
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          // Already in a recovery/session from the email link.
          setReady(true);
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'This reset link is invalid or expired.');
        setReady(false);
      } finally {
        if (active) setBootstrapping(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LEN) {
      setError(`Password must be at least ${MIN_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      const { data } = await supabase.auth.getUser();
      const sessionRes = await supabase.auth.getSession();
      const session = sessionRes.data.session;
      const email = data.user?.email?.trim().toLowerCase() ?? '';
      const isAdminReset = Boolean(email && isAdminReservedEmail(email));
      let nextPath = isAdminReset ? null : '/login';
      if (session && !isAdminReset) {
        const home = await resolveAccountHome(supabase, session);
        if (home.path?.startsWith('/establishment')) {
          nextPath = home.path;
        }
      }
      setSaved(true);
      window.setTimeout(() => {
        if (isAdminReset) {
          // Admin home is on the separate admin app origin.
          window.location.replace(ADMIN_APP_HOME_URL);
          return;
        }
        navigate(nextPath, {
          replace: true,
          state: nextPath === '/login' ? { passwordReset: true } : undefined,
        });
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 font-['Poppins',sans-serif]" style={{ backgroundColor: cream }}>
      <div className="mx-auto w-full max-w-md pt-8">
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center justify-center">
            <LogoWordmark className="text-sm" />
          </Link>
          <h1 className="mt-4 font-['Poppins',sans-serif] text-3xl font-semibold" style={{ color: ink }}>
            Set new password
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Choose a new password for your account, then sign in with it.
          </p>
        </div>

        {bootstrapping ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-600 shadow-sm">
            Opening your reset link…
          </div>
        ) : saved ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
            <p className="text-base font-semibold text-neutral-900">Password updated</p>
            <p className="mt-2 text-sm text-neutral-600">Your password was successfully changed. Redirecting to login…</p>
          </div>
        ) : !ready ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-600 shadow-sm">
            {error ? <p className="mb-3 text-red-600">{error}</p> : null}
            <p>
              Waiting for a valid reset link… If this stays here, request a new link and make sure
              <span className="font-semibold"> /reset-password </span>
              is allowlisted in Supabase Auth redirect URLs.
            </p>
            <Link to="/forgot-password" className="mt-4 inline-block font-semibold hover:underline" style={{ color: teal }}>
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1.5 block text-sm text-neutral-600">New password</label>
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(16, 163, 127,0.22)]"
                minLength={MIN_LEN}
                autoComplete="new-password"
                required
              />
              <p className="mt-1 text-xs text-neutral-500">At least {MIN_LEN} characters.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-neutral-600">Confirm password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(16, 163, 127,0.22)]"
                minLength={MIN_LEN}
                autoComplete="new-password"
                required
              />
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full text-sm font-semibold text-white transition disabled:opacity-60"
              style={{ backgroundColor: teal }}
            >
              {loading ? 'Saving…' : 'Save new password'}
            </button>
            <p className="text-center text-sm text-neutral-500">
              <Link to="/login" className="font-semibold hover:underline" style={{ color: teal }}>
                Back to login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
