import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';
import { isAdminReservedEmail } from '../lib/adminReservedEmail';
import { ADMIN_APP_HOME_PATH } from '../lib/adminPortalPath';
import { GoogleAuthButton, GoogleLogoMark } from '../components/GoogleAuthButton';
import { startGoogleOAuth } from '../lib/startGoogleOAuth';
import { markLocationPromptPending } from '../lib/promptLocationOnLogin';

const olive = 'var(--ct-olive)';
const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';
const cream = 'var(--ct-cream)';

function toFriendlyLoginError(err) {
  const message = err instanceof Error ? err.message : String(err || '');
  const normalized = message.toLowerCase();
  if (normalized.includes('email not confirmed') || normalized.includes('email_not_confirmed')) {
    return 'Verify your email first. Open the confirmation link we sent, then sign in. You can resend it below.';
  }
  if (normalized.includes('invalid login credentials')) {
    return 'Email or password is incorrect. If this account was created with Google, use "Sign in with Google" or reset your password.';
  }
  return message || 'Sign in failed';
}

function safeNextPath(raw) {
  const next = String(raw ?? '').trim();
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleAuthInProgress, setGoogleAuthInProgress] = useState(false);
  const [showGoogleConsent, setShowGoogleConsent] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const needsEmailConfirm =
    /verify your email|email not confirmed|confirmation link/i.test(error);

  useEffect(() => {
    if (searchParams.get('confirmed') !== '1') return;
    setInfo('Email confirmed. You can sign in now.');
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        navigate('/search', { replace: true });
      }
    });
    return () => {
      active = false;
    };
  }, [searchParams, navigate]);

  useEffect(() => {
    const googleError = location.state?.googleError;
    if (typeof googleError === 'string' && googleError.trim()) {
      setError(googleError);
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    setGoogleAuthInProgress(true);
    try {
      await startGoogleOAuth({ next: nextPath });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
      setLoading(false);
      setGoogleAuthInProgress(false);
    }
  };

  const handleResendConfirmation = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter your email above, then tap resend.');
      return;
    }
    setResendLoading(true);
    setError('');
    setInfo('');
    try {
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login?confirmed=1')}`;
      const { error: err } = await supabase.auth.resend({
        type: 'signup',
        email: trimmedEmail,
        options: { emailRedirectTo },
      });
      if (err) throw err;
      setInfo('Confirmation email sent. Check your inbox (and spam).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend confirmation email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (err) throw err;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Signed in but session was not ready. Please try again.');
        return;
      }
      markLocationPromptPending(session.user?.id);
      const fallback = isAdminReservedEmail(trimmedEmail) ? ADMIN_APP_HOME_PATH : '/search';
      navigate(nextPath || fallback, { replace: true });
    } catch (err) {
      setError(toFriendlyLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 font-['Inter',sans-serif] sm:px-8 sm:py-8" style={{ backgroundColor: cream }}>
      {showGoogleConsent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-consent-title"
          aria-describedby="google-consent-desc"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-100">
              <GoogleLogoMark className="h-7 w-7" />
            </div>
            <p id="google-consent-title" className="text-center text-base font-semibold text-neutral-900">
              Sign in with Google
            </p>
            <p id="google-consent-desc" className="mt-2 text-center text-sm text-neutral-600">
              Allow Tara, Cavite! to sign you in with Google? You will be redirected to Google to continue.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                className="h-10 flex-1 rounded-full border border-neutral-200 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50"
                onClick={() => setShowGoogleConsent(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="h-10 flex-1 rounded-full text-sm font-semibold text-white transition"
                style={{ backgroundColor: teal }}
                onClick={() => {
                  setShowGoogleConsent(false);
                  void handleGoogleAuth();
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {googleAuthInProgress ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center">
              <GoogleLogoMark className="h-8 w-8" />
            </div>
            <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-neutral-300 border-t-[var(--ct-teal)]" />
            <p className="text-base font-semibold text-neutral-900">Authenticating with Google</p>
            <p className="mt-1 text-sm text-neutral-600">Please continue in the Google sign-in window.</p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[1.7rem] bg-white p-3 shadow-[0_24px_60px_rgba(0,0,0,0.10)] sm:p-6">
        <div className="w-full px-2 py-2 sm:px-4">
            <div className="mb-6 text-center">
              <Link to="/" className="inline-flex items-center justify-center">
                <LogoWordmark className="text-sm" />
              </Link>
              <h1 className="mt-4 font-['Poppins',sans-serif] text-3xl font-semibold" style={{ color: ink }}>Login to your account</h1>
              <p className="mt-2 text-sm text-neutral-500">Welcome back. Enter your details to log in.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-neutral-600">Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                  style={{ boxShadow: 'none' }}
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-neutral-600">Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                  style={{ boxShadow: 'none' }}
                  required
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1 text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-neutral-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="rounded border-neutral-300"
                    style={{ accentColor: olive }}
                  />
                  Remember login
                </label>
                <Link to="/forgot-password" className="font-medium hover:underline" style={{ color: teal }}>
                  Forgot Password?
                </Link>
              </div>

              {info ? <p className="text-sm text-emerald-700">{info}</p> : null}
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {needsEmailConfirm ? (
                <button
                  type="button"
                  disabled={resendLoading || loading}
                  onClick={handleResendConfirmation}
                  className="text-sm font-medium underline disabled:opacity-60"
                  style={{ color: teal }}
                >
                  {resendLoading ? 'Sending…' : 'Resend confirmation email'}
                </button>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full rounded-full text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: teal }}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              <span>Or continue with</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <div className="space-y-3">
              <GoogleAuthButton
                mode="sign-in"
                disabled={loading}
                onClick={() => setShowGoogleConsent(true)}
              />
            </div>

            <p className="mt-5 text-center text-sm text-neutral-500">
              New here?{' '}
              <Link to="/signup" className="font-semibold hover:underline" style={{ color: teal }}>
                Sign up
              </Link>
            </p>
        </div>
      </div>
    </div>
  );
}
