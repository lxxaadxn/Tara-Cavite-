import { panelActivities, panelContacts, panelNotifications } from '../data/mockData';
import type { PanelNotification } from '../data/mockData';
import styles from './ActivityPanel.module.css';

function NotificationIcon({ kind }: { kind: PanelNotification['kind'] }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const;
  switch (kind) {
    case 'signup':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </svg>
      );
    case 'edit':
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case 'remove':
      return (
        <svg {...common}>
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
      );
    case 'add':
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
  }
}

export function ActivityPanel({ onClose }: { onClose?: () => void }) {
  return (
    <aside className={styles.panel} aria-label="Activity panel">
      <div className={styles.closeRow}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Hide panel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>

      <section className={styles.section}>
        <h3 className={styles.heading}>Notifications</h3>
        <ul className={styles.list}>
          {panelNotifications.map((n) => (
            <li key={n.id} className={styles.item}>
              <span className={`${styles.notifIcon} ${styles[n.kind]}`}>
                <NotificationIcon kind={n.kind} />
              </span>
              <div className={styles.itemBody}>
                <span className={styles.itemText}>{n.text}</span>
                <span className={styles.itemTime}>{n.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Activities</h3>
        <ul className={styles.list}>
          {panelActivities.map((a) => (
            <li key={a.id} className={styles.item}>
              <span className={styles.avatar}>{a.initials}</span>
              <div className={styles.itemBody}>
                <span className={styles.itemText}>{a.text}</span>
                <span className={styles.itemTime}>{a.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h3 className={styles.heading}>Contacts</h3>
        <ul className={styles.list}>
          {panelContacts.map((c) => (
            <li key={c.id} className={styles.item}>
              <span className={styles.avatar}>{c.initials}</span>
              <span className={styles.contactName}>{c.name}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
