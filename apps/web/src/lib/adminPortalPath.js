/**
 * Admin dashboard is a SEPARATE app/deployment (`apps/admin`).
 * Set `VITE_ADMIN_APP_URL` to the admin deployment origin (Vercel project URL).
 * Admin accounts that sign in on this web app are sent to that origin after auth.
 */
export const ADMIN_APP_URL = String(
  import.meta.env.VITE_ADMIN_APP_URL || 'https://taracavite-admin.vercel.app'
).replace(/\/+$/, '');

/** Where admin accounts land in the standalone admin app. */
export const ADMIN_APP_HOME_URL = `${ADMIN_APP_URL}/web/dashboard`;

/** Map an in-app `/admin/...` path to the standalone admin app origin. */
export function adminAppUrlForPath(adminPath) {
  const suffix = String(adminPath || '').slice('/admin'.length) || '/web/dashboard';
  return `${ADMIN_APP_URL}${suffix}`;
}

/**
 * Admin home lives on a different origin, so callers must use
 * `window.location` (react-router's navigate() cannot leave the app).
 */
export function redirectToAdminApp(adminPath) {
  window.location.assign(
    adminPath && adminPath.startsWith('/admin')
      ? adminAppUrlForPath(adminPath)
      : ADMIN_APP_HOME_URL
  );
}
