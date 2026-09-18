import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminBrandMark } from '../components/AdminBrandMark';
import { supabase } from '../lib/supabase';
import styles from './LoginPage.module.css';

const MIN_LEN = 8;

type Phase = 'verifying' | 'ready' | 'done' | 'error';

/**
 * Landing target of the password-reset email link (`/auth/reset-password`).
 * Supports both Supabase link styles:
 *  - `?token_hash=…&type=recovery`  → verifyOtp
 *  - `#access_token=…&refresh_token=…` (legacy implicit link) → setSession
 * Then lets the admin set a new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('verifying');
  const [message, setMessage] = useState('Verifying your reset link…');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const parseFragmentParams = (): URLSearchParams => {
      const hashIdx = window.location.href.indexOf('#');
      if (hashIdx < 0) return new URLSearchParams();
      return new URLSearchParams(window.location.href.slice(hashIdx + 1));
    };

    const verify = async () => {
      const query = new URLSearchParams(window.location.search);
      const tokenHash = query.get('token_hash');
      const queryType = query.get('type');
      const fragment = parseFragmentParams();
      const accessToken = fragment.get('access_token');
      const refreshToken = fragment.get('refresh_token');

      try {
        if (tokenHash) {
          const type = queryType === 'recovery' || !queryType ? 'recovery' : queryType;
          const { error: err } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'recovery',
          });
          if (err) throw err;
        } else if (accessToken && refreshToken) {
          const { error: err } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (err) throw err;
        } else {
          // Maybe the SDK already picked up a session (e.g. detectSessionInUrl).
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error('This reset link is invalid or has expired.');
          }
        }

        // Clean the URL so tokens do not linger in history.
        window.history.replaceState({}, document.title, window.location.pathname);
        if (active) setPhase('ready');
      } catch (err) {
        if (!active) return;
        setMessage(err instanceof Error ? err.message : 'Could not verify the reset link.');
        setPhase('error');
      }
    };

    void verify();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LEN) {
      setError(`Password must be at least ${MIN_LEN} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      await supabase.auth.signOut();
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <AdminBrandMark variant="onLight" />
          <span className={styles.badge}>Admin</span>
        </div>

        {phase === 'verifying' && (
          <>
            <h1 className={styles.title}>Reset password</h1>
            <p className={styles.hint} role="status">
              {message}
            </p>
          </>
        )}

        {phase === 'error' && (
          <>
            <h1 className={styles.title}>Reset link problem</h1>
            <p className={styles.error} role="alert">
              {message}
            </p>
            <p className={styles.forgotRow}>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Request a new reset link
              </Link>
              {' | '}
              <Link to="/login" className={styles.forgotLink}>
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {phase === 'ready' && (
          <>
            <h1 className={styles.title}>Set a new password</h1>
            <p className={styles.hint}>Choose a new password for your admin account.</p>
            <form onSubmit={handleSubmit} className={styles.form}>
              <label className={styles.label}>
                New password
                <input
                  id="reset-password"
                  name="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  minLength={MIN_LEN}
                  required
                />
              </label>
              <label className={styles.label}>
                Confirm new password
                <input
                  id="reset-password-confirm"
                  name="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.input}
                  minLength={MIN_LEN}
                  required
                />
              </label>
              {error ? (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" className={styles.submit} disabled={busy}>
                {busy ? 'Saving…' : 'Update password'}
              </button>
            </form>
          </>
        )}

        {phase === 'done' && (
          <>
            <h1 className={styles.title}>Password updated</h1>
            <p className={styles.hint} role="status">
              Your new password is saved. Sign in with your email and new password.
            </p>
            <p className={styles.forgotRow}>
              <button
                type="button"
                className={styles.submit}
                onClick={() => navigate('/login', { replace: true })}
              >
                Go to sign in
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
