import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchAdminNotifications,
  markAdminNotificationsRead,
  subscribeAdminNotifications,
  type AdminNotification,
} from '../lib/adminNotifications';
import { readAdminPreferences } from '../lib/adminProfile';
import { formatAdminRelative } from '../lib/adminUsers';
import { supabase } from '../lib/supabase';
import styles from './NotificationsBell.module.css';

export function NotificationsBell() {
  const { session } = useAuth();
  const prefix = useAdminPathPrefix();
  const adminId = session?.user?.id ?? '';
  const prefs = useMemo(() => readAdminPreferences(session?.user), [session?.user]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<AdminNotification[]>([]);

  const href = (path: string) => (prefix ? `${prefix.replace(/\/$/, '')}${path}` : path);

  const load = useCallback(async (): Promise<AdminNotification[]> => {
    if (!adminId) {
      setRows([]);
      return [];
    }
    try {
      const next = await fetchAdminNotifications(supabase, adminId, prefs);
      setRows(next);
      return next;
    } catch {
      setRows([]);
      return [];
    }
  }, [adminId, prefs]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!adminId) return;
    const channel = subscribeAdminNotifications(supabase, () => void load());
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [adminId, load]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const unread = rows.filter((row) => !row.read).length;

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;

    const fresh = await load();
    const unreadIds = fresh.filter((row) => !row.read).map((row) => row.id);
    if (unreadIds.length === 0) return;
    try {
      await markAdminNotificationsRead(supabase, adminId, unreadIds);
      setRows((current) => current.map((row) => ({ ...row, read: true })));
    } catch {
      /* the list still renders; the badge just lingers until the next load */
    }
  };

  const rowHref = (row: AdminNotification): string => {
    if (row.kind === 'establishment_announcement') return href('/web/tourism/announcements');
    if (row.kind === 'review_reported') return href('/web/tourism/reviews');
    return href(`/web/establishments/${row.establishmentOwnerId ?? ''}`);
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.bell} ${open ? styles.bellOpen : ''}`}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => void toggle()}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 ? <span className={styles.badge}>{unread > 9 ? '9+' : unread}</span> : null}
      </button>

      {open ? (
        <div className={styles.panel} role="menu" aria-label="Notifications">
          <div className={styles.panelHead}>Notifications</div>
          {rows.length === 0 ? (
            <p className={styles.empty}>Nothing new. Establishment activity shows up here.</p>
          ) : (
            <ul className={styles.list}>
              {rows.map((row) => (
                <li key={row.id}>
                  <Link
                    to={rowHref(row)}
                    className={styles.item}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.itemTitle}>{row.title}</span>
                    <span className={styles.itemBody}>{row.body}</span>
                    <span className={styles.itemTime}>{formatAdminRelative(row.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
