import { Navigate, Outlet, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';
import { MobileSavedLists } from './pages/MobileSavedLists';
import { MobileNotifications } from './pages/MobileNotifications';
import { MobileAppReleases } from './pages/MobileAppReleases';
import { MobileOnboarding } from './pages/MobileOnboarding';
import { BusinessApplication } from './pages/BusinessApplication';
import { ApplicationReview } from './pages/ApplicationReview';
import { ContentOverview } from './pages/content/ContentOverview';
import { ContentFilters } from './pages/content/ContentFilters';
import { ContentEstablishments } from './pages/content/ContentEstablishments';
import { ContentItineraries } from './pages/content/ContentItineraries';
import { ContentMaps } from './pages/content/ContentMaps';
import { ContentTerminals } from './pages/content/ContentTerminals';
import { RewardsConcept } from './pages/RewardsConcept';
import { AdminPlaceholder } from './components/AdminPlaceholder';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AdminPathPrefixProvider } from './contexts/AdminPathPrefixContext';
import bootStyles from './App.module.css';
import './adminEmbed.css';

function stub(title: string, description: string, bullets: string[]) {
  return <AdminPlaceholder title={title} description={description} bullets={bullets} />;
}

/** Child routes for Layout — relative paths like web/dashboard. */
export function adminLayoutChildRoutes() {
  return [
    <Route key="idx" index element={<Navigate to="web/dashboard" replace />} />,

    <Route key="web-dash" path="web/dashboard" element={<Dashboard />} />,
    <Route key="web-analytics" path="web/analytics" element={<Analytics />} />,

    <Route key="tour-attr" path="web/tourism/attractions" element={<ContentEstablishments />} />,
    <Route key="tour-filters" path="web/tourism/filters" element={<ContentFilters />} />,
    <Route
      key="tour-muni"
      path="web/tourism/municipalities"
      element={stub('Municipalities', 'Manage Cavite cities and municipalities used across the catalog.', [
        'List LGU names and slugs',
        'Enable or hide municipalities in filters',
        'Sort order for browse chips',
      ])}
    />,
    <Route key="tour-featured" path="web/tourism/featured" element={<ContentOverview />} />,

    <Route
      key="biz-dash"
      path="web/business/dashboard"
      element={stub('Business Dashboard', 'Overview of applications, establishments, and inspections.', [
        'Pending applications count',
        'Establishments awaiting publication',
        'Upcoming inspections',
      ])}
    />,
    <Route key="biz-inbox" path="web/business/inbox" element={<BusinessApplication />} />,
    <Route key="biz-logs" path="web/business/logs" element={<BusinessApplication initialSection="logs" />} />,
    <Route key="biz-review" path="web/business/review" element={<ApplicationReview />} />,
    <Route key="biz-review-id" path="web/business/review/:id" element={<ApplicationReview />} />,
    <Route
      key="biz-archive"
      path="web/business/archive"
      element={stub('Applications Archive', 'Closed and archived business applications.', [
        'Filter by date and outcome',
        'Restore an archived application',
        'Export archive for records',
      ])}
    />,
    <Route key="biz-est-approved" path="web/business/establishments/approved" element={<ContentEstablishments />} />,
    <Route
      key="biz-est-pending"
      path="web/business/establishments/pending"
      element={stub('Pending Publication', 'Approved businesses waiting to go live in the catalog.', [
        'Review publication checklist',
        'Publish to tourist attractions',
        'Notify the business owner',
      ])}
    />,
    <Route
      key="biz-est-suspended"
      path="web/business/establishments/suspended"
      element={stub('Suspended Establishments', 'Businesses temporarily removed from public browse.', [
        'See suspension reason',
        'Reinstate or archive',
        'Notify owner of status change',
      ])}
    />,
    <Route
      key="biz-est-archive"
      path="web/business/establishments/archive"
      element={stub('Establishments Archive', 'Retired or permanently closed tourism establishments.', [
        'Search archived businesses',
        'Restore to draft if needed',
        'Keep audit trail of removals',
      ])}
    />,
    <Route
      key="biz-req"
      path="web/business/requirements"
      element={stub('Requirements', 'Document and compliance checklist for business applications.', [
        'Define required documents by business type',
        'Mark which uploads are mandatory',
        'Version requirement sets over time',
      ])}
    />,
    <Route
      key="biz-insp"
      path="web/business/inspections"
      element={stub('Inspections', 'Schedule and record establishment inspections.', [
        'Upcoming and completed inspections',
        'Assign inspectors',
        'Attach notes and photos',
      ])}
    />,

    <Route key="tr-term" path="web/transport/terminals" element={<ContentTerminals />} />,
    <Route
      key="tr-routes"
      path="web/transport/routes"
      element={stub('Routes', 'Transit corridors linking terminals and destinations.', [
        'Create named routes',
        'Link origin and destination terminals',
        'Set transport type and notes',
      ])}
    />,
    <Route
      key="tr-types"
      path="web/transport/types"
      element={stub('Transport Types', 'Modes used on routes (jeepney, bus, UV, etc.).', [
        'Add transport type labels',
        'Icons and display order',
        'Enable or disable types in filters',
      ])}
    />,

    <Route key="itin-created" path="web/itineraries/created" element={<ContentItineraries />} />,
    <Route
      key="itin-templates"
      path="web/itineraries/templates"
      element={stub('Itinerary Templates', 'Reusable day-route templates for curation.', [
        'Create template with ordered stops',
        'Publish or keep as draft',
        'Duplicate a template into a live itinerary',
      ])}
    />,

    <Route key="map-pins" path="web/maps/pins" element={<ContentMaps />} />,
    <Route
      key="map-geo"
      path="web/maps/geotagged"
      element={stub('Geotagged Locations', 'Verified lat/lng points for establishments and terminals.', [
        'Review zero or suspect coordinates',
        'Edit pin position on a map',
        'Bulk import geocodes',
      ])}
    />,
    <Route
      key="map-conn"
      path="web/maps/connections"
      element={stub('Route Connections', 'Map edges between stops used for commute guides.', [
        'Link pins into a path',
        'Toggle connection visibility',
        'Sync with OSRM route lines',
      ])}
    />,

    <Route key="rew-items" path="web/rewards/items" element={<RewardsConcept />} />,
    <Route
      key="rew-redeem"
      path="web/rewards/redemptions"
      element={stub('Redemption Requests', 'Traveler requests to redeem points for rewards.', [
        'Approve or deny redemptions',
        'Track fulfillment status',
        'Notify the user of the outcome',
      ])}
    />,
    <Route
      key="rew-hist"
      path="web/rewards/history"
      element={stub('Reward History', 'Ledger of points earned and spent.', [
        'Filter by user or date',
        'Export history',
        'Audit unusual point spikes',
      ])}
    />,
    <Route key="rewards" path="web/rewards" element={<Navigate to="web/rewards/items" replace />} />,

    <Route key="web-content" path="web/content" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-content-overview" path="web/content/overview" element={<Navigate to="web/tourism/featured" replace />} />,
    <Route key="web-content-filters" path="web/content/filters" element={<Navigate to="web/tourism/filters" replace />} />,
    <Route key="web-content-est" path="web/content/establishments" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-content-itin" path="web/content/itineraries" element={<Navigate to="web/itineraries/created" replace />} />,
    <Route key="web-content-maps" path="web/content/maps" element={<Navigate to="web/maps/pins" replace />} />,
    <Route key="web-content-term" path="web/content/terminals" element={<Navigate to="web/transport/terminals" replace />} />,
    <Route key="web-dest" path="web/destinations" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-term" path="web/terminals" element={<Navigate to="web/transport/terminals" replace />} />,
    <Route key="web-users" path="web/users" element={<Users />} />,
    <Route key="web-settings" path="web/settings" element={<Settings />} />,

    <Route key="web-ts" path="web/tourist-spots" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="web-mod" path="web/moderation" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="web-profile" path="web/profile" element={<Navigate to="web/settings" replace />} />,
    <Route key="web-routes" path="web/routes" element={<Navigate to="web/transport/routes" replace />} />,

    <Route key="m-dash" path="mobile/dashboard" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="m-ts" path="mobile/tourist-spots" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="m-itin" path="mobile/itineraries" element={<Navigate to="web/itineraries/created" replace />} />,
    <Route key="m-saved" path="mobile/saved-lists" element={<MobileSavedLists />} />,
    <Route key="m-map" path="mobile/map-commute" element={<Navigate to="web/maps/pins" replace />} />,
    <Route key="m-notif" path="mobile/notifications" element={<MobileNotifications />} />,
    <Route key="m-rel" path="mobile/app-releases" element={<MobileAppReleases />} />,
    <Route key="m-onb" path="mobile/onboarding" element={<MobileOnboarding />} />,
    <Route key="m-users" path="mobile/users" element={<Users />} />,
    <Route key="m-analytics" path="mobile/analytics" element={<Analytics />} />,
    <Route key="m-profile" path="mobile/profile" element={<Navigate to="web/settings" replace />} />,
    <Route key="m-settings" path="mobile/settings" element={<Settings />} />,

    <Route key="leg-dash" path="dashboard" element={<Navigate to="web/dashboard" replace />} />,
    <Route key="leg-ts" path="tourist-spots" element={<Navigate to="web/tourism/attractions" replace />} />,
    <Route key="leg-routes" path="routes" element={<Navigate to="web/transport/routes" replace />} />,
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

/** Renders Outlet when an allowed admin session exists; otherwise redirects. */
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

/** Providers + shell for admin mounted under /admin on the marketing web app. */
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
