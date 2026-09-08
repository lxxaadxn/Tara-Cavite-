import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AdminBrandMark } from '@admin/components/AdminBrandMark';
import { ToastProvider } from '@admin/components/Toast';
import { EstablishmentAddModal } from '@admin/pages/establishments/EstablishmentAdd';
import { supabase } from '../lib/supabase';
import {
  ESTABLISHMENT_SETUP_PATH,
  fetchOwnEstablishment,
  isEstablishmentDashboardReady,
  isEstablishmentPendingSetup,
} from '../lib/accountHome';
import { AnalyticsPanel } from './establishment/AnalyticsPanel';
import { AnnouncementsPanel } from './establishment/AnnouncementsPanel';
import { EstablishmentPanel } from './establishment/EstablishmentPanel';
import { ProfilePanel } from './establishment/ProfilePanel';
import { ReviewsPanel } from './establishment/ReviewsPanel';
import styles from './EstablishmentPortal.module.css';

const iconAnalytics = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="m7 14 3-4 3 3 5-6" />
  </svg>
);

const iconProfile = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M2 13h20" />
  </svg>
);

const iconReviews = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.8-5.4 2.8 1-6L3.2 9.4l6.1-.9z" />
  </svg>
);

const iconAnnounce = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M8 13h8M8 17h8M8 9h2" />
  </svg>
);

const iconAccount = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
  </svg>
);

const TABS = [
  { id: 'analytics', label: 'Analytics', hash: '', icon: iconAnalytics },
  { id: 'establishment', label: 'Establishment', hash: '#establishment', icon: iconProfile },
  { id: 'reviews', label: 'Reviews', hash: '#reviews', icon: iconReviews },
  { id: 'announcements', label: 'Announcements', hash: '#announcements', icon: iconAnnounce },
  { id: 'profile', label: 'Profile', hash: '#profile', icon: iconAccount },
];

function tabFromHash(hash) {
  const match = TABS.find((tab) => tab.hash && tab.hash === hash);
  return match?.id ?? 'analytics';
}

export function EstablishmentDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const panel = tabFromHash(location.hash);
  const [owner, setOwner] = useState(undefined);
  const [editOpen, setEditOpen] = useState(false);
  // Owned here so the triggers can sit in the top bar beside the page title.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [addingAnnouncement, setAddingAnnouncement] = useState(false);
  const [query, setQuery] = useState('');

  const reload = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setOwner(null);
      return;
    }
    setOwner(await fetchOwnEstablishment(supabase, data.session.user.id));
  }, []);

  useEffect(() => {
    void (async () => {
      await reload();
    })();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void reload();
    });
    return () => subscription.unsubscribe();
  }, [reload]);

  useEffect(() => {
    setPreviewOpen(false);
    setAddingAnnouncement(false);
    setQuery('');
  }, [panel]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  };

  if (owner === undefined) {
    return (
      <div className={styles.root}>
        <div className={styles.shell}>
          <aside className={styles.sidebar} />
          <div className={styles.content}>
            <p className={styles.hint} style={{ padding: 28 }}>
              Loading…
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!owner) {
    return <Navigate to="/login" replace />;
  }

  if (owner.accountStatus === 'disabled' || owner.accountStatus === 'deleted') {
    return <Navigate to="/login" replace state={{ accountDisabled: true, establishmentDisabled: true }} />;
  }

  if (isEstablishmentPendingSetup(owner) || !isEstablishmentDashboardReady(owner)) {
    return <Navigate to={ESTABLISHMENT_SETUP_PATH} replace />;
  }

  const activeTab = TABS.find((tab) => tab.id === panel) ?? TABS[0];

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <Link to="/establishment" className={styles.brand}>
            <AdminBrandMark variant="onGreen" />
          </Link>
          <nav className={styles.nav}>
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`${styles.navBtn} ${panel === tab.id ? styles.navBtnActive : ''}`}
                onClick={() => navigate(`/establishment${tab.hash}`)}
              >
                <span className={styles.icon}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFoot}>
            <button type="button" className={styles.signOut} onClick={() => void signOut()}>
              Sign out
            </button>
          </div>
        </aside>

        <div className={styles.content}>
          <header className={styles.top}>
            <h1 className={styles.pageTitle}>{activeTab.label}</h1>
            <span className={styles.spacer} />
            {panel === 'announcements' || panel === 'reviews' ? (
              <label className={styles.search}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  aria-label={panel === 'reviews' ? 'Search reviews' : 'Search announcements'}
                />
              </label>
            ) : null}
            {panel === 'establishment' ? (
              <button
                type="button"
                className={styles.ghostBtn}
                onClick={() => setPreviewOpen(true)}
                disabled={!owner.staPlaceId}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Traveler preview
              </button>
            ) : null}
            {panel === 'announcements' ? (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => setAddingAnnouncement(true)}
              >
                Add announcement
              </button>
            ) : null}
            {panel === 'profile' ? (
              <button type="button" className={styles.ghostBtn} onClick={() => setEditOpen(true)}>
                Edit details
              </button>
            ) : null}
            <button type="button" className={styles.topSignOut} onClick={() => void signOut()}>
              Sign out
            </button>
          </header>

          <main className={styles.main}>
            {panel === 'analytics' ? <AnalyticsPanel owner={owner} /> : null}
            {panel === 'establishment' ? (
              <EstablishmentPanel
                owner={owner}
                previewOpen={previewOpen}
                onClosePreview={() => setPreviewOpen(false)}
              />
            ) : null}
            {panel === 'reviews' ? <ReviewsPanel owner={owner} query={query} /> : null}
            {panel === 'announcements' ? (
              <AnnouncementsPanel
                owner={owner}
                query={query}
                adding={addingAnnouncement}
                onCloseAdd={() => setAddingAnnouncement(false)}
              />
            ) : null}
            {panel === 'profile' ? <ProfilePanel owner={owner} /> : null}
          </main>
        </div>
      </div>

      {/* The modal is the only thing here that raises toasts, so the provider wraps just it. */}
      <ToastProvider>
        <EstablishmentAddModal
          open={editOpen}
          mode="owner"
          ownerProfile={owner}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            void reload();
          }}
        />
      </ToastProvider>
    </div>
  );
}
