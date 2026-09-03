import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePageHeader } from '../../contexts/PageHeaderContext';
import { useToast } from '../../components/Toast';
import {
  type AdminAuditRow,
  auditActionLabel,
  auditEntityLabel,
  downloadAuditCsv,
  fetchAdminAuditLog,
  formatAdminDate,
} from '../../lib/adminAuditLog';
import { supabase } from '../../lib/supabase';
import table from '../users/UsersAdmin.module.css';
import styles from './AuditLogPage.module.css';

function startOfDay(isoDate: string): number {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.getTime();
}

function endOfDay(isoDate: string): number {
  const d = new Date(`${isoDate}T23:59:59.999`);
  return d.getTime();
}

function ActionBadge({ action }: { action: AdminAuditRow['action'] }) {
  const tone = action === 'insert' ? table.tone_green : action === 'delete' ? table.tone_red : table.tone_amber;
  return <span className={`${table.badge} ${tone}`}>{auditActionLabel(action)}</span>;
}

export function AuditLogPage() {
  const toast = useToast();
  usePageHeader('Audit log', null);

  const [rows, setRows] = useState<AdminAuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [actor, setActor] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminAuditLog(supabase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const actors = useMemo(() => {
    const set = new Set(rows.map((r) => r.actorEmail).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (actor !== 'all' && row.actorEmail !== actor) return false;
      const t = row.occurredAt ? new Date(row.occurredAt).getTime() : 0;
      if (fromDate && t < startOfDay(fromDate)) return false;
      if (toDate && t > endOfDay(toDate)) return false;
      if (!needle) return true;
      return `${row.summary} ${row.actorEmail} ${auditEntityLabel(row.entity)} ${auditActionLabel(row.action)}`
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, query, actor, fromDate, toDate]);

  const exportCsv = () => {
    if (!filtered.length) {
      toast('Nothing to export for the current filters', 'info');
      return;
    }
    downloadAuditCsv(filtered);
    toast('Audit log downloaded', 'success');
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <label className={table.search}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="Search action, admin, area…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select className={styles.select} value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Admin">
          <option value="all">All admins</option>
          {actors.map((email) => (
            <option key={email} value={email}>
              {email}
            </option>
          ))}
        </select>
        <label className={styles.dateField}>
          <span>From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>
        <label className={styles.dateField}>
          <span>To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>
        <button type="button" className={table.primaryBtn} onClick={exportCsv} disabled={loading}>
          Export CSV
        </button>
      </div>

      {error ? <p className={table.loadError}>{error}</p> : null}
      <p className={styles.hint}>
        {loading
          ? 'Loading…'
          : `${filtered.length} event${filtered.length === 1 ? '' : 's'} · catalog, CMS, users, and establishments`}
      </p>

      <div className={table.tableWrap}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Area</th>
              <th>What changed</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={table.rowCard}>
                <td colSpan={5} className={table.empty}>
                  Loading audit log…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className={table.rowCard}>
                <td colSpan={5} className={table.empty}>
                  No events match these filters. Edit a listing, CMS page, or account and it will show up here.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className={table.rowCard}>
                  <td>{formatAdminDate(row.occurredAt)}</td>
                  <td>{row.actorEmail}</td>
                  <td>
                    <ActionBadge action={row.action} />
                  </td>
                  <td>{auditEntityLabel(row.entity)}</td>
                  <td>
                    <span className={table.userName}>{row.summary}</span>
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
