import type { User } from '@supabase/supabase-js';

export type AdminAccount = {
  email: string;
  displayName: string;
  initials: string;
  avatarUrl: string | null;
  role: string;
  /** Office the admin belongs to, e.g. Provincial Tourism Office. */
  department: string;
  lastSignIn: string | null;
};

function initialsFromName(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const a = words[0]?.charAt(0);
    const b = words[1]?.charAt(0);
    if (a && b) return (a + b).toUpperCase();
  }
  const first = words[0] ?? '';
  return first.slice(0, 2).toUpperCase() || 'AD';
}

export function adminAccountFromUser(user: User | null | undefined): AdminAccount {
  const meta = (user?.user_metadata ?? {}) as Record<string, unknown>;
  const email = user?.email?.trim() || '';
  const metaName = String(meta.full_name ?? meta.name ?? meta.display_name ?? '').trim();
  const displayName = metaName || 'Admin';
  const avatarUrl = String(meta.avatar_url ?? meta.picture ?? '').trim() || null;
  return {
    email: email || '—',
    displayName,
    initials: metaName ? initialsFromName(metaName) : 'AD',
    avatarUrl,
    role: 'Administrator',
    department: String(meta.department ?? '').trim(),
    lastSignIn: user?.last_sign_in_at ?? null,
  };
}

export function formatAdminTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
