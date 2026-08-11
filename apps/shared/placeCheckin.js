export const CHECKIN_PATH_PREFIX = '/checkin/';
export const CHECKIN_APP_PATH = 'checkin';

export function buildCheckinUrl(origin, code) {
  const base = String(origin || '').replace(/\/$/, '');
  const normalized = normalizeCheckinCode(code);
  if (!base || !normalized) return '';
  return `${base}${CHECKIN_PATH_PREFIX}${encodeURIComponent(normalized)}`;
}

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

export function foldEstablishmentName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export async function buildPlaceVisitAliasMap(client, placeIds) {
  const map = new Map();
  const ids = [...new Set((placeIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  for (const id of ids) map.set(id, [id]);
  if (!ids.length) return map;

  const { data: places, error: placeErr } = await client
    .from('places')
    .select('id, name')
    .in('id', ids);
  if (placeErr) throw placeErr;

  const { data: staRows, error: staErr } = await client
    .from('v_sta_v3_cavite_2025_catalog')
    .select('establishment_public_id, ta_name')
    .limit(1200);
  if (staErr) throw staErr;

  const staByFold = new Map();
  for (const row of staRows ?? []) {
    const fold = foldEstablishmentName(row.ta_name);
    const staId = row.establishment_public_id ? String(row.establishment_public_id) : '';
    if (!fold || !staId) continue;
    if (!staByFold.has(fold)) staByFold.set(fold, staId);
  }

  for (const row of places ?? []) {
    const placeId = String(row.id);
    const fold = foldEstablishmentName(row.name);
    const staId = fold ? staByFold.get(fold) : null;
    if (!staId || staId === placeId) continue;
    const list = map.get(placeId) || [placeId];
    if (!list.includes(staId)) list.push(staId);
    map.set(placeId, list);
  }

  return map;
}

export function aggregateVisitCountsOntoPlaces(placesToAliases, countsByPlaceId) {
  const out = new Map();
  for (const [placeId, aliases] of placesToAliases.entries()) {
    let total = 0;
    let qr = 0;
    for (const alias of aliases) {
      const c = countsByPlaceId.get(String(alias));
      if (!c) continue;
      total += c.total || 0;
      qr += c.qr || 0;
    }
    out.set(placeId, { total, qr });
  }
  return out;
}

export function extractCheckinCodeFromText(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';

  const direct = normalizeCheckinCode(text);
  if (/^CT-[A-Z0-9]{6,}$/i.test(direct)) return direct;

  try {
    const url = new URL(text);
    const parts = url.pathname.split('/').filter(Boolean);
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

export async function fetchPlaceCheckinDisplay(client, placeId, webOrigin = '') {
  const pid = String(placeId ?? '').trim();
  if (!pid) return null;

  async function loadCodeForPlaceId(id) {
    const { data, error } = await client
      .from('place_checkin_codes')
      .select('code, is_active')
      .eq('place_id', id)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    return data?.code ? normalizeCheckinCode(data.code) : null;
  }

  let code = await loadCodeForPlaceId(pid);

  if (!code) {
    const { data: placeRow, error: placeErr } = await client
      .from('places')
      .select('name')
      .eq('id', pid)
      .maybeSingle();
    if (placeErr) throw placeErr;
    const placeName = String(placeRow?.name ?? '').trim();
    if (placeName) {
      let staId = null;
      const { data: staRow, error: staErr } = await client
        .from('v_sta_v3_cavite_2025_catalog')
        .select('establishment_public_id, ta_name')
        .ilike('ta_name', placeName)
        .limit(1)
        .maybeSingle();
      if (staErr) throw staErr;
      staId = staRow?.establishment_public_id ?? null;

      if (!staId) {
        const folded = placeName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
        const { data: staRows, error: staListErr } = await client
          .from('v_sta_v3_cavite_2025_catalog')
          .select('establishment_public_id, ta_name')
          .limit(800);
        if (staListErr) throw staListErr;
        const hit = (staRows ?? []).find((row) => {
          const n = String(row.ta_name ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
          return n === folded;
        });
        staId = hit?.establishment_public_id ?? null;
      }

      if (staId && String(staId) !== pid) {
        code = await loadCodeForPlaceId(String(staId));
      }
    }
  }

  if (!code) {
    try {
      const { data: rpcRows, error: rpcErr } = await client.rpc('get_place_checkin_code', {
        p_place_id: pid,
      });
      if (!rpcErr) {
        const row = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows;
        if (row?.code) code = normalizeCheckinCode(row.code);
      }
    } catch {
    }
  }

  if (!code) return null;

  const origin = resolveCheckinWebOrigin(webOrigin);
  const checkinUrl = origin ? buildCheckinUrl(origin, code) : '';
  return {
    code,
    checkinUrl,
    qrUrl: checkinUrl ? qrImageUrl(checkinUrl, 280) : qrImageUrl(code, 280),
  };
}

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
