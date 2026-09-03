export const TRAVELER_ACCOUNT_DISABLED_MESSAGE =
  'This account has been deactivated. Contact Tara, Cavite! support if you think this is a mistake.';

export function isTravelerBlocked(status) {
  return status === 'disabled' || status === 'deleted';
}

/**
 * Reads public.users.account_status.
 * Missing traveler row → 'active' (legacy profiles). Query errors → 'unknown' (do not sign out).
 */
export async function fetchTravelerAccountStatus(client, userId) {
  if (!client || !userId) return 'unknown';
  const { data, error } = await client
    .from('users')
    .select('account_status')
    .eq('id', userId)
    .maybeSingle();
  if (error) return 'unknown';
  if (!data) return 'active';
  const status = String(data.account_status ?? 'active').trim().toLowerCase();
  return status || 'active';
}

/** If the traveler is disabled/deleted, sign out and return false. */
export async function ensureActiveTravelerSession(client, userId) {
  const status = await fetchTravelerAccountStatus(client, userId);
  if (!isTravelerBlocked(status)) return true;
  try {
    await client.auth.signOut();
  } catch {
    // Best-effort; caller still treats the session as blocked.
  }
  return false;
}
