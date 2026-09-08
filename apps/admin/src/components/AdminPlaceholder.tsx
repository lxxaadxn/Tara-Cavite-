import styles from './AdminPlaceholder.module.css';

type Props = {
  title: string;
  description: string;
  bullets: string[];
};

/** The page title comes from the nav chrome, so only the copy is rendered here. */
export function AdminPlaceholder({ description, bullets }: Props) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p>{description}</p>
      </header>
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Admin checklist</h2>
        <ul className={styles.list}>
          {bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <p className={styles.note}>
          Wire this screen to your API (e.g. Supabase) when backend endpoints are ready.
        </p>
      </div>
    </div>
  );
}
