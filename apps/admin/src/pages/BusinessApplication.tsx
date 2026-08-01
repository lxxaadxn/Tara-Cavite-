import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { businessApplications, processedLogs, type ApplicationStatus } from '../data/mockData';
import { useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import styles from './BusinessApplication.module.css';

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  pending: 'Pending Review',
  under_review: 'Under Review',
  approved: 'Approved',
};

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  pending: 'pending',
  under_review: 'review',
  approved: 'approved',
};

type FilterKey = 'all' | ApplicationStatus | 'flagged';

const PAGE_SIZE = 5;

export function BusinessApplication({ initialSection }: { initialSection?: 'inbox' | 'logs' }) {
  const prefix = useAdminPathPrefix();
  const reviewHref = (id: string) =>
    `${prefix ? prefix.replace(/\/$/, '') : ''}/web/business/review/${id}`;

  const [filter, setFilter] = useState<FilterKey>('all');
  const [page, setPage] = useState(1);
  const logsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (initialSection === 'logs' && logsRef.current) {
      logsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [initialSection]);

  const counts = useMemo(
    () => ({
      pending: businessApplications.filter((a) => a.status === 'pending').length,
      under_review: businessApplications.filter((a) => a.status === 'under_review').length,
      flagged: businessApplications.filter((a) => a.flagged).length,
      approved: businessApplications.filter((a) => a.status === 'approved').length,
    }),
    []
  );

  const visibleApps = useMemo(() => {
    if (filter === 'all') return businessApplications;
    if (filter === 'flagged') return businessApplications.filter((a) => a.flagged);
    return businessApplications.filter((a) => a.status === filter);
  }, [filter]);

  const pageCount = Math.max(1, Math.ceil(processedLogs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pagedLogs = processedLogs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'pending', label: 'Pending Review', count: counts.pending },
    { key: 'under_review', label: 'Under Review', count: counts.under_review },
    { key: 'flagged', label: 'Flagged', count: counts.flagged },
    { key: 'approved', label: 'Approved', count: counts.approved },
  ];

  return (
    <div className={styles.page}>
      <section id="inbox" className={styles.section}>
        <div className={styles.head}>
          <h1>Inbox Queue</h1>
          <select className={styles.rangeSelect} aria-label="Date range" defaultValue="Today">
            <option>Today</option>
            <option>This week</option>
            <option>This month</option>
          </select>
        </div>

        <div className={styles.filterRow}>
          <button
            type="button"
            className={`${styles.filterReset} ${filter === 'all' ? styles.filterResetActive : ''}`}
            onClick={() => setFilter('all')}
          >
            Filter
          </button>
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.filterTab} ${filter === t.key ? styles.filterTabActive : ''}`}
              onClick={() => setFilter(t.key)}
            >
              {t.label} <span className={styles.filterCount}>({t.count})</span>
            </button>
          ))}
        </div>

        <div className={styles.cards}>
          {visibleApps.length === 0 ? (
            <p className={styles.empty}>No applications match this filter.</p>
          ) : (
            visibleApps.map((app) => (
              <Link key={app.id} to={reviewHref(app.id)} className={styles.card}>
                <div className={styles.cardBody}>
                  <div className={styles.cardTop}>
                    <span className={styles.kicker}>Application Review</span>
                    <span className={`${styles.badge} ${styles[STATUS_CLASS[app.status]]}`}>
                      {STATUS_LABEL[app.status]}
                    </span>
                    {app.flagged ? <span className={`${styles.badge} ${styles.flagged}`}>Flagged</span> : null}
                  </div>
                  <p className={styles.cardTitle}>
                    {app.business} <span className={styles.cardRef}>({app.reference})</span>
                  </p>
                </div>
                <span className={styles.chevron} aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section id="logs" ref={logsRef} className={styles.section}>
        <h2 className={styles.sectionTitle}>Processed Logs</h2>
        <div className={styles.tableCard}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Reference ID</th>
                  <th>Business Name</th>
                  <th>LGU/City</th>
                  <th>Reviewed By</th>
                  <th>Processed Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.mono}>{log.reference}</td>
                    <td>{log.business}</td>
                    <td>{log.lgu}</td>
                    <td>{log.reviewedBy}</td>
                    <td>{log.processedDate}</td>
                    <td>
                      <span className={`${styles.badge} ${log.status === 'approved' ? styles.approved : styles.rejected}`}>
                        {log.status === 'approved' ? 'Approved' : 'Rejected'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              Prev
            </button>
            <span className={styles.pageInfo}>
              Page {currentPage} of {pageCount}
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage >= pageCount}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
