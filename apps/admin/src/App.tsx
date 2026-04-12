import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TouristSpots } from './pages/TouristSpots';
import { RoutesPage } from './pages/RoutesPage';
import { Users } from './pages/Users';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { WebTerminals } from './pages/WebTerminals';
import { WebContent } from './pages/WebContent';
import { WebModeration } from './pages/WebModeration';
import { MobileItineraries } from './pages/MobileItineraries';
import { MobileSavedLists } from './pages/MobileSavedLists';
import { MobileMapCommute } from './pages/MobileMapCommute';
import { MobileNotifications } from './pages/MobileNotifications';
import { MobileAppReleases } from './pages/MobileAppReleases';
import { MobileOnboarding } from './pages/MobileOnboarding';
import { ToastProvider } from './components/Toast';

function AppContent() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/web/dashboard" replace />} />

        {/* Web admin */}
        <Route path="web/dashboard" element={<Dashboard />} />
        <Route path="web/tourist-spots" element={<TouristSpots />} />
        <Route path="web/terminals" element={<WebTerminals />} />
        <Route path="web/routes" element={<RoutesPage />} />
        <Route path="web/content" element={<WebContent />} />
        <Route path="web/moderation" element={<WebModeration />} />
        <Route path="web/users" element={<Users />} />
        <Route path="web/analytics" element={<Analytics />} />
        <Route path="web/profile" element={<Profile />} />
        <Route path="web/settings" element={<Settings />} />

        {/* Mobile admin */}
        <Route path="mobile/dashboard" element={<Dashboard />} />
        <Route path="mobile/tourist-spots" element={<TouristSpots />} />
        <Route path="mobile/itineraries" element={<MobileItineraries />} />
        <Route path="mobile/saved-lists" element={<MobileSavedLists />} />
        <Route path="mobile/map-commute" element={<MobileMapCommute />} />
        <Route path="mobile/notifications" element={<MobileNotifications />} />
        <Route path="mobile/app-releases" element={<MobileAppReleases />} />
        <Route path="mobile/onboarding" element={<MobileOnboarding />} />
        <Route path="mobile/users" element={<Users />} />
        <Route path="mobile/analytics" element={<Analytics />} />
        <Route path="mobile/profile" element={<Profile />} />
        <Route path="mobile/settings" element={<Settings />} />

        {/* Legacy URLs → web admin */}
        <Route path="dashboard" element={<Navigate to="/web/dashboard" replace />} />
        <Route path="tourist-spots" element={<Navigate to="/web/tourist-spots" replace />} />
        <Route path="routes" element={<Navigate to="/web/routes" replace />} />
        <Route path="users" element={<Navigate to="/web/users" replace />} />
        <Route path="analytics" element={<Navigate to="/web/analytics" replace />} />
        <Route path="profile" element={<Navigate to="/web/profile" replace />} />
        <Route path="settings" element={<Navigate to="/web/settings" replace />} />

        <Route path="*" element={<Navigate to="/web/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
