import { useAuth } from '../contexts/AuthContext';
import styles from './Profile.module.css';

function initialsFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.charAt(0);
    const b = parts[1]?.charAt(0);
    if (a && b) return (a + b).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || 'AD';
}

export function Profile() {
  const { session } = useAuth();
  const email = session?.user?.email ?? '—';
  const initials = session?.user?.email ? initialsFromEmail(session.user.email) : 'AD';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Profile</h1>
        <p>Your admin account details</p>
      </div>

      <div className={styles.card}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileMeta}>
            <h2 className={styles.name}>Admin</h2>
            <span className={styles.role}>Admin</span>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.fields}>
          <div className={styles.row}>
            <span className={styles.label}>Email</span>
            <p className={styles.value}>{email}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Role</span>
            <p className={styles.value}>Admin</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Status</span>
            <p className={styles.value}>
              <span className={styles.statusActive}>Active</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
