import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_ALLOWED_EMAIL, isAllowedAdminEmail } from '../lib/adminEmail';
import { supabase } from '../lib/supabase';
import { useAdminHref } from '../contexts/AdminPathPrefixContext';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const dashboardHref = useAdminHref('/web/dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError('Enter email and password.');
      return;
    }
    if (!isAllowedAdminEmail(trimmed)) {
      setError(`Only ${ADMIN_ALLOWED_EMAIL} can access the admin app.`);
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({
        email: trimmed.toLowerCase(),
        password,
      });
      if (err) throw err;
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
          <img src="/cavitour-logo.png" alt="" className={styles.logo} />
          <span className={styles.badge}>Admin</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.hint}>
          Use the admin account email <strong>{ADMIN_ALLOWED_EMAIL}</strong>.
        </p>

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
          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? 'Signing in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
