import { useAdminPlatform } from '../hooks/useAdminPlatform';
import { AdminMainTabs } from './AdminMainTabs';
import styles from './TopNav.module.css';

export function TopNav() {
  const { platform } = useAdminPlatform();

  return (
    <header className={styles.header}>
      <div className={styles.logo} aria-label="CaviTour Admin">
        <img src="/cavitour-logo.png" alt="" className={styles.logoMark} />
        <span className={styles.logoAdmin}>Admin</span>
        <span className={styles.platformBadge}>{platform === 'mobile' ? 'Mobile' : 'Web'}</span>
      </div>
      <AdminMainTabs />
    </header>
  );
}
