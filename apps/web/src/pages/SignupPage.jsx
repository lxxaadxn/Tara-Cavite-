import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { LogoWordmark } from '../components/LogoWordmark';
import { GoogleAuthButton, GoogleLogoMark } from '../components/GoogleAuthButton';
import { getAdminReservedEmailMessage, isAdminReservedEmail } from '../lib/adminReservedEmail';
import { startGoogleOAuth } from '../lib/startGoogleOAuth';

const MIN_PASSWORD_LENGTH = 8;
const teal = 'var(--ct-teal)';
const ink = 'var(--ct-ink)';
const cream = 'var(--ct-cream)';

function toFriendlySignupError(err) {
  const message = err instanceof Error ? err.message : String(err || '');
  const normalized = message.toLowerCase();
  if (normalized.includes('user already registered') || normalized.includes('already exists')) {
    return 'This email is already registered. Please log in instead. If you previously used Google, choose "Sign in with Google".';
  }
  if (normalized.includes('error sending') || normalized.includes('confirmation email')) {
    return 'We could not send the confirmation email. Check spam, wait a minute, then use Resend on the login page.';
  }
  return message || 'Sign up failed';
}

export function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGoogleConsent, setShowGoogleConsent] = useState(false);
  const [showConfirmEmailNotice, setShowConfirmEmailNotice] = useState(false);
  const [error, setError] = useState('');

  const goToLoginAfterNotice = () => {
    setShowConfirmEmailNotice(false);
    navigate('/login', { replace: true });
  };
  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      await startGoogleOAuth({ next: '/search' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign up failed');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (isAdminReservedEmail(trimmedEmail)) {
      setError(getAdminReservedEmailMessage());
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('Password must be at least 8 characters.');
      return;
    }

    const trimmedName = name.trim() || trimmedEmail.split('@')[0];
    setLoading(true);
    try {
      const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login?confirmed=1')}`;
      const { data, error: err } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { username: trimmedName },
          emailRedirectTo,
        },
      });
      if (err) throw err;

      // Confirm-email ON: existing accounts return a fake user with empty identities (no email sent).
      const identities = data.user?.identities ?? [];
      if (data.user && identities.length === 0) {
        throw new Error('User already registered');
      }

      if (data.session) {
        navigate('/search', { replace: true });
      } else if (data.user) {
        setError('');
        setShowConfirmEmailNotice(true);
      } else {
        throw new Error('Sign up failed. Please try again.');
      }
    } catch (err) {
      setError(toFriendlySignupError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 font-['Inter',sans-serif] sm:px-8 sm:py-8" style={{ backgroundColor: cream }}>
      {showConfirmEmailNotice ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="signup-confirm-email-title"
          aria-describedby="signup-confirm-email-desc"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <div
              className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(31, 79, 89, 0.1)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z"
                  stroke={teal}
                  strokeWidth="1.75"
                />
                <path
                  d="m5.5 7.5 6.1 4.4a.75.75 0 0 0 .9 0L18.5 7.5"
                  stroke={teal}
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p id="signup-confirm-email-title" className="text-center text-base font-semibold text-neutral-900">
              Check your email
            </p>
            <p id="signup-confirm-email-desc" className="mt-2 text-center text-sm text-neutral-600">
              We sent you a confirmation link. Open it to activate your account, then sign in.
            </p>
            <button
              type="button"
              className="mt-5 h-10 w-full rounded-full text-sm font-semibold text-white transition"
              style={{ backgroundColor: teal }}
              onClick={goToLoginAfterNotice}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      {showGoogleConsent ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="google-signup-consent-title"
          aria-describedby="google-signup-consent-desc"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-100">
              <GoogleLogoMark className="h-7 w-7" />
            </div>
            <p id="google-signup-consent-title" className="text-center text-base font-semibold text-neutral-900">
              Sign up with Google
            </p>
            <p id="google-signup-consent-desc" className="mt-2 text-center text-sm text-neutral-600">
              Allow Tara, Cavite! to create or link your account with Google? You will be redirected to Google to continue.
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

      <div className="mx-auto w-full max-w-md overflow-hidden rounded-[1.7rem] bg-white p-3 shadow-[0_24px_60px_rgba(0,0,0,0.10)] sm:p-6">
          <div className="w-full px-2 py-2 sm:px-4">
            <div className="mb-6 text-center">
              <Link to="/" className="inline-flex items-center justify-center">
                <LogoWordmark className="text-sm" />
              </Link>
              <h1 className="mt-4 font-['Poppins',sans-serif] text-3xl font-semibold" style={{ color: ink }}>Create your account</h1>
              <p className="mt-2 text-sm text-neutral-500">Enter your details to get started with Tara, Cavite!</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm text-neutral-600">Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                  style={{ boxShadow: 'none' }}
                />
              </div>

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
                  placeholder="Create your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-full border border-neutral-200 px-4 text-sm outline-none transition focus:border-neutral-300 focus:ring-2 focus:ring-[rgba(126,160,14,0.22)]"
                  style={{ boxShadow: 'none' }}
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                />
                <p className="mt-1 text-xs text-neutral-500">Must be at least 8 characters.</p>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 h-11 w-full rounded-full text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ backgroundColor: teal }}
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-neutral-400">
              <div className="h-px flex-1 bg-neutral-200" />
              <span>Or continue with</span>
              <div className="h-px flex-1 bg-neutral-200" />
            </div>

            <div className="space-y-3">
              <GoogleAuthButton
                mode="sign-up"
                disabled={loading}
                onClick={() => setShowGoogleConsent(true)}
              />
            </div>

            <p className="mt-5 text-center text-sm text-neutral-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold hover:underline" style={{ color: teal }}>
                Log in
              </Link>
            </p>
          </div>
      </div>
    </div>
  );
}
