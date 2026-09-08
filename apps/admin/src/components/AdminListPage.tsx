import { useMemo, useState, type ReactNode } from 'react';
import styles from './AdminListPage.module.css';

export type StatItem = { label: string; value: string | number };

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
};

type Props<T> = {
  title: string;
  description?: string;
  rows: T[];
  columns: Column<T>[];
  stats: StatItem[];
  searchPlaceholder: string;
  filterRow: (row: T, query: string) => boolean;
  statusFilter?: {
    label: string;
    options: { value: string; label: string }[];
    match: (row: T, value: string) => boolean;
  };
  primaryActionLabel?: string;
  loading?: boolean;
  error?: string | null;
  sourceNote?: string;
  emptyMessage?: string;
};

/** The page title comes from the nav chrome, so only the copy is rendered here. */
export function AdminListPage<T extends { id: string }>({
  description,
  rows,
  columns,
  stats,
  searchPlaceholder,
  filterRow,
  statusFilter,
  primaryActionLabel,
  loading = false,
  error = null,
  sourceNote,
  emptyMessage = 'No records match your search.',
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (!filterRow(row, query.trim().toLowerCase())) return false;
      if (statusFilter && status !== 'all' && !statusFilter.match(row, status)) return false;
      return true;
    });
  }, [rows, query, status, filterRow, statusFilter]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        {description ? <p>{description}</p> : null}
        {sourceNote ? <p className={styles.sourceNote}>{sourceNote}</p> : null}
      </header>

      {error && <p className={styles.errorBanner}>{error}</p>}

      <div className={styles.stats}>
        {stats.map((s) => (
          <div key={s.label} className={styles.stat}>
            <span className={styles.statLabel}>{s.label}</span>
            <span className={styles.statValue}>{s.value}</span>
          </div>
        ))}
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {statusFilter && (
          <select
            className={styles.filter}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label={statusFilter.label}
          >
            <option value="all">All statuses</option>
            {statusFilter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
        {primaryActionLabel && (
          <button type="button" className={styles.primaryBtn}>
            {primaryActionLabel}
          </button>
        )}
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.empty}>
                  Loading from Supabase…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.empty}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className={styles.row}>
                  {columns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                  <td>
                    <button type="button" className={styles.actionBtn}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const BADGE_CLASS: Record<string, string> = {
  published: 'badgePublished',
  draft: 'badgeDraft',
  hidden: 'badgeHidden',
  flagged: 'badgeFlagged',
  active: 'badgeActive',
  shared: 'badgeShared',
  private: 'badgePrivate',
};

export function StatusBadge({
  status,
  tone,
}: {
  status: string;
  tone?: keyof typeof BADGE_CLASS;
}) {
  const mod = BADGE_CLASS[tone ?? status.toLowerCase()] ?? 'badgeHidden';
  return <span className={`${styles.badge} ${styles[mod]}`}>{status}</span>;
}
