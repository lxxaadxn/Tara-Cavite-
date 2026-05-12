import { Navigate } from 'react-router-dom';

/** Legacy / bookmarked URLs: analytics now lives on the unified dashboard. */
export function Analytics() {
  return <Navigate to="/web/dashboard#analytics" replace />;
}
