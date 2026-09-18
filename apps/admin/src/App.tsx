import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { AdminPathPrefixProvider } from './contexts/AdminPathPrefixContext';
import { LoginPage } from './pages/LoginPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { AdminAuthGate, adminLayoutChildRoutes } from './embed';
import './index.css';

/**
 * Supabase sometimes bounces stale/expired OAuth codes to the site root
 * (/?code=...) instead of /auth/callback â€” forward them so the callback's
 * stale-code recovery can run instead of dying in the auth gate.
 */
function RootOAuthForward() {
  const { search } = useLocation();
  if (/[?&]code=/.test(search)) {
    return <Navigate to={`/auth/callback${search}`} replace />;
  }
  return <Navigate to="/web/dashboard" replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <AdminPathPrefixProvider value="">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/" element={<RootOAuthForward />} />
            <Route element={<AdminAuthGate loginPath="/login" />}>
              <Route path="/" element={<Layout />}>
                {adminLayoutChildRoutes()}
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/web/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </AdminPathPrefixProvider>
    </ToastProvider>
  );
}
