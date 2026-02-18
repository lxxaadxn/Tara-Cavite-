import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './TopNav.module.css';

export function TopNav() {
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    if (profileOpen) document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [profileOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>C</div>
        <span>CaviTour Admin</span>
      </div>
      <div className={styles.search}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          placeholder="Search tourist spots, routes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      <div className={styles.right}>
        <button className={styles.notification}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className={styles.badge} />
        </button>
        <div className={styles.profileWrap} ref={profileRef}>
          <button className={styles.profile} onClick={() => setProfileOpen(!profileOpen)}>
            <div className={styles.avatar}>AD</div>
            <span>Admin</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {profileOpen && (
            <div className={styles.dropdown}>
              <button onClick={() => { setProfileOpen(false); navigate('/profile'); }}>Profile</button>
              <button onClick={() => { setProfileOpen(false); navigate('/settings'); }}>Settings</button>
              <button onClick={() => setProfileOpen(false)}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
