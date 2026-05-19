import { useLocation } from 'react-router-dom';
import { useAdminPathPrefix } from '../contexts/AdminPathPrefixContext';

export type AdminPlatform = 'web' | 'mobile';

export function useAdminPlatform(): {
  platform: AdminPlatform;
  base: string;
  path: (segment: string) => string;
} {
  const { pathname } = useLocation();
  const routePrefix = useAdminPathPrefix();
  let effectivePath = pathname;
  if (routePrefix && pathname.startsWith(routePrefix)) {
    effectivePath = pathname.slice(routePrefix.length) || '/';
  }
  if (!effectivePath.startsWith('/')) {
    effectivePath = `/${effectivePath}`;
  }
  const platform: AdminPlatform =
    effectivePath.startsWith('/mobile/') || effectivePath === '/mobile' ? 'mobile' : 'web';
  const base = platform === 'mobile' ? '/mobile' : '/web';
  const path = (segment: string) => {
    const rel = `${base}/${segment.replace(/^\//, '')}`;
    if (!routePrefix) return rel;
    return `${routePrefix.replace(/\/$/, '')}${rel}`;
  };
  return { platform, base, path };
}
