import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
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
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import bootStyles from './App.module.css';

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/web/dashboard" replace />} />

        <Route path="web/dashboard" element={<Dashboard />} />
        <Route path="web/destinations" element={<TouristSpots />} />
        <Route path="web/terminals" element={<WebTerminals />} />
        <Route path="web/users" element={<Users />} />
        <Route path="web/settings" element={<Settings />} />

        <Route path="web/tourist-spots" element={<Navigate to="/web/destinations" replace />} />
        <Route path="web/content" element={<Navigate to="/web/dashboard" replace />} />
        <Route path="web/moderation" element={<Navigate to="/web/dashboard" replace />} />
        <Route path="web/analytics" element={<Analytics />} />
        <Route path="web/profile" element={<Navigate to="/web/settings" replace />} />
        <Route path="web/routes" element={<Navigate to="/web/dashboard" replace />} />

        <Route path="mobile/dashboard" element={<Navigate to="/web/dashboard" replace />} />
        <Route path="mobile/tourist-spots" element={<Navigate to="/web/destinations" replace />} />
        <Route path="mobile/itineraries" element={<MobileItineraries />} />
        <Route path="mobile/saved-lists" element={<MobileSavedLists />} />
        <Route path="mobile/map-commute" element={<MobileMapCommute />} />
        <Route path="mobile/notifications" element={<MobileNotifications />} />
        <Route path="mobile/app-releases" element={<MobileAppReleases />} />
        <Route path="mobile/onboarding" element={<MobileOnboarding />} />
        <Route path="mobile/users" element={<Users />} />
        <Route path="mobile/analytics" element={<Analytics />} />
        <Route path="mobile/profile" element={<Navigate to="/web/settings" replace />} />
        <Route path="mobile/settings" element={<Settings />} />

        <Route path="dashboard" element={<Navigate to="/web/dashboard" replace />} />
        <Route path="tourist-spots" element={<Navigate to="/web/destinations" replace />} />
        <Route path="routes" element={<Navigate to="/web/dashboard" replace />} />
        <Route path="users" element={<Navigate to="/web/users" replace />} />
        <Route path="analytics" element={<Navigate to="/web/dashboard" replace />} />
        <Route path="profile" element={<Navigate to="/web/settings" replace />} />
        <Route path="settings" element={<Navigate to="/web/settings" replace />} />

        <Route path="*" element={<Navigate to="/web/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

function ProtectedApp() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className={bootStyles.boot} role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to="/web/dashboard" replace />} />
      <Route path="/*" element={<AppContent />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ProtectedApp />
    </ToastProvider>
  );
}
