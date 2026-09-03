import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAdminHref, useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';
import { usePageHeaderState } from '../contexts/PageHeaderContext';
import { navLabelForPath } from '../config/mainNav';
import { adminAccountFromUser } from '../lib/adminAccount';
import styles from './TopNav.module.css';

export function TopNav() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routePrefix = useAdminPathPrefix();
  const profileHref = useAdminHref('/web/profile');
  const account = adminAccountFromUser(session?.user);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const override = usePageHeaderState();
  const title = override.title ?? navLabelForPath(location.pathname, routePrefix);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointer = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!profileRef.current?.contains(target)) setProfileOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await signOut();
    if (routePrefix) {
      window.location.replace('/');
      return;
    }
    navigate('/login', { replace: true });
  };

  return (
    <header className={styles.header}>
      {title ? <h1 className={styles.pageTitle}>{title}</h1> : null}
      <div className={styles.spacer} />

      <div className={styles.right}>
        {override.action ? (
          <button type="submit" form={override.action.formId} className={styles.primaryBtn}>
            {override.action.label}
          </button>
        ) : null}

        <div className={styles.profileWrap} ref={profileRef}>
          <button
            type="button"
            className={`${styles.profileBtn} ${profileOpen ? styles.profileBtnOpen : ''}`}
            aria-label={account.email !== '—' ? `Account menu for ${account.email}` : 'Admin profile'}
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => setProfileOpen((v) => !v)}
          >
            {account.avatarUrl ? (
              <img className={styles.profileAvatarImg} src={account.avatarUrl} alt="" />
            ) : (
              <span className={styles.profileAvatar}>{account.initials}</span>
            )}
            <span className={styles.profileIdentity}>
              <span className={styles.profileName}>{account.displayName}</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {profileOpen ? (
            <div className={styles.profileMenu} role="menu" aria-label="Account">
              <div className={styles.profileMenuHeader}>
                {account.avatarUrl ? (
                  <img className={styles.profileMenuAvatarImg} src={account.avatarUrl} alt="" />
                ) : (
                  <span className={styles.profileMenuAvatar}>{account.initials}</span>
                )}
                <div className={styles.profileMenuMeta}>
                  <span className={styles.profileMenuName}>{account.displayName}</span>
                  <span className={styles.profileMenuEmail}>{account.email}</span>
                  <span className={styles.profileMenuRole}>{account.role}</span>
                </div>
              </div>
              <Link
                to={profileHref}
                className={styles.profileMenuItem}
                role="menuitem"
                onClick={() => setProfileOpen(false)}
              >
                View profile
              </Link>
              <button type="button" className={styles.profileMenuLogout} role="menuitem" onClick={() => void handleLogout()}>
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
