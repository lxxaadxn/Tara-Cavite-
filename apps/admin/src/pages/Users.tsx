import { useState } from 'react';
import { users } from '../data/mockData';
import styles from './Users.module.css';

export function Users() {
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set(users.filter((u) => u.active).map((u) => u.id)));

  const toggleActive = (id: string) => {
    setActiveIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Users</h1>
        <p>Manage user accounts and permissions</p>
      </div>

      <div className={styles.list}>
        {users.map((user) => (
          <div key={user.id} className={styles.card}>
            <div className={styles.avatar}>{user.initials}</div>
            <div className={styles.content}>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className={`${styles.role} ${user.role === 'Admin' ? styles.admin : styles.editor}`}>
                {user.role}
              </span>
              <div className={styles.toggleRow}>
                <span className={styles.toggleLabel}>Active</span>
                <button
                  className={`${styles.toggle} ${activeIds.has(user.id) ? styles.on : ''}`}
                  onClick={() => toggleActive(user.id)}
                >
                  <span className={styles.knob} />
                </button>
              </div>
              <span className={styles.lastLogin}>Last login: {user.lastLogin}</span>
            </div>
            <button className={styles.actionBtn} title="Actions">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="6" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="18" r="1.5" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
