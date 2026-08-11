import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { LandingPageClean } from './pages/LandingPageClean';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { PrototypeTitlePage } from './pages/PrototypeTitlePage';
import { PrototypeStartupFeaturesPage } from './pages/PrototypeStartupFeaturesPage';
import { PrototypeSignInPage } from './pages/PrototypeSignInPage';
import { PrototypeSignUpPage } from './pages/PrototypeSignUpPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { MobileExpoOAuthBridgePage } from './pages/MobileExpoOAuthBridgePage';
import { SearchPage } from './pages/SearchPage';
import { PlaceDetailPage } from './pages/PlaceDetailPage';
import { SavedPage } from './pages/SavedPage';
import { ItineraryPage } from './pages/ItineraryPage';
import { ItineraryDetailPage } from './pages/ItineraryDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { Layout as AdminLayout } from '../../admin/src/components/Layout';
import {
  AdminEmbedRoot,
  AdminAuthGate,
  adminLayoutChildRoutes,
} from '../../admin/src/embed';
import { ADMIN_APP_HOME_PATH } from './lib/adminPortalPath';
import { isAdminReservedEmail } from './lib/adminReservedEmail';

function AuthGoogleLegacyRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/auth/callback${search}`} replace />;
}

function ProtectedRoute({ children }) {
  const [sessionUser, setSessionUser] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSessionUser(session ?? null));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => setSessionUser(s ?? null));
    return () => subscription.unsubscribe();
  }, []);

  if (sessionUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center font-['Inter',sans-serif] text-neutral-600">
        Loading…
      </div>
    );
  }
  if (!sessionUser) return <Navigate to="/login" replace />;

  const email = sessionUser.user?.email?.trim().toLowerCase() ?? '';
  if (email && isAdminReservedEmail(email)) {
    return <Navigate to={ADMIN_APP_HOME_PATH} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPageClean />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/prototype/title" element={<PrototypeTitlePage />} />
        <Route path="/prototype/startup" element={<PrototypeStartupFeaturesPage />} />
        <Route path="/prototype/sign-in" element={<PrototypeSignInPage />} />
        <Route path="/prototype/sign-up" element={<PrototypeSignUpPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="/auth/google" element={<AuthGoogleLegacyRedirect />} />
        <Route path="/auth/mobile-callback" element={<MobileExpoOAuthBridgePage />} />

        {/* Admin (apps/admin) — same dev server as marketing web */}
        <Route path="/admin" element={<AdminEmbedRoot />}>
          <Route index element={<Navigate to="web/dashboard" replace />} />
          <Route path="login" element={<Navigate to="/" replace />} />
          <Route element={<AdminAuthGate loginPath="/" />}>
            <Route element={<AdminLayout />}>{adminLayoutChildRoutes()}</Route>
          </Route>
        </Route>

        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />
        <Route path="/establishments" element={<Navigate to="/search" replace />} />
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <SavedPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/itinerary"
          element={
            <ProtectedRoute>
              <ItineraryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/itinerary/:id"
          element={
            <ProtectedRoute>
              <ItineraryDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/place/:id"
          element={
            <ProtectedRoute>
              <PlaceDetailPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
