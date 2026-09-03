import { ensureActiveTravelerSession } from 'cavitour-shared/accountStatus';
import { isAdminReservedEmail } from './adminReservedEmail';
import { supabase } from './supabase';

/** Returns false after signing out a deactivated traveler. Admins are skipped. */
export async function rejectDisabledTraveler(session: { user?: { id?: string; email?: string | null } } | null) {
  const email = session?.user?.email?.trim().toLowerCase() ?? '';
  if (email && isAdminReservedEmail(email)) return true;
  const userId = session?.user?.id;
  if (!userId) return true;
  return ensureActiveTravelerSession(supabase, userId);
}
