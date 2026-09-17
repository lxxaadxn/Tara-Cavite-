import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ToastProvider } from './components/Toast';
import { AuthProvider } from './contexts/AuthContext';
import { AdminPathPrefixProvider } from './contexts/AdminPathPrefixContext';
import { LoginPage } from './pages/LoginPage';
import { OAuthCallbackPage } from './pages/OAuthCallbackPage';
import { AdminAuthGate, adminLayoutChildRoutes } from './embed';
import './index.css';

export default function App() {
  return (
    <ToastProvider>
      <AdminPathPrefixProvider value="">
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
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
