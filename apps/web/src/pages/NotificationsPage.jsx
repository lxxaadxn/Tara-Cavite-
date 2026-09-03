import { Navigate } from 'react-router-dom';

/** Profile and old links open the announcements inbox. */
export function NotificationsPage() {
  return <Navigate to="/announcements" replace />;
}
