import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdminBrandMark } from '@admin/components/AdminBrandMark';
import { supabase } from '../lib/supabase';
import styles from './EstablishmentPortal.module.css';
import {
  completePasswordRecoveryFromUrl,
  stripAuthParamsFromUrl,
  urlLooksLikeInvite,
  urlLooksLikePasswordRecovery,
} from '../lib/passwordRecovery';
import {
  ESTABLISHMENT_DISABLED_MESSAGE,
  ESTABLISHMENT_HOME_PATH,
  fetchOwnEstablishment,
  isEstablishmentDashboardReady,
} from '../lib/accountHome';

const MIN_LEN = 8;

export function EstablishmentSetupPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setReady(true);
        setBootstrapping(false);
        setError('');
      }
    });

    const bootstrap = async () => {
      try {
        const href = window.location.href;
        if (urlLooksLikeInvite(href) || urlLooksLikePasswordRecovery(href) || /[?&#](code|access_token)=/.test(href)) {
          const session = await completePasswordRecoveryFromUrl(supabase, href);
          if (!active) return;
          if (session) {
            stripAuthParamsFromUrl('/establishment/setup');
            setReady(true);
            setError('');
            const owner = await fetchOwnEstablishment(supabase, session.user.id);
            if (owner?.accountStatus === 'disabled' || owner?.accountStatus === 'deleted') {
              await supabase.auth.signOut();
              setError(ESTABLISHMENT_DISABLED_MESSAGE);
              setReady(false);
              return;
            }
            if (owner && isEstablishmentDashboardReady(owner)) {
              navigate(ESTABLISHMENT_HOME_PATH, { replace: true });
              return;
            }
            setBusinessName(owner?.businessName || '');
            return;
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) {
          const owner = await fetchOwnEstablishment(supabase, data.session.user.id);
          if (owner?.accountStatus === 'disabled' || owner?.accountStatus === 'deleted') {
            await supabase.auth.signOut();
            setError(ESTABLISHMENT_DISABLED_MESSAGE);
            setReady(false);
            return;
          }
          if (owner && isEstablishmentDashboardReady(owner)) {
            navigate(ESTABLISHMENT_HOME_PATH, { replace: true });
            return;
          }
          if (owner) {
            setBusinessName(owner.businessName);
            setReady(true);
          } else {
            setError('This invite is for a recognized establishment. Sign in with the invited email, or ask the Tourism Office to send a new invitation.');
          }
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'This invitation link is invalid or expired.');
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
  }, [navigate]);

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
      const userId = data.user?.id;
      if (!userId) throw new Error('Could not read your account after saving the password.');
      const { error: setupErr } = await supabase
        .from('establishment_owners')
        .update({
          verification_status: 'approved',
          setup_completed_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (setupErr) throw setupErr;
      setSaved(true);
      window.setTimeout(() => {
        navigate(ESTABLISHMENT_HOME_PATH, { replace: true });
      }, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.setupRoot}>
      <div className={styles.setupCard}>
        <div className={styles.setupMast}>
          <Link to="/" className={styles.setupLink} style={{ marginTop: 0 }}>
            <AdminBrandMark variant="onLight" />
          </Link>
          <h1 className={styles.setupTitle}>Set up your account</h1>
          <p className={styles.setupCopy}>
            {businessName
              ? `${businessName} was registered by the Cavite Tourism Administration. Create a password to open your dashboard.`
              : 'Create a password for your establishment account. The Tourism Office never sets this password for you.'}
          </p>
        </div>

        <div className={styles.setupBody}>
          {bootstrapping ? (
            <p className={styles.hint}>Opening your invitation…</p>
          ) : saved ? (
            <>
              <p className={styles.name} style={{ fontSize: 18 }}>
                Password saved
              </p>
              <p className={styles.setupCopy}>Opening your establishment dashboard…</p>
            </>
          ) : !ready ? (
            <>
              {error ? <p className={styles.err}>{error}</p> : null}
              <p className={styles.hint}>
                Waiting for a valid invitation link. If this stays here, ask the Tourism Office to resend
                the invite and make sure <strong>/establishment/setup</strong> is allowlisted in Supabase
                Auth redirect URLs.
              </p>
              <Link to="/login" className={styles.setupLink}>
                Back to login
              </Link>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className={styles.grid} style={{ gridTemplateColumns: '1fr' }}>
                <label className={styles.field}>
                  <span className={styles.label}>Password</span>
                  <input
                    type="password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    minLength={MIN_LEN}
                    autoComplete="new-password"
                    required
                  />
                  <span className={styles.hint} style={{ margin: 0 }}>
                    At least {MIN_LEN} characters.
                  </span>
                </label>
                <label className={styles.field}>
                  <span className={styles.label}>Confirm password</span>
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={styles.input}
                    minLength={MIN_LEN}
                    autoComplete="new-password"
                    required
                  />
                </label>
              </div>
              {error ? <p className={styles.err}>{error}</p> : null}
              <div className={styles.toolbar} style={{ padding: '16px 0 0', border: 'none', background: 'none' }}>
                <button type="submit" className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving…' : 'Save password and continue'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
