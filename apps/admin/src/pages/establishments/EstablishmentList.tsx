import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAdminPathPrefix } from '../../contexts/AdminPathPrefixContext';
import { useToast } from '../../components/Toast';
import {
  type AdminEstablishment,
  type EstablishmentListMode,
  fetchAdminEstablishments,
  formatAdminDate,
  isPendingSetup,
  matchesEstablishmentList,
  setEstablishmentAccountStatus,
  setupLabel,
  verificationLabel,
} from '../../lib/adminEstablishments';
import { supabase } from '../../lib/supabase';
import styles from '../users/UsersAdmin.module.css';

function StatusBadge({ row }: { row: AdminEstablishment }) {
  if (row.accountStatus === 'disabled') {
    return <span className={`${styles.badge} ${styles.tone_red}`}>Deactivated</span>;
  }
  if (isPendingSetup(row)) {
    return <span className={`${styles.badge} ${styles.tone_amber}`}>Pending setup</span>;
  }
  if (row.verificationStatus === 'approved') {
    return <span className={`${styles.badge} ${styles.tone_green}`}>{verificationLabel(row.verificationStatus)}</span>;
  }
  return <span className={`${styles.badge} ${styles.tone_neutral}`}>{setupLabel(row)}</span>;
}

function VisibilityBadge({ row }: { row: AdminEstablishment }) {
  if (row.publicVisible) return <span className={`${styles.badge} ${styles.tone_green}`}>Public</span>;
  return <span className={`${styles.badge} ${styles.tone_neutral}`}>Hidden</span>;
}

const TITLES: Record<EstablishmentListMode, string> = {
  all: 'All Establishments',
  pending: 'Pending Setup',
  deactivated: 'Deactivated',
};

const EMPTY: Record<EstablishmentListMode, string> = {
  all: 'No establishments yet. Use Add Establishment to invite a recognized business.',
  pending: 'No invitations waiting on password setup.',
  deactivated: 'No deactivated establishments.',
};

export function EstablishmentList({ mode }: { mode: EstablishmentListMode }) {
  const toast = useToast();
  const prefix = useAdminPathPrefix();
  const withPrefix = (path: string) => {
    if (!prefix) return path;
    return `${prefix.replace(/\/$/, '')}${path}`;
  };
  const detailHref = (id: string) => withPrefix(`/web/establishments/${id}`);

  const [rows, setRows] = useState<AdminEstablishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pendingDisable, setPendingDisable] = useState<AdminEstablishment | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminEstablishments(supabase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load establishments');
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
      if (!matchesEstablishmentList(row, mode)) return false;
      if (!q) return true;
      return [row.businessName, row.fullName, row.email, row.businessType, row.lgu, row.address].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [rows, query, mode]);

  const confirmDisable = async () => {
    if (!pendingDisable) return;
    setSaving(true);
    try {
      await setEstablishmentAccountStatus(supabase, pendingDisable.id, 'disabled');
      toast(`${pendingDisable.businessName} deactivated`, 'success');
      setPendingDisable(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not deactivate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activate = async (row: AdminEstablishment) => {
    try {
      await setEstablishmentAccountStatus(supabase, row.id, 'active');
      toast(`${row.businessName} activated`, 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not activate', 'error');
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerActions}>
          <label className={styles.search}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              placeholder="Search establishments…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          {mode === 'all' ? (
            <Link className={styles.primaryBtn} to={withPrefix('/web/establishments/add')}>
              Add Establishment
            </Link>
          ) : null}
        </div>
      </header>

      {error ? <p className={styles.loadError}>{error}</p> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Establishment</th>
              <th>Contact</th>
              <th>Category</th>
              <th>Location</th>
              <th>{mode === 'pending' ? 'Invited' : 'Added'}</th>
              <th>Status</th>
              {mode === 'all' ? <th>Public</th> : null}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.rowCard}>
                <td colSpan={mode === 'all' ? 8 : 7} className={styles.empty}>
                  Loading establishments…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className={styles.rowCard}>
                <td colSpan={mode === 'all' ? 8 : 7} className={styles.empty}>
                  {error ? 'Could not load establishments.' : EMPTY[mode]}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className={styles.rowCard}>
                  <td>
                    <span className={styles.userName}>{row.businessName}</span>
                    {row.email ? <span className={styles.userMeta}>{row.email}</span> : null}
                  </td>
                  <td>
                    {row.fullName || '—'}
                    {row.phone ? <span className={styles.userMeta}>{row.phone}</span> : null}
                  </td>
                  <td>{row.businessType || '—'}</td>
                  <td>
                    {row.lgu || '—'}
                    {row.address ? <span className={styles.userMeta}>{row.address}</span> : null}
                  </td>
                  <td>{formatAdminDate(row.invitedAt || row.createdAt)}</td>
                  <td>
                    <StatusBadge row={row} />
                  </td>
                  {mode === 'all' ? (
                    <td>
                      <VisibilityBadge row={row} />
                    </td>
                  ) : null}
                  <td>
                    <div className={styles.actions}>
                      <Link className={styles.actionBtn} to={detailHref(row.id)}>
                        View
                      </Link>
                      {row.accountStatus === 'active' && !isPendingSetup(row) ? (
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.danger}`}
                          onClick={() => setPendingDisable(row)}
                        >
                          Deactivate
                        </button>
                      ) : null}
                      {row.accountStatus === 'disabled' ? (
                        <button type="button" className={styles.actionBtn} onClick={() => void activate(row)}>
                          Activate
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDisable)}
        title={pendingDisable ? `Deactivate “${pendingDisable.businessName}”?` : 'Deactivate this account?'}
        message="They will not be able to sign in until you activate the account again. Public visibility stays under your control."
        confirmLabel="Deactivate"
        confirmingLabel="Deactivating…"
        confirming={saving}
        onConfirm={() => void confirmDisable()}
        onCancel={() => {
          if (!saving) setPendingDisable(null);
        }}
      />
    </div>
  );
}

export function AllEstablishmentsPage() {
  return <EstablishmentList mode="all" />;
}

export function PendingEstablishmentsPage() {
  return <EstablishmentList mode="pending" />;
}

export function DeactivatedEstablishmentsPage() {
  return <EstablishmentList mode="deactivated" />;
}
