import { ensureActiveTravelerSession } from 'cavitour-shared/accountStatus';
import { isAdminReservedEmail } from './adminReservedEmail';
import { fetchOwnEstablishment } from './accountHome';
import { supabase } from './supabase';

/** Returns false after signing out a deactivated traveler or establishment. Admins are skipped. */
export async function rejectDisabledTraveler(session) {
  const email = session?.user?.email?.trim().toLowerCase() ?? '';
  if (email && isAdminReservedEmail(email)) return true;
  const userId = session?.user?.id;
  if (!userId) return true;
  const owner = await fetchOwnEstablishment(supabase, userId);
  if (owner) {
    if (owner.accountStatus === 'disabled' || owner.accountStatus === 'deleted') {
      try {
        await supabase.auth.signOut();
      } catch {
        /* still treat as blocked */
      }
      return false;
    }
    return true;
  }
  return ensureActiveTravelerSession(supabase, userId);
}
