/** Shared check-in / visit helpers for web + mobile + admin. */

export const CHECKIN_PATH_PREFIX = '/checkin/';
export const CHECKIN_APP_PATH = 'checkin';

/** Build the URL encoded in each establishment QR (opens web check-in). */
export function buildCheckinUrl(origin, code) {
  const base = String(origin || '').replace(/\/$/, '');
  const normalized = normalizeCheckinCode(code);
  if (!base || !normalized) return '';
  return `${base}${CHECKIN_PATH_PREFIX}${encodeURIComponent(normalized)}`;
}

/**
 * Prefer a phone-reachable origin for QR codes.
 * - Never encode admin ports (3000/3001) — check-in lives on the marketing web app.
 * - Prefer explicit override when provided.
 */
export function resolveCheckinWebOrigin(candidate = '', { preferLanHost = '' } = {}) {
  const explicit = String(candidate || '').trim().replace(/\/$/, '');
  if (explicit) {
    try {
      const u = new URL(explicit);
      if (u.port === '3000' || u.port === '3001') {
        u.port = '5173';
        return u.origin;
      }
      return u.origin;
    } catch {
      return explicit;
    }
  }
  const lan = String(preferLanHost || '').trim();
  if (lan && lan !== '127.0.0.1' && lan !== 'localhost') {
    return `http://${lan}:5173`;
  }
  return 'http://localhost:5173';
}

export function normalizeCheckinCode(raw) {
  return String(raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/** Extract code from a scanned QR URL or pasted path. */
export function extractCheckinCodeFromText(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';

  const direct = normalizeCheckinCode(text);
  if (/^CT-[A-Z0-9]{6,}$/i.test(direct)) return direct;

  try {
    const url = new URL(text);
    const parts = url.pathname.split('/').filter(Boolean);
    // Expo path often includes `--/checkin/CODE`
    const idx = parts.findIndex((p) => p.toLowerCase() === 'checkin');
    if (idx >= 0 && parts[idx + 1]) {
      return normalizeCheckinCode(decodeURIComponent(parts[idx + 1]));
    }
  } catch {
    const m = text.match(/checkin\/([A-Za-z0-9-]+)/i);
    if (m?.[1]) return normalizeCheckinCode(m[1]);
  }

  const deep = text.match(/(?:cavitour:\/\/|exp:\/\/)[^\s]*checkin\/([A-Za-z0-9-]+)/i);
  if (deep?.[1]) return normalizeCheckinCode(deep[1]);

  return direct;
}

export function qrImageUrl(data, size = 220) {
  const payload = encodeURIComponent(String(data || ''));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${payload}`;
}

/**
 * Load this establishment's check-in code + QR image for display on web/mobile place pages.
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} placeId
 * @param {string} [webOrigin] Origin used inside the QR (e.g. http://192.168.x.x:5173)
 */
export async function fetchPlaceCheckinDisplay(client, placeId, webOrigin = '') {
  const pid = String(placeId ?? '').trim();
  if (!pid) return null;

  const { data, error } = await client
    .from('place_checkin_codes')
    .select('code, is_active')
    .eq('place_id', pid)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  if (!data?.code) return null;

  const code = normalizeCheckinCode(data.code);
  const origin = resolveCheckinWebOrigin(webOrigin);
  const checkinUrl = origin ? buildCheckinUrl(origin, code) : '';
  return {
    code,
    checkinUrl,
    qrUrl: checkinUrl ? qrImageUrl(checkinUrl, 280) : qrImageUrl(code, 280),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} code
 * @param {'qr'|'code'} source
 */
export async function recordCheckinByCode(client, code, source = 'qr') {
  const normalized = normalizeCheckinCode(code);
  if (!normalized) throw new Error('Enter or scan a valid check-in code.');

  const { data, error } = await client.rpc('record_place_checkin_by_code', {
    p_code: normalized,
    p_source: source,
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.place_id) throw new Error('Check-in failed.');
  return {
    visitId: row.visit_id,
    placeId: row.place_id,
    placeName: row.place_name || 'Establishment',
    alreadyCheckedIn: Boolean(row.already_checked_in),
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @param {string} placeId
 * @param {'destination_reached'|'manual'|'qr'|'code'} source
 */
export async function recordPlaceVisit(client, placeId, source = 'destination_reached') {
  const pid = String(placeId ?? '').trim();
  if (!pid) throw new Error('Missing place id.');
  const { data, error } = await client.rpc('record_place_visit', {
    p_place_id: pid,
    p_source: source,
  });
  if (error) throw error;
  return data;
}
