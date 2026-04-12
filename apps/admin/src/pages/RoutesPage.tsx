import { routes } from '../data/mockData';
import styles from './RoutesPage.module.css';

export function RoutesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Routes</h1>
          <p>Manage tourist routes and itineraries.</p>
        </div>
        <button className={styles.addBtn}>+ Add Route</button>
      </div>

      <div className={styles.list}>
        {routes.map((route) => (
          <div key={route.id} className={styles.card}>
            <div className={styles.cardIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div className={styles.cardContent}>
              <h3>{route.name}</h3>
              <p className={styles.path}>{route.from} → {route.to}</p>
              <div className={styles.meta}>
                <span><strong>Duration:</strong> {route.duration}</span>
                <span><strong>Transport:</strong> {route.transport}</span>
              </div>
            </div>
            <span className={styles.badge}>active</span>
            <div className={styles.actions}>
              <button className={styles.editBtn}>Edit</button>
              <button className={styles.viewBtn}>View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
