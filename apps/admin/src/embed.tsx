import { Navigate, Outlet, Route, useLocation } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { ActiveUsersPage, AllUsersPage } from './pages/Users';
import { UserDetail } from './pages/users/UserDetail';
import { ReportedUsers } from './pages/users/ReportedUsers';
import {
  AllEstablishmentsPage,
  DeactivatedEstablishmentsPage,
  DraftEstablishmentsPage,
  PendingEstablishmentsPage,
} from './pages/establishments/EstablishmentList';
import { EstablishmentDetail } from './pages/establishments/EstablishmentDetail';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { Profile } from './pages/Profile';
import { MobileSavedLists } from './pages/MobileSavedLists';
import { MobileNotifications } from './pages/MobileNotifications';
import { MobileAppReleases } from './pages/MobileAppReleases';
import { MobileOnboarding } from './pages/MobileOnboarding';
import { ContentCategories } from './pages/content/ContentCategories';
import { ContentAppFilters } from './pages/content/ContentAppFilters';
import { ContentEstablishments } from './pages/content/ContentEstablishments';
import { ContentAnnouncements } from './pages/content/ContentAnnouncements';
import { ContentMunicipalities, ContentCities } from './pages/content/ContentMunicipalities';
import { ContentItineraries } from './pages/content/ContentItineraries';
import { ItineraryAiPage } from './pages/content/ItineraryAiPage';
import { LandingPageAdmin } from './pages/content/LandingPageAdmin';
import {
  AuthPagesAdmin,
} from './pages/content/ContentCmsPages';
import { ItineraryEditorPage } from './pages/content/ItineraryEditorPage';
import { TourismReviews } from './pages/tourism/TourismReviews';
import { CustomPinsPage } from './pages/maps/CustomPinsPage';
import { AuditLogPage } from './pages/analytics/AuditLogPage';
import { ExportReportsPage } from './pages/analytics/ExportReportsPage';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminPathPrefixProvider, useAdminHref } from './contexts/AdminPathPrefixContext';
import bootStyles from './App.module.css';
import './adminEmbed.css';

function RedirectToTourismReviews() {
  const to = useAdminHref('/web/tourism/reviews');
  return <Navigate to={to} replace />;
}

function RedirectToLandingPage() {
  const to = useAdminHref('/web/content/landing');
  return <Navigate to={to} replace />;
}

function RedirectToAuthPages() {
  const to = useAdminHref('/web/content/auth');
  return <Navigate to={to} replace />;
}

function RedirectToCreatedItineraries() {
  const to = useAdminHref('/web/itineraries/created');
  return <Navigate to={to} replace />;
}

function RedirectToNewItinerary() {
  const to = useAdminHref('/web/itineraries/created/new');
  return <Navigate to={to} replace />;
}

export function adminLayoutChildRoutes() {
  return [
    <Route key="idx" index element={<Navigate to="web/dashboard" replace />} />,

    <Route key="web-dash" path="web/dashboard" element={<Dashboard />} />,
    <Route key="web-analytics" path="web/analytics" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="analytics-export" path="web/analytics/export" element={<ExportReportsPage />} />,
    <Route key="analytics-audit" path="web/analytics/audit" element={<AuditLogPage />} />,

    <Route key="tour-attr" path="web/tourism/attractions" element={<ContentEstablishments />} />,
    <Route key="tour-announce" path="web/tourism/announcements" element={<ContentAnnouncements />} />,
    <Route key="tour-categories" path="web/tourism/categories" element={<ContentCategories />} />,
    <Route key="tour-filters" path="web/tourism/filters" element={<Navigate to="web/content/filters" replace />} />,
    <Route key="tour-cities" path="web/tourism/cities" element={<ContentCities />} />,
    <Route key="tour-muni" path="web/tourism/municipalities" element={<ContentMunicipalities />} />,
    <Route key="tour-featured" path="web/tourism/featured" element={<RedirectToLandingPage />} />,
    <Route key="tour-reviews" path="web/tourism/reviews" element={<TourismReviews />} />,
    <Route key="tour-events" path="web/tourism/events" element={<RedirectToTourismReviews />} />,

    <Route key="itin-created" path="web/itineraries/created" element={<ContentItineraries />} />,
    <Route key="itin-ai-generator" path="web/itineraries/ai" element={<ItineraryAiPage />} />,
    <Route key="itin-create" path="web/itineraries/create" element={<RedirectToNewItinerary />} />,
    <Route key="itin-created-new" path="web/itineraries/created/new" element={<ItineraryEditorPage />} />,
    <Route key="itin-created-edit" path="web/itineraries/created/:id/edit" element={<ItineraryEditorPage />} />,
    <Route key="itin-landing" path="web/itineraries/landing" element={<RedirectToLandingPage />} />,
    <Route
      key="itin-templates"
      path="web/itineraries/templates"
      element={<RedirectToCreatedItineraries />}
    />,

    <Route key="map-pins" path="web/maps/pins" element={<CustomPinsPage />} />,
    <Route key="map-geo" path="web/maps/geotagged" element={<Navigate to="web/maps/pins" replace />} />,
    <Route key="map-conn" path="web/maps/connections" element={<Navigate to="web/maps/pins" replace />} />,

    <Route key="est-idx" path="web/establishments" element={<AllEstablishmentsPage />} />,
    <Route key="est-add" path="web/establishments/add" element={<Navigate to="web/establishments" replace />} />,
    <Route key="est-import" path="web/establishments/import" element={<Navigate to="web/establishments" replace />} />,
    <Route key="est-pending" path="web/establishments/pending" element={<PendingEstablishmentsPage />} />,
    <Route key="est-deactivated" path="web/establishments/deactivated" element={<DeactivatedEstablishmentsPage />} />,
    <Route key="est-drafts" path="web/establishments/drafts" element={<DraftEstablishmentsPage />} />,
    <Route key="est-approved" path="web/establishments/approved" element={<Navigate to="web/establishments" replace />} />,
    <Route key="est-rejected" path="web/establishments/rejected" element={<Navigate to="web/establishments" replace />} />,
    <Route key="est-detail" path="web/establishments/:ownerId" element={<EstablishmentDetail />} />,
    <Route key="biz-any" path="web/business/*" element={<Navigate to="web/establishments" replace />} />,
    <Route key="rewards-any" path="web/rewards/*" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="rewards" path="web/rewards" element={<Navigate to="web/dashboard" replace />} />,

    <Route key="cms-landing" path="web/content/landing" element={<LandingPageAdmin />} />,
    <Route key="cms-hero" path="web/content/landing/hero" element={<RedirectToLandingPage />} />,
    <Route key="cms-featured" path="web/content/landing/featured" element={<RedirectToLandingPage />} />,
    <Route key="cms-footer" path="web/content/landing/footer" element={<RedirectToLandingPage />} />,
    <Route key="cms-promos" path="web/content/landing/promos" element={<RedirectToLandingPage />} />,
    <Route key="cms-auth" path="web/content/auth" element={<AuthPagesAdmin />} />,
    <Route key="cms-login" path="web/content/auth/login" element={<RedirectToAuthPages />} />,
    <Route key="cms-signup" path="web/content/auth/signup" element={<RedirectToAuthPages />} />,
    <Route key="cms-reset" path="web/content/auth/reset" element={<RedirectToAuthPages />} />,
    <Route key="cms-brand" path="web/content/brand" element={<RedirectToAuthPages />} />,
    <Route key="cms-logo" path="web/content/brand/logo" element={<RedirectToAuthPages />} />,
    <Route key="cms-meta" path="web/content/brand/metadata" element={<RedirectToAuthPages />} />,

    <Route key="web-content" path="web/content" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-content-overview" path="web/content/overview" element={<RedirectToLandingPage />} />,
    <Route key="web-content-filters" path="web/content/filters" element={<ContentAppFilters />} />,
    <Route key="web-content-est" path="web/content/establishments" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-content-itin" path="web/content/itineraries" element={<Navigate to="web/itineraries/created" replace />} />,
    <Route key="web-content-maps" path="web/content/maps" element={<Navigate to="web/maps/pins" replace />} />,
    <Route key="web-content-term" path="web/content/terminals" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-dest" path="web/destinations" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-term" path="web/terminals" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-transport-term" path="web/transport/terminals" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-transport-routes" path="web/transport/routes" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-transport-types" path="web/transport/types" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-users" path="web/users" element={<AllUsersPage />} />,
    <Route key="web-users-active" path="web/users/active" element={<ActiveUsersPage />} />,
    <Route key="web-users-reported" path="web/users/reported" element={<ReportedUsers />} />,
    <Route key="web-users-detail" path="web/users/:userId" element={<UserDetail />} />,
    <Route key="web-settings" path="web/settings" element={<Settings />} />,

    <Route key="web-ts" path="web/tourist-spots" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-mod" path="web/moderation" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-profile" path="web/profile" element={<Profile />} />,
    <Route key="web-routes" path="web/routes" element={<Navigate to="web/maps/pins" replace />} />,

    <Route key="m-dash" path="mobile/dashboard" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="m-ts" path="mobile/tourist-spots" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="m-itin" path="mobile/itineraries" element={<Navigate to="web/itineraries/created" replace />} />,
    <Route key="m-saved" path="mobile/saved-lists" element={<MobileSavedLists />} />,
    <Route key="m-map" path="mobile/map-commute" element={<Navigate to="web/maps/pins" replace />} />,
    <Route key="m-notif" path="mobile/notifications" element={<MobileNotifications />} />,
    <Route key="m-rel" path="mobile/app-releases" element={<MobileAppReleases />} />,
    <Route key="m-onb" path="mobile/onboarding" element={<MobileOnboarding />} />,
    <Route key="m-users" path="mobile/users" element={<Navigate to="web/users" replace />} />,
    <Route key="m-analytics" path="mobile/analytics" element={<Analytics />} />,
    <Route key="m-profile" path="mobile/profile" element={<Navigate to="web/profile" replace />} />,
    <Route key="m-settings" path="mobile/settings" element={<Settings />} />,

    <Route key="leg-dash" path="dashboard" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="leg-ts" path="tourist-spots" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="leg-routes" path="routes" element={<Navigate to="web/transport/routes" replace />} />,
    <Route key="leg-users" path="users" element={<Navigate to="web/users" replace />} />,
    <Route key="leg-analytics" path="analytics" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="leg-profile" path="profile" element={<Navigate to="web/profile" replace />} />,
    <Route key="leg-settings" path="settings" element={<Navigate to="web/settings" replace />} />,

    <Route key="star" path="*" element={<Navigate to="web/dashboard" replace />} />,
  ];
}

type AdminAuthGateProps = {
  loginPath?: string;
};

export function AdminAuthGate({ loginPath = '/login' }: AdminAuthGateProps) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className={bootStyles.boot} role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!session) {
    const next = `${location.pathname}${location.search}`;
    const skipNext =
      !next ||
      next === '/' ||
      next.startsWith('/login') ||
      next.startsWith('/admin/login');
    const to = skipNext ? loginPath : `${loginPath}?next=${encodeURIComponent(next)}`;
    return <Navigate to={to} replace />;
  }

  return <Outlet />;
}

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
