import styles from './TopNav.module.css';

type TopNavProps = {
  onToggleSidebar?: () => void;
  onTogglePanel?: () => void;
  panelOpen?: boolean;
};

export function TopNav({ onToggleSidebar, onTogglePanel, panelOpen }: TopNavProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button type="button" className={styles.iconBtn} onClick={onToggleSidebar} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M9 4v16" />
          </svg>
        </button>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <span className={styles.crumbMuted}>Dashboards</span>
          <span className={styles.crumbSep}>/</span>
          <span className={styles.crumbCurrent}>Analytics</span>
        </nav>
      </div>

      <div className={styles.right}>
        <label className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m20 20-3-3" />
          </svg>
          <input type="text" placeholder="Search" aria-label="Search" />
          <kbd className={styles.kbd}>/</kbd>
        </label>

        <button type="button" className={styles.iconBtn} aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.badge} />
        </button>

        <button
          type="button"
          className={`${styles.iconBtn} ${panelOpen ? styles.iconBtnActive : ''}`}
          onClick={onTogglePanel}
          aria-label="Toggle activity panel"
          aria-pressed={panelOpen}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M15 4v16" />
          </svg>
        </button>
      </div>
    </header>
  );
}
