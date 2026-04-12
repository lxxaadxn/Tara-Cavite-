import { users } from '../data/mockData';
import styles from './Profile.module.css';

const adminUser = users.find((u) => u.role === 'Admin') ?? users[0];

export function Profile() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Profile</h1>
        <p>Your admin account details</p>
      </div>

      <div className={styles.card}>
        <div className={styles.profileHeader}>
          <div className={styles.avatar}>{adminUser.initials}</div>
          <div className={styles.profileMeta}>
            <h2 className={styles.name}>{adminUser.name}</h2>
            <span className={styles.role}>{adminUser.role}</span>
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.fields}>
          <div className={styles.row}>
            <span className={styles.label}>Email</span>
            <p className={styles.value}>{adminUser.email}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Role</span>
            <p className={styles.value}>{adminUser.role}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Last login</span>
            <p className={styles.value}>{adminUser.lastLogin}</p>
          </div>
          <div className={styles.row}>
            <span className={styles.label}>Status</span>
            <p className={styles.value}>
              <span className={adminUser.active ? styles.statusActive : styles.statusInactive}>
                {adminUser.active ? 'Active' : 'Inactive'}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
