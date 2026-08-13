import { createContext, useContext, type ReactNode } from 'react';

const AdminPathPrefixContext = createContext('');

export function AdminPathPrefixProvider({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  return (
    <AdminPathPrefixContext.Provider value={value}>{children}</AdminPathPrefixContext.Provider>
  );
}

export function useAdminPathPrefix(): string {
  return useContext(AdminPathPrefixContext);
}

export function useAdminHref(path: string): string {
  const prefix = useAdminPathPrefix();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (!prefix) return normalized;
  return `${prefix.replace(/\/$/, '')}${normalized}`;
}
