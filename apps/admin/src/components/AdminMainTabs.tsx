import { NavLink } from 'react-router-dom';
import { MAIN_ADMIN_NAV } from '../config/mainNav';
import { useAdminHref } from '../contexts/AdminPathPrefixContext';
import styles from './AdminMainTabs.module.css';

export function AdminMainTabs() {
  const href = useAdminHref;

  return (
    <nav className={styles.tabs} aria-label="Admin sections">
      {MAIN_ADMIN_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={href(item.to)}
          className={({ isActive }) => (isActive ? `${styles.tab} ${styles.active}` : styles.tab)}
          end={item.to === '/web/dashboard'}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
