import { stats, recentActivity } from '../data/mockData';
import { useAdminPlatform } from '../hooks/useAdminPlatform';
import styles from './Dashboard.module.css';

export function Dashboard() {
  const { platform } = useAdminPlatform();
  const scope =
    platform === 'web'
      ? 'Web app, marketing site, and public search experience.'
      : 'Mobile app: Map, itineraries, saved lists, and commuters.';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Dashboard</h1>
        <p>
          Welcome back! {scope}
        </p>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Tourist Spots</span>
            <span className={styles.statValue}>{stats.touristSpots}</span>
            <span className={styles.statGrowth}>+{stats.spotsGrowth}%</span>
          </div>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Total Routes</span>
            <span className={styles.statValue}>{stats.routes}</span>
            <span className={styles.statGrowth}>+{stats.routesGrowth}%</span>
          </div>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="3" />
              <circle cx="18" cy="18" r="3" />
              <path d="M9 9l6 6" strokeDasharray="2 2" />
            </svg>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Active Users</span>
            <span className={styles.statValue}>{stats.activeUsers.toLocaleString()}</span>
            <span className={styles.statGrowth}>+{stats.usersGrowth}%</span>
          </div>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statContent}>
            <span className={styles.statLabel}>Most Visited Spot</span>
            <span className={styles.statValue}>{stats.mostVisited.name}</span>
            <span className={styles.statMeta}>{stats.mostVisited.visits.toLocaleString()} visits</span>
          </div>
          <div className={styles.statIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3>Tourist Spots Map</h3>
            <div className={styles.cardActions}>
              <button className={styles.iconBtn} title="Filter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                </svg>
              </button>
              <select className={styles.select}>
                <option>All Cities</option>
                <option>Cavite</option>
                <option>Batangas</option>
              </select>
            </div>
          </div>
          <div className={styles.mapPlaceholder}>
            <div className={styles.mapGrid} />
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className={styles.mapPin}
                style={{
                  left: `${15 + (i % 3) * 35}%`,
                  top: `${20 + Math.floor(i / 3) * 35}%`,
                }}
                title={`Location ${i}`}
              />
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <h3>Recent Activity</h3>
          <div className={styles.activityList}>
            {recentActivity.map((item) => (
              <div key={item.id} className={styles.activityItem}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <div className={styles.activityContent}>
                  <span>{item.text}</span>
                  <span className={styles.activityTime}>{item.time}</span>
                </div>
                <span className={`${styles.badge} ${item.status === 'approved' ? styles.badgeApproved : styles.badgePending}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
