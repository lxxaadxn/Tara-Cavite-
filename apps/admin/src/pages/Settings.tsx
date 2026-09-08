import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import {
  readAdminPreferences,
  saveAdminPreferences,
  type AdminPreferences,
} from '../lib/adminProfile';
import { supabase } from '../lib/supabase';
import styles from './Settings.module.css';

export function Settings() {
  const { signOut, session } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const routePrefix = useAdminPathPrefix();

  // Same store the Profile page writes, so the two pages cannot disagree.
  const savedPrefs = useMemo(() => readAdminPreferences(session?.user), [session?.user]);
  const [prefs, setPrefs] = useState<AdminPreferences>(savedPrefs);
  const [compactMode, setCompactMode] = useState(false);

  useEffect(() => {
    setPrefs(savedPrefs);
  }, [savedPrefs]);

  const togglePref = async (key: keyof AdminPreferences) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    try {
      await saveAdminPreferences(supabase, next);
    } catch (err) {
      setPrefs(prefs);
      toast(err instanceof Error ? err.message : 'Could not save preference', 'error');
    }
  };

  const handleLogout = async () => {
    await signOut();
    if (routePrefix) {
      window.location.replace('/');
      return;
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p>Manage your application preferences</p>
      </div>

      <div className={styles.card}>
        <h3>General Settings</h3>
        <div className={styles.row}>
          <div>
            <span className={styles.label}>Application Name</span>
            <p className={styles.value}>Tara, Cavite! Admin</p>
          </div>
        </div>
        <div className={styles.row}>
          <div>
            <span className={styles.label}>Contact Email</span>
            <p className={styles.value}>admin@taracavite.com</p>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <h3>Notifications</h3>
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.label}>Establishment announcements</span>
            <p className={styles.desc}>When an establishment posts an announcement</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.establishmentAnnouncements}
            aria-label="Establishment announcements"
            className={`${styles.toggle} ${prefs.establishmentAnnouncements ? styles.on : ''}`}
            onClick={() => void togglePref('establishmentAnnouncements')}
          >
            <span className={styles.knob} />
          </button>
        </div>
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.label}>Establishment application activation</span>
            <p className={styles.desc}>When an establishment sets a password for their invite</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={prefs.establishmentActivations}
            aria-label="Establishment application activation"
            className={`${styles.toggle} ${prefs.establishmentActivations ? styles.on : ''}`}
            onClick={() => void togglePref('establishmentActivations')}
          >
            <span className={styles.knob} />
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <h3>Display</h3>
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.label}>Compact Mode</span>
            <p className={styles.desc}>Show more content in less space</p>
          </div>
          <button
            className={`${styles.toggle} ${compactMode ? styles.on : ''}`}
            onClick={() => setCompactMode(!compactMode)}
          >
            <span className={styles.knob} />
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <h3>Account</h3>
        {session?.user?.email ? (
          <p className={styles.value} style={{ marginBottom: 12 }}>
            Signed in as {session.user.email}
          </p>
        ) : null}
        <button type="button" className={styles.logoutBtn} onClick={() => void handleLogout()}>
          Log out
        </button>
      </div>
    </div>
  );
}
