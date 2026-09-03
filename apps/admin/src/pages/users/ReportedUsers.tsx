import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminPathPrefix } from '../../contexts/AdminPathPrefixContext';
import { useToast } from '../../components/Toast';
import {
  type UserReportRow,
  accountRoleLabel,
  fetchOpenUserReports,
  formatAdminDate,
  resolveUserReport,
} from '../../lib/adminUsers';
import { supabase } from '../../lib/supabase';
import styles from './UsersAdmin.module.css';
import { UsersFilterButton, type UserRoleFilter } from './UsersFilter';

export function ReportedUsers() {
  const toast = useToast();
  const prefix = useAdminPathPrefix();
  const profileHref = (id: string) => {
    const path = `/web/users/${id}`;
    if (!prefix) return path;
    return `${prefix.replace(/\/$/, '')}${path}`;
  };

  const [rows, setRows] = useState<UserReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchOpenUserReports(supabase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (roleFilter !== 'all' && row.userRole !== roleFilter) return false;
      if (!q) return true;
      return [row.userName, row.userEmail, row.reason, accountRoleLabel(row.userRole)].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [rows, query, roleFilter]);

  const resolve = async (id: string) => {
    try {
      await resolveUserReport(supabase, id);
      toast('Report resolved', 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not resolve report', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <label className={styles.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search reports…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <UsersFilterButton role={roleFilter} onRoleChange={setRoleFilter} />
      </header>

      {error ? <p className={styles.loadError}>{error}</p> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Reason</th>
              <th>Reported</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.rowCard}>
                <td colSpan={4} className={styles.empty}>
                  Loading reports…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className={styles.rowCard}>
                <td colSpan={4} className={styles.empty}>
                  No open reports.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className={styles.rowCard}>
                  <td>
                    <span className={styles.userName}>{row.userName}</span>
                    <span className={styles.userMeta}>{row.userEmail}</span>
                  </td>
                  <td>
                    {row.reason}
                    {row.notes ? <span className={styles.userMeta}>{row.notes}</span> : null}
                  </td>
                  <td>{formatAdminDate(row.createdAt)}</td>
                  <td>
                    <div className={styles.actions}>
                      <Link className={styles.actionBtn} to={profileHref(row.userId)}>
                        View
                      </Link>
                      <button type="button" className={styles.actionBtn} onClick={() => void resolve(row.id)}>
                        Resolve
                      </button>
                    </div>
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
