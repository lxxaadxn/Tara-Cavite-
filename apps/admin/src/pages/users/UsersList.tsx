import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAdminPathPrefix } from '../../contexts/AdminPathPrefixContext';
import { useToast } from '../../components/Toast';
import {
  type AccountRole,
  type AdminTraveler,
  accountRoleLabel,
  fetchAdminTravelers,
  formatAdminDate,
  formatAdminRelative,
  isRecentlyActive,
  setListedAccountStatus,
} from '../../lib/adminUsers';
import { supabase } from '../../lib/supabase';
import styles from './UsersAdmin.module.css';
import { UsersFilterButton, type UserRoleFilter, type UserStatusFilter } from './UsersFilter';

type Mode = 'all' | 'active';

function StatusBadge({ status }: { status: AdminTraveler['accountStatus'] }) {
  if (status === 'disabled') return <span className={`${styles.badge} ${styles.tone_red}`}>Inactive</span>;
  if (status === 'deleted') return <span className={`${styles.badge} ${styles.tone_neutral}`}>Deleted</span>;
  return <span className={`${styles.badge} ${styles.tone_green}`}>Active</span>;
}

function PresenceBadge({ lastUsedAt }: { lastUsedAt: string | null }) {
  if (isRecentlyActive(lastUsedAt)) {
    return <span className={`${styles.badge} ${styles.tone_green}`}>Active</span>;
  }
  return <span className={`${styles.badge} ${styles.tone_neutral}`}>Idle</span>;
}

function RoleBadge({ role }: { role: AccountRole }) {
  const tone = role === 'admin' ? styles.tone_admin : role === 'establishment' ? styles.tone_amber : styles.tone_neutral;
  return <span className={`${styles.badge} ${tone}`}>{accountRoleLabel(role)}</span>;
}

export function UsersList({ mode }: { mode: Mode }) {
  const toast = useToast();
  const prefix = useAdminPathPrefix();
  const href = (path: string) => {
    if (!prefix) return path;
    return `${prefix.replace(/\/$/, '')}${path}`;
  };
  const viewHref = (user: AdminTraveler) =>
    user.role === 'establishment' ? href(`/web/establishments/${user.id}`) : href(`/web/users/${user.id}`);
  const [rows, setRows] = useState<AdminTraveler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all');
  const [pending, setPending] = useState<AdminTraveler | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminTravelers(supabase));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (mode === 'active' && row.accountStatus !== 'active') return false;
      if (roleFilter !== 'all' && row.role !== roleFilter) return false;
      if (mode === 'all' && statusFilter === 'active' && row.accountStatus !== 'active') return false;
      if (mode === 'all' && statusFilter === 'disabled' && row.accountStatus === 'active') return false;
      if (!q) return true;
      return [row.displayName, row.username, row.email, accountRoleLabel(row.role)].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
    if (mode !== 'active') return list;
    return list.slice().sort((a, b) => {
      const at = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
      const bt = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
      return bt - at;
    });
  }, [rows, query, mode, roleFilter, statusFilter]);

  const confirmDisable = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await setListedAccountStatus(supabase, pending, 'disabled');
      toast(`${pending.displayName} deactivated`, 'success');
      setPending(null);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not deactivate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activate = async (user: AdminTraveler) => {
    try {
      await setListedAccountStatus(supabase, user, 'active');
      toast(`${user.displayName} activated`, 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not activate', 'error');
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
            placeholder="Search name, email, role…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <UsersFilterButton
          role={roleFilter}
          onRoleChange={setRoleFilter}
          showStatus={mode === 'all'}
          status={statusFilter}
          onStatusChange={setStatusFilter}
        />
      </header>

      {error ? <p className={styles.loadError}>{error}</p> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>{mode === 'active' ? 'Last used' : 'Joined'}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className={styles.rowCard}>
                <td colSpan={6} className={styles.empty}>
                  Loading users…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr className={styles.rowCard}>
                <td colSpan={6} className={styles.empty}>
                  No users match your search.
                </td>
              </tr>
            ) : (
              filtered.map((user) => (
                <tr key={user.id} className={styles.rowCard}>
                  <td>
                    <div className={styles.userCell}>
                      {user.avatarUrl ? (
                        <img className={styles.avatarImg} src={user.avatarUrl} alt="" />
                      ) : (
                        <span className={styles.avatar}>{user.initials}</span>
                      )}
                      <span>
                        <span className={styles.userName}>{user.displayName}</span>
                        {user.username ? <span className={styles.userMeta}>@{user.username}</span> : null}
                      </span>
                    </div>
                  </td>
                  <td>{user.email || '—'}</td>
                  <td>
                    <RoleBadge role={user.role} />
                  </td>
                  <td>
                    {mode === 'active' ? <PresenceBadge lastUsedAt={user.lastUsedAt} /> : <StatusBadge status={user.accountStatus} />}
                  </td>
                  <td>
                    {mode === 'active' ? (
                      <span title={user.lastUsedAt ? formatAdminDate(user.lastUsedAt) : undefined}>
                        {formatAdminRelative(user.lastUsedAt)}
                      </span>
                    ) : (
                      formatAdminDate(user.createdAt)
                    )}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link className={styles.actionBtn} to={viewHref(user)}>
                        View
                      </Link>
                      {user.role === 'admin' ? null : user.accountStatus === 'active' ? (
                        <button type="button" className={`${styles.actionBtn} ${styles.danger}`} onClick={() => setPending(user)}>
                          Deactivate
                        </button>
                      ) : (
                        <button type="button" className={styles.actionBtn} onClick={() => void activate(user)}>
                          Activate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(pending)}
        title={pending ? `Deactivate “${pending.displayName}”?` : 'Deactivate this user?'}
        message="They will be signed out of web and mobile and cannot use the app until you activate them again."
        confirmLabel="Deactivate"
        confirmingLabel="Deactivating…"
        confirming={saving}
        onConfirm={() => void confirmDisable()}
        onCancel={() => {
          if (!saving) setPending(null);
        }}
      />
    </div>
  );
}

export function AllUsersPage() {
  return <UsersList mode="all" />;
}

export function ActiveUsersPage() {
  return <UsersList mode="active" />;
}
