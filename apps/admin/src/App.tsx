import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { AdminPathPrefixProvider } from './contexts/AdminPathPrefixContext';
import { LoginPage } from './pages/LoginPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { AdminAuthGate, adminLayoutChildRoutes } from './embed';
import './index.css';

const SHARED_LOGIN_URL = 'http://localhost:5173/login?next=/admin/web/dashboard';

/**
 * Admin and travelers share one sign-in page on the web app. In local dev the
 * standalone admin has no login of its own — it hands off to that shared page.
 */
function SharedLoginRedirect() {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    window.location.replace(SHARED_LOGIN_URL);
    return <p style={{ padding: 24 }}>Opening the shared sign-in…</p>;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <ToastProvider>
      <AdminPathPrefixProvider value="">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<SharedLoginRedirect />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
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
