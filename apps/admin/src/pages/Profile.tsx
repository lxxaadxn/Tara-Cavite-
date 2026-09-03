import { useAuth } from '../contexts/AuthContext';
import { adminAccountFromUser, formatAdminTimestamp } from '../lib/adminAccount';
import styles from './Profile.module.css';

export function Profile() {
  const { session } = useAuth();
  const account = adminAccountFromUser(session?.user);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <p>Your Tara, Cavite! admin account</p>
      </div>

      <div className={styles.card}>
        <div className={styles.profileHeader}>
          {account.avatarUrl ? (
            <img className={styles.avatarImg} src={account.avatarUrl} alt="" />
          ) : (
            <div className={styles.avatar}>{account.initials}</div>
          )}
          <div className={styles.profileMeta}>
            <h2 className={styles.name}>{account.displayName}</h2>
            <span className={styles.role}>{account.role}</span>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.fields}>
          <div className={styles.row}>
            <span className={styles.label}>Email</span>
            <p className={styles.value}>{account.email}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Role</span>
            <p className={styles.value}>{account.role}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Account</span>
            <p className={styles.value}>Tara, Cavite! Admin</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Last sign in</span>
            <p className={styles.value}>{formatAdminTimestamp(account.lastSignIn)}</p>
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
