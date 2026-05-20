/**
 * Geocode Cavite terminals + establishments (WGS84 — same on Google Maps & OpenStreetMap).
 *
 * Provider: GOOGLE_MAPS_API_KEY → Google Geocoding API; else Nominatim (1 req/s).
 *
 * Reads:
 *   data/terminals_cavite_rows.json
 *   data/cavite_sta_v3_geocoded.json  (establishments; re-geocodes when --refresh-establishments)
 *
 * Writes:
 *   data/cavite_terminals_geocoded.json
 *   data/cavite_sta_v3_geocoded.json    (when --refresh-establishments)
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const UA = 'CaviTour/1.0 (coordinate refresh; contact: github.com/emncrpz/CaviTour)';
const DELAY_MS = 1100;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim() || '';

const refreshEstablishments = process.argv.includes('--refresh-establishments');
const terminalsOnly = process.argv.includes('--terminals-only');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cityDisplay(city) {
  const c = String(city ?? '').trim();
  if (c === 'Dasmarinas') return 'Dasmariñas';
  if (c === 'General Mariano Alvarez') return 'General Mariano Alvarez';
  return c;
}

function terminalQueries(row) {
  const name = String(row.Terminal_Name ?? '')
    .replace(/\s+Terminal$/i, '')
    .trim();
  const brgy = String(row.Terminal_Brgy ?? '').trim();
  const city = cityDisplay(row.Terminal_City);
  const queries = [
    [name, brgy, city, 'Cavite', 'Philippines'].filter(Boolean).join(', '),
    [name.replace(/^SM City /, 'SM Center '), city, 'Cavite', 'Philippines'].filter(Boolean).join(', '),
    [name, city, 'Cavite', 'Philippines'].filter(Boolean).join(', '),
    `${brgy}, ${city}, Cavite, Philippines`,
    `${name}, Cavite, Philippines`,
  ];
  return [...new Set(queries)];
}

function establishmentQueries(row) {
  const brgy = row._row?.barangay?.trim();
  const city = row.city_mun?.trim();
  const name = row.ta_name?.trim();
  const queries = [];
  if (row.address) queries.push(row.address);
  if (name && brgy && city) {
    queries.push(`${name}, ${brgy}, ${city}, Cavite, Philippines`);
  }
  if (name && city) queries.push(`${name}, ${city}, Cavite, Philippines`);
  const detail = [name, brgy, city, 'Cavite', 'Philippines'].filter(Boolean).join(', ');
  if (detail) queries.push(detail);
  return [...new Set(queries)];
}

function inCaviteBounds(lat, lng) {
  return lat >= 14.02 && lat <= 14.56 && lng >= 120.68 && lng <= 121.15;
}

async function geocodeGoogle(query) {
  const findUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  findUrl.searchParams.set('input', query);
  findUrl.searchParams.set('inputtype', 'textquery');
  findUrl.searchParams.set('fields', 'geometry,formatted_address,name');
  findUrl.searchParams.set('locationbias', 'rectangle:14.02,120.68|14.56,121.15');
  findUrl.searchParams.set('key', GOOGLE_KEY);
  const findRes = await fetch(findUrl);
  if (findRes.ok) {
    const findJson = await findRes.json();
    const c = findJson.candidates?.[0];
    const loc = c?.geometry?.location;
    if (loc && inCaviteBounds(loc.lat, loc.lng)) {
      return {
        lat: loc.lat,
        lng: loc.lng,
        provider: 'google_places',
        formatted: c.formatted_address ?? c.name,
      };
    }
  }

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', GOOGLE_KEY);
  url.searchParams.set('region', 'ph');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google HTTP ${res.status}`);
  const j = await res.json();
  if (j.status !== 'OK' || !j.results?.length) return null;
  const loc = j.results[0].geometry?.location;
  if (!loc) return null;
  return {
    lat: loc.lat,
    lng: loc.lng,
    provider: 'google_geocode',
    formatted: j.results[0].formatted_address,
  };
}

async function geocodeNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ph`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const j = await res.json();
  if (!j?.length) return null;
  return {
    lat: parseFloat(j[0].lat),
    lng: parseFloat(j[0].lon),
    provider: 'nominatim',
    formatted: j[0].display_name,
  };
}

async function geocodeOne(query) {
  const g = GOOGLE_KEY ? await geocodeGoogle(query) : await geocodeNominatim(query);
  if (!g || !inCaviteBounds(g.lat, g.lng)) return null;
  return g;
}

async function geocodeWithFallback(queries) {
  for (const q of queries) {
    try {
      const g = await geocodeOne(q);
      if (g) return { ...g, query: q };
    } catch (e) {
      console.warn(' geocode err:', e.message);
    }
    await sleep(DELAY_MS);
  }
  return null;
}

async function geocodeTerminals() {
  const rows = JSON.parse(readFileSync(join(root, 'data', 'terminals_cavite_rows.json'), 'utf8'));
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[terminal ${i + 1}/${rows.length}] ${row.Terminal_Name}… `);
    const g = await geocodeWithFallback(terminalQueries(row));
    if (g) {
      out.push({
        terminal_id: Number(row.Terminal_Id),
        terminal_name: row.Terminal_Name,
        terminal_city: row.Terminal_City,
        terminal_brgy: row.Terminal_Brgy,
        latitude: g.lat,
        longitude: g.lng,
        geocode_method: g.provider,
        geocode_query: g.query,
        geocode_label: g.formatted,
      });
      console.log(`${g.lat}, ${g.lng} (${g.provider})`);
    } else {
      out.push({
        terminal_id: Number(row.Terminal_Id),
        terminal_name: row.Terminal_Name,
        latitude: null,
        longitude: null,
        geocode_method: 'failed',
      });
      console.log('FAIL');
    }
    if (i < rows.length - 1) await sleep(DELAY_MS);
  }
  const outPath = join(root, 'data', 'cavite_terminals_geocoded.json');
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', outPath, `ok=${out.filter((r) => r.latitude != null).length}/${out.length}`);
  return out;
}

async function geocodeEstablishments() {
  const inPath = join(root, 'data', 'cavite_sta_v3_geocoded.json');
  const rows = JSON.parse(readFileSync(inPath, 'utf8'));
  const out = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    process.stdout.write(`[place ${i + 1}/${rows.length}] ${row.ta_name}… `);
    const g = await geocodeWithFallback(establishmentQueries(row));
    if (g) {
      out.push({
        ...row,
        latitude: g.lat,
        longitude: g.lng,
        geocode_method: g.provider,
        geocode_query: g.query,
      });
      console.log(`${g.lat}, ${g.lng} (${g.provider})`);
    } else {
      out.push({ ...row, geocode_method: row.geocode_method ?? 'failed' });
      console.log('FAIL (kept prior coords)');
    }
    if (i < rows.length - 1) await sleep(DELAY_MS);
  }
  writeFileSync(inPath, JSON.stringify(out, null, 2), 'utf8');
  console.log('Wrote', inPath);
  return out;
}

console.log('Provider:', GOOGLE_KEY ? 'Google Geocoding API' : 'Nominatim (set GOOGLE_MAPS_API_KEY for Google)');
await geocodeTerminals();
if (!terminalsOnly && refreshEstablishments) await geocodeEstablishments();
