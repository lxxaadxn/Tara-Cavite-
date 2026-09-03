import styles from './AdminBrandMark.module.css';

type Props = {
  /** `onGreen` for the sidebar; `onLight` for login and other light surfaces. */
  variant?: 'onGreen' | 'onLight';
};

export function AdminBrandMark({ variant = 'onGreen' }: Props) {
  return (
    <span
      className={`${styles.wordmark} ${variant === 'onLight' ? styles.onLight : styles.onGreen}`}
      aria-label="Tara, Cavite!"
    >
      <span className={styles.tara}>Tara</span>
      <span className={styles.cavite}>, Cavite!</span>
    </span>
  );
}
