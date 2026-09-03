import { useEffect, useId, useRef, useState } from 'react';
import { type AccountRole, accountRoleLabel } from '../../lib/adminUsers';
import styles from './UsersAdmin.module.css';

export type UserRoleFilter = 'all' | AccountRole;
export type UserStatusFilter = 'all' | 'active' | 'disabled';

const ROLES: UserRoleFilter[] = ['all', 'admin', 'user', 'establishment'];
const STATUSES: { value: UserStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Inactive' },
];

type Props = {
  role: UserRoleFilter;
  onRoleChange: (role: UserRoleFilter) => void;
  status?: UserStatusFilter;
  onStatusChange?: (status: UserStatusFilter) => void;
  showStatus?: boolean;
};

export function UsersFilterButton({
  role,
  onRoleChange,
  status = 'all',
  onStatusChange,
  showStatus = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const activeCount = (role !== 'all' ? 1 : 0) + (showStatus && status !== 'all' ? 1 : 0);

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

  return (
    <div className={styles.filterWrap} ref={wrapRef}>
      <button
        type="button"
        className={`${styles.filterBtn} ${activeCount ? styles.filterBtnActive : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filter
        {activeCount ? <span className={styles.filterCount}>{activeCount}</span> : null}
      </button>
      {open ? (
        <div className={styles.filterPanel} id={panelId} role="dialog" aria-label="Filter users">
          <p className={styles.filterHeading}>Role</p>
          <div className={styles.filterChips} role="group" aria-label="Role">
            {ROLES.map((value) => (
              <button
                key={value}
                type="button"
                className={`${styles.filterChip} ${role === value ? styles.filterChipActive : ''}`}
                onClick={() => onRoleChange(value)}
              >
                {value === 'all' ? 'All' : accountRoleLabel(value)}
              </button>
            ))}
          </div>
          {showStatus && onStatusChange ? (
            <>
              <p className={styles.filterHeading}>Status</p>
              <div className={styles.filterChips} role="group" aria-label="Status">
                {STATUSES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={`${styles.filterChip} ${status === item.value ? styles.filterChipActive : ''}`}
                    onClick={() => onStatusChange(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {activeCount ? (
            <button
              type="button"
              className={styles.filterClear}
              onClick={() => {
                onRoleChange('all');
                onStatusChange?.('all');
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
