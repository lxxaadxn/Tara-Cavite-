import { isAdminReservedEmail } from './adminReservedEmail';
import { ADMIN_APP_HOME_PATH } from './adminPortalPath';
import { TRAVELER_ACCOUNT_DISABLED_MESSAGE } from 'cavitour-shared/accountStatus';

export const ESTABLISHMENT_DISABLED_MESSAGE =
  'This establishment account has been deactivated. Contact the Cavite Tourism Administration if you think this is a mistake.';

export const ESTABLISHMENT_HOME_PATH = '/establishment';
export const ESTABLISHMENT_SETUP_PATH = '/establishment/setup';

/**
 * @typedef {{
 *   id: string,
 *   email: string,
 *   fullName: string,
 *   phone: string,
 *   businessName: string,
 *   businessType: string,
 *   lgu: string,
 *   address: string,
 *   verificationStatus: string,
 *   accountStatus: string,
 *   publicVisible: boolean,
 *   setupCompletedAt: string | null,
 * }} OwnEstablishment
 */

function mapOwner(row) {
  return {
    id: String(row.id),
    email: String(row.email ?? '').trim(),
    fullName: String(row.full_name ?? '').trim(),
    phone: String(row.phone ?? '').trim(),
    businessName: String(row.business_name ?? '').trim() || 'Your establishment',
    businessType: String(row.business_type ?? '').trim(),
    lgu: String(row.lgu ?? '').trim(),
    address: String(row.address ?? '').trim(),
    verificationStatus: String(row.verification_status ?? '').trim().toLowerCase(),
    accountStatus: String(row.account_status ?? 'active').trim().toLowerCase(),
    publicVisible: row.public_visible === true,
    setupCompletedAt: row.setup_completed_at ? String(row.setup_completed_at) : null,
  };
}

export async function fetchOwnEstablishment(client, userId) {
  if (!client || !userId) return null;
  const full = await client
    .from('establishment_owners')
    .select(
      'id, email, full_name, phone, business_name, business_type, lgu, address, verification_status, account_status, public_visible, setup_completed_at'
    )
    .eq('id', userId)
    .maybeSingle();
  if (!full.error && full.data) return mapOwner(full.data);
  const base = await client
    .from('establishment_owners')
    .select('id, email, full_name, phone, business_name, business_type, lgu, address, verification_status, account_status')
    .eq('id', userId)
    .maybeSingle();
  if (base.error || !base.data) return null;
  return mapOwner({ ...base.data, public_visible: false, setup_completed_at: null });
}

export function isEstablishmentPendingSetup(owner) {
  if (!owner) return false;
  if (owner.accountStatus === 'disabled' || owner.accountStatus === 'deleted') return false;
  return !owner.setupCompletedAt || owner.verificationStatus === 'invited';
}

export function isEstablishmentDashboardReady(owner) {
  if (!owner) return false;
  if (owner.accountStatus !== 'active') return false;
  return Boolean(owner.setupCompletedAt) && owner.verificationStatus === 'approved';
}

/**
 * Where this session should land after login / OAuth / password setup.
 * @returns {Promise<{ path: string, blocked?: boolean, message?: string, owner?: OwnEstablishment | null }>}
 */
export async function resolveAccountHome(client, session, nextPath) {
  const email = session?.user?.email?.trim().toLowerCase() ?? '';
  const safeNext =
    typeof nextPath === 'string' && nextPath.startsWith('/') && !nextPath.startsWith('//') ? nextPath : null;

  if (email && isAdminReservedEmail(email)) {
    if (safeNext?.startsWith('/admin') && !safeNext.startsWith('/admin/login')) {
      return { path: safeNext, owner: null };
    }
    return { path: ADMIN_APP_HOME_PATH, owner: null };
  }
  const userId = session?.user?.id;
  const owner = userId ? await fetchOwnEstablishment(client, userId) : null;
  if (owner) {
    if (owner.accountStatus === 'disabled' || owner.accountStatus === 'deleted') {
      return { path: '/login', blocked: true, message: ESTABLISHMENT_DISABLED_MESSAGE, owner };
    }
    if (isEstablishmentPendingSetup(owner)) {
      return { path: ESTABLISHMENT_SETUP_PATH, owner };
    }
    return { path: ESTABLISHMENT_HOME_PATH, owner };
  }

  if (safeNext?.startsWith('/establishment') || safeNext?.startsWith('/admin')) {
    return { path: '/search', owner: null };
  }
  return { path: safeNext || '/search', owner: null };
}

export { TRAVELER_ACCOUNT_DISABLED_MESSAGE };
