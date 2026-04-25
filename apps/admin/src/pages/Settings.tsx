import { useState } from 'react';
import styles from './Settings.module.css';

export function Settings() {
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Settings</h1>
        <p>Manage your application preferences</p>
      </div>

      <div className={styles.card}>
        <h3>General Settings</h3>
        <div className={styles.row}>
          <div>
            <span className={styles.label}>Application Name</span>
            <p className={styles.value}>CaviTour Admin</p>
          </div>
        </div>
        <div className={styles.row}>
          <div>
            <span className={styles.label}>Contact Email</span>
            <p className={styles.value}>admin@cavitour.com</p>
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
    </div>
  );
}
