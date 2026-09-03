import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminPathPrefix } from '../../contexts/AdminPathPrefixContext';
import { useToast } from '../../components/Toast';
import {
  type AdminTraveler,
  type UserActivity,
  accountRoleLabel,
  createUserReport,
  fetchAdminTraveler,
  fetchUserActivity,
  formatAdminDate,
  formatAdminRelative,
  setListedAccountStatus,
} from '../../lib/adminUsers';
import { supabase } from '../../lib/supabase';
import styles from './UsersAdmin.module.css';

function StatusBadge({ status }: { status: AdminTraveler['accountStatus'] }) {
  if (status === 'disabled') return <span className={`${styles.badge} ${styles.tone_red}`}>Inactive</span>;
  if (status === 'deleted') return <span className={`${styles.badge} ${styles.tone_neutral}`}>Deleted</span>;
  return <span className={`${styles.badge} ${styles.tone_green}`}>Active</span>;
}

export function UserDetail() {
  const { userId = '' } = useParams();
  const toast = useToast();
  const { session } = useAuth();
  const prefix = useAdminPathPrefix();
  const listHref = prefix ? `${prefix.replace(/\/$/, '')}/web/users` : '/web/users';

  const [user, setUser] = useState<AdminTraveler | null>(null);
  const [activity, setActivity] = useState<UserActivity>({ visits: [], reviews: [], routes: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDisable, setPendingDisable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flagOpen, setFlagOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [flagging, setFlagging] = useState(false);

  const reload = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [row, act] = await Promise.all([
        fetchAdminTraveler(supabase, userId),
        fetchUserActivity(supabase, userId),
      ]);
      setUser(row);
      setActivity(act);
      if (!row) setError('User not found.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const confirmDisable = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setListedAccountStatus(supabase, user, 'disabled');
      toast(`${user.displayName} deactivated`, 'success');
      setPendingDisable(false);
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not deactivate', 'error');
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!user) return;
    try {
      await setListedAccountStatus(supabase, user, 'active');
      toast(`${user.displayName} activated`, 'success');
      await reload();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not activate', 'error');
    }
  };

  const submitReport = async () => {
    if (!user) return;
    setFlagging(true);
    try {
      await createUserReport(supabase, {
        userId: user.id,
        reason,
        notes,
        createdBy: session?.user?.id ?? null,
      });
      toast('User flagged as reported', 'success');
      setFlagOpen(false);
      setReason('');
      setNotes('');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create report', 'error');
    } finally {
      setFlagging(false);
    }
  };

  return (
    <div className={styles.detailPage}>
      <Link to={listHref} className={styles.backLink}>
        ← All users
      </Link>
      <header className={styles.header}>
        <h1>User profile</h1>
      </header>

      {error ? <p className={styles.loadError}>{error}</p> : null}
      {loading ? <p className={styles.loadError}>Loading…</p> : null}

      {user ? (
        <>
          <div className={styles.card}>
            <div className={styles.profileHeader}>
              {user.avatarUrl ? (
                <img className={styles.profileAvatarImg} src={user.avatarUrl} alt="" />
              ) : (
                <div className={styles.profileAvatar}>{user.initials}</div>
              )}
              <div>
                <h2 className={styles.profileName}>{user.displayName}</h2>
                <StatusBadge status={user.accountStatus} />
              </div>
            </div>
            <div className={styles.fields}>
              <div className={styles.row}>
                <span className={styles.label}>Username</span>
                <p className={styles.value}>{user.username ? `@${user.username}` : '—'}</p>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Email</span>
                <p className={styles.value}>{user.email || '—'}</p>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Role</span>
                <p className={styles.value}>{accountRoleLabel(user.role)}</p>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Phone</span>
                <p className={styles.value}>{user.phone || '—'}</p>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Last used</span>
                <p className={styles.value}>{formatAdminRelative(user.lastUsedAt)}</p>
              </div>
              <div className={styles.row}>
                <span className={styles.label}>Joined</span>
                <p className={styles.value}>{formatAdminDate(user.createdAt)}</p>
              </div>
            </div>
            <div className={styles.actions} style={{ marginTop: 16 }}>
              {user.role === 'admin' ? null : user.accountStatus === 'active' ? (
                <button type="button" className={`${styles.actionBtn} ${styles.danger}`} onClick={() => setPendingDisable(true)}>
                  Deactivate account
                </button>
              ) : (
                <button type="button" className={styles.actionBtn} onClick={() => void activate()}>
                  Activate account
                </button>
              )}
              <button type="button" className={styles.actionBtn} onClick={() => setFlagOpen((v) => !v)}>
                Flag as reported
              </button>
            </div>
            {flagOpen ? (
              <div className={styles.flagForm}>
                <input
                  placeholder="Reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={500}
                />
                <textarea
                  placeholder="Notes (optional)"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button type="button" className={styles.primaryBtn} onClick={() => void submitReport()} disabled={flagging}>
                  {flagging ? 'Saving…' : 'Submit report'}
                </button>
              </div>
            ) : null}
          </div>

          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Check-ins</h3>
            {activity.visits.length === 0 ? (
              <p className={styles.userMeta}>No check-ins yet.</p>
            ) : (
              activity.visits.map((v) => (
                <div key={v.id} className={styles.activityItem}>
                  <span className={styles.activityTitle}>{v.placeName}</span>
                  <span className={styles.activityMeta}>
                    {v.source || 'visit'} · {formatAdminDate(v.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Reviews</h3>
            {activity.reviews.length === 0 ? (
              <p className={styles.userMeta}>No reviews yet.</p>
            ) : (
              activity.reviews.map((r) => (
                <div key={r.id} className={styles.activityItem}>
                  <span className={styles.activityTitle}>
                    {r.placeName} · {r.rating}/5
                  </span>
                  <span className={styles.activityMeta}>
                    {r.body} · {formatAdminDate(r.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.sectionTitle}>Routes</h3>
            {activity.routes.length === 0 ? (
              <p className={styles.userMeta}>No saved routes yet.</p>
            ) : (
              activity.routes.map((r) => (
                <div key={r.id} className={styles.activityItem}>
                  <span className={styles.activityTitle}>{r.name || `${r.fromLocation} → ${r.toLocation}`}</span>
                  <span className={styles.activityMeta}>
                    {r.fromLocation} → {r.toLocation} · {formatAdminDate(r.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      ) : null}

      <ConfirmDialog
        open={pendingDisable}
        title={user ? `Deactivate “${user.displayName}”?` : 'Deactivate this user?'}
        message="They will be signed out of web and mobile and cannot use the app until you activate them again."
        confirmLabel="Deactivate"
        confirmingLabel="Deactivating…"
        confirming={saving}
        onConfirm={() => void confirmDisable()}
        onCancel={() => {
          if (!saving) setPendingDisable(false);
        }}
      />
    </div>
  );
}
