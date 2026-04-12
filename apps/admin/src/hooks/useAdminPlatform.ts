import { useLocation } from 'react-router-dom';

export type AdminPlatform = 'web' | 'mobile';

export function useAdminPlatform(): {
  platform: AdminPlatform;
  base: string;
  path: (segment: string) => string;
} {
  const { pathname } = useLocation();
  const platform: AdminPlatform =
    pathname.startsWith('/mobile/') || pathname === '/mobile' ? 'mobile' : 'web';
  const base = platform === 'mobile' ? '/mobile' : '/web';
  const path = (segment: string) => `${base}/${segment.replace(/^\//, '')}`;
  return { platform, base, path };
}
