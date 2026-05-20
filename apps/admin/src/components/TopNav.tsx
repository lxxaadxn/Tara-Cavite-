import styles from './TopNav.module.css';

export function TopNav() {
  return (
    <header className={styles.header}>
      <div className={styles.logo} aria-label="CaviTour Admin">
        <img src="/cavitour-logo.png" alt="" className={styles.logoMark} />
        <span className={styles.logoAdmin}>Admin</span>
      </div>
    </header>
  );
}
