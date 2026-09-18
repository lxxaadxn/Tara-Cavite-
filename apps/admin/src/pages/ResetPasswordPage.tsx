import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminBrandMark } from '../components/AdminBrandMark';
import { supabase } from '../lib/supabase';
import {
  completePasswordRecoveryFromUrl,
  stripAuthParamsFromUrl,
  urlLooksLikePasswordRecovery,
} from '../lib/passwordRecovery';
import styles from './LoginPage.module.css';

const MIN_LEN = 8;

type Phase = 'bootstrapping' | 'ready' | 'done';

/**
 * Landing target of the password-reset email link (`/auth/reset-password`).
 * Mirrors the web app's ResetPasswordPage: completes the recovery link
 * (PKCE code or implicit tokens), then lets the admin set a new password.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('bootstrapping');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setPhase('ready');
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
            stripAuthParamsFromUrl('/auth/reset-password');
            setPhase('ready');
            setError('');
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          // Already in a recovery/session from the email link.
          setPhase('ready');
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'This reset link is invalid or expired.');
      } finally {
        if (active) setPhase((p) => (p === 'bootstrapping' ? 'bootstrapping' : p));
      }
    };

    void bootstrap();

    return () => {
      active = false;
      subscription.unsubscribe();
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
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      await supabase.auth.signOut();
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update password.');
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

        {phase === 'bootstrapping' && (
          <>
            <h1 className={styles.title}>Reset password</h1>
            <p className={styles.hint} role="status">
              Opening your reset link…
            </p>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}
            <p className={styles.forgotRow}>
              <Link to="/forgot-password" className={styles.forgotLink}>
                Request a new link
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
              <button type="submit" className={styles.submit} disabled={loading}>
                {loading ? 'Saving…' : 'Save new password'}
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
