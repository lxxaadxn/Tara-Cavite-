import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import styles from './Settings.module.css';

export function Settings() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const routePrefix = useAdminPathPrefix();

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
            <span className={styles.label}>Email Notifications</span>
            <p className={styles.desc}>Receive email updates about new spots and reviews</p>
          </div>
          <button
            className={`${styles.toggle} ${emailNotif ? styles.on : ''}`}
            onClick={() => setEmailNotif(!emailNotif)}
          >
            <span className={styles.knob} />
          </button>
        </div>
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.label}>Push Notifications</span>
            <p className={styles.desc}>Get push notifications for important updates</p>
          </div>
          <button
            className={`${styles.toggle} ${pushNotif ? styles.on : ''}`}
            onClick={() => setPushNotif(!pushNotif)}
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
