import { useEffect, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminBrandMark } from '../components/AdminBrandMark';
import { ADMIN_ALLOWED_EMAIL, adminAllowlistHint, isAllowedAdminEmailAsync } from '../lib/adminEmail';
import { consumePendingAdminGoogleOAuth, startAdminGoogleOAuth } from '../lib/startGoogleOAuth';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAdminHref } from '../contexts/AdminPathPrefixContext';
import styles from './LoginPage.module.css';

function GoogleLogoMark() {
  return (
    <svg className={styles.googleMark} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const dashboardHref = useAdminHref('/web/dashboard');
  const forgotHref = '/forgot-password';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const googleError = (location.state as { googleError?: string } | null)?.googleError;
    if (typeof googleError === 'string' && googleError.trim()) {
      const normalized = googleError.toLowerCase();
      setError(
        normalized.includes('oauth state has expired') || normalized.includes('flow_state')
          ? 'Google sign-in expired. Please try Sign in with Google again.'
          : googleError
      );
      navigate(location.pathname + location.search, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!authLoading && session) {
      navigate(dashboardHref, { replace: true });
    }
  }, [authLoading, session, dashboardHref, navigate]);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await startAdminGoogleOAuth(dashboardHref);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!consumePendingAdminGoogleOAuth()) return;
    void handleGoogle();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume once after localhost bounce
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      setError('Enter email and password.');
      return;
    }

    setLoading(true);
    try {
      if (!(await isAllowedAdminEmailAsync(supabase, trimmed))) {
        setError(`Only ${adminAllowlistHint()} can access the admin app.`);
        return;
      }

      const { data, error: err } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (err) throw err;

      const signedInEmail = data.user?.email?.trim().toLowerCase() ?? '';
      if (!(await isAllowedAdminEmailAsync(supabase, signedInEmail))) {
        await supabase.auth.signOut();
        setError(`Only ${adminAllowlistHint()} can access the admin app.`);
        return;
      }

      navigate(dashboardHref, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <AdminBrandMark variant="onLight" />
          <span className={styles.badge}>Admin</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.hint}>
          Only <strong>{adminAllowlistHint()}</strong> can log in here.
        </p>

        <button
          type="button"
          className={styles.googleBtn}
          onClick={() => void handleGoogle()}
          disabled={loading || authLoading}
        >
          <GoogleLogoMark />
          Sign in with Google
        </button>

        <div className={styles.divider} role="separator">
          <span>or</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Email
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder={ADMIN_ALLOWED_EMAIL}
              required
            />
          </label>
          <label className={styles.label}>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              required
            />
          </label>
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className={styles.submit} disabled={loading || authLoading}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
          <p className={styles.forgotRow}>
            <a href={forgotHref} className={styles.forgotLink}>
              Forgot password?
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
