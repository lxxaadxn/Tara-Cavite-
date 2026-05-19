import { Navigate, Outlet, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { TouristSpots } from './pages/TouristSpots';
import { Users } from './pages/Users';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { WebTerminals } from './pages/WebTerminals';
import { MobileItineraries } from './pages/MobileItineraries';
import { MobileSavedLists } from './pages/MobileSavedLists';
import { MobileMapCommute } from './pages/MobileMapCommute';
import { MobileNotifications } from './pages/MobileNotifications';
import { MobileAppReleases } from './pages/MobileAppReleases';
import { MobileOnboarding } from './pages/MobileOnboarding';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminPathPrefixProvider } from './contexts/AdminPathPrefixContext';
import bootStyles from './App.module.css';
import './adminEmbed.css';

/** Child routes for `<Layout />` — paths are relative (e.g. `web/dashboard` → `/admin/web/dashboard`). */
export function adminLayoutChildRoutes() {
  return [
    <Route key="idx" index element={<Navigate to="web/dashboard" replace />} />,

    <Route key="web-dash" path="web/dashboard" element={<Dashboard />} />,
    <Route key="web-content" path="web/content" element={<TouristSpots />} />,
    <Route key="web-dest" path="web/destinations" element={<Navigate to="web/content" replace />} />,
    <Route key="web-term" path="web/terminals" element={<WebTerminals />} />,
    <Route key="web-users" path="web/users" element={<Users />} />,
    <Route key="web-settings" path="web/settings" element={<Settings />} />,
    <Route key="web-analytics" path="web/analytics" element={<Analytics />} />,

    <Route key="web-ts" path="web/tourist-spots" element={<Navigate to="web/content" replace />} />,
    <Route key="web-mod" path="web/moderation" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-profile" path="web/profile" element={<Navigate to="web/settings" replace />} />,
    <Route key="web-routes" path="web/routes" element={<Navigate to="web/dashboard" replace />} />,

    <Route key="m-dash" path="mobile/dashboard" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="m-ts" path="mobile/tourist-spots" element={<Navigate to="web/content" replace />} />,
    <Route key="m-itin" path="mobile/itineraries" element={<MobileItineraries />} />,
    <Route key="m-saved" path="mobile/saved-lists" element={<MobileSavedLists />} />,
    <Route key="m-map" path="mobile/map-commute" element={<MobileMapCommute />} />,
    <Route key="m-notif" path="mobile/notifications" element={<MobileNotifications />} />,
    <Route key="m-rel" path="mobile/app-releases" element={<MobileAppReleases />} />,
    <Route key="m-onb" path="mobile/onboarding" element={<MobileOnboarding />} />,
    <Route key="m-users" path="mobile/users" element={<Users />} />,
    <Route key="m-analytics" path="mobile/analytics" element={<Analytics />} />,
    <Route key="m-profile" path="mobile/profile" element={<Navigate to="web/settings" replace />} />,
    <Route key="m-settings" path="mobile/settings" element={<Settings />} />,

    <Route key="leg-dash" path="dashboard" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="leg-ts" path="tourist-spots" element={<Navigate to="web/content" replace />} />,
    <Route key="leg-routes" path="routes" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="leg-users" path="users" element={<Navigate to="web/users" replace />} />,
    <Route key="leg-analytics" path="analytics" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="leg-profile" path="profile" element={<Navigate to="web/settings" replace />} />,
    <Route key="leg-settings" path="settings" element={<Navigate to="web/settings" replace />} />,

    <Route key="star" path="*" element={<Navigate to="web/dashboard" replace />} />,
  ];
}

type AdminAuthGateProps = {
  loginPath?: string;
};

/** Renders `<Outlet />` when an allowed admin session exists; otherwise redirects. */
export function AdminAuthGate({ loginPath = '/admin/login' }: AdminAuthGateProps) {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className={bootStyles.boot} role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}

/** Providers + shell for admin mounted under `/admin` on the marketing web app. */
export function AdminEmbedRoot() {
  return (
    <div className="admin-embed-mount">
      <ToastProvider>
        <AdminPathPrefixProvider value="/admin">
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </AdminPathPrefixProvider>
      </ToastProvider>
    </div>
  );
}
