/**
 * Second-pass geocode for failed / out-of-bounds terminals.
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const UA = 'TaraCavite/1.0 (terminal patch)';
const DELAY_MS = 1100;
const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim() || '';

const pathGeo = join(root, 'data', 'cavite_terminals_geocoded.json');
const pathRows = join(root, 'data', 'terminals_cavite_rows.json');

function cityDisplay(city) {
  const c = String(city ?? '').trim();
  return c === 'Dasmarinas' ? 'Dasmariñas' : c;
}

function inCaviteBounds(lat, lng) {
  return lat >= 14.02 && lat <= 14.56 && lng >= 120.68 && lng <= 121.15;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function geocodeNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=ph`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  const j = await res.json();
  if (!j?.length) return null;
  const lat = parseFloat(j[0].lat);
  const lng = parseFloat(j[0].lon);
  if (!inCaviteBounds(lat, lng)) return null;
  return { lat, lng, formatted: j[0].display_name, provider: 'nominatim', query };
}

async function geocodeGoogle(query) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', GOOGLE_KEY);
  url.searchParams.set('region', 'ph');
  const res = await fetch(url);
  const j = await res.json();
  if (j.status !== 'OK' || !j.results?.length) return null;
  const loc = j.results[0].geometry?.location;
  if (!loc || !inCaviteBounds(loc.lat, loc.lng)) return null;
  return {
    lat: loc.lat,
    lng: loc.lng,
    formatted: j.results[0].formatted_address,
    provider: 'google',
    query,
  };
}

async function geocodeOne(query) {
  if (GOOGLE_KEY) return geocodeGoogle(query);
  return geocodeNominatim(query);
}

function patchQueries(row) {
  const name = String(row.Terminal_Name ?? '')
    .replace(/\s+Terminal$/i, '')
    .trim();
  const brgy = String(row.Terminal_Brgy ?? '').trim();
  const city = cityDisplay(row.Terminal_City);
  const queries = [
    `${brgy}, ${city}, Cavite, Philippines`,
    `${name.replace(/^SM City /, 'SM Center ')}, ${city}, Cavite, Philippines`,
    `${name}, ${brgy}, ${city}, Cavite`,
    `${city} Public Market, ${city}, Cavite`,
    `${city} City Hall, Cavite`,
    `Poblacion, ${city}, Cavite, Philippines`,
    `${name}, ${city}, Cavite, Philippines`,
  ];
  return [...new Set(queries.filter(Boolean))];
}

const rows = JSON.parse(readFileSync(pathRows, 'utf8'));
const geo = JSON.parse(readFileSync(pathGeo, 'utf8'));
const byId = new Map(geo.map((g) => [g.terminal_id, g]));
const rowById = new Map(rows.map((r) => [Number(r.Terminal_Id), r]));

for (const g of geo) {
  if (g.latitude != null && !inCaviteBounds(g.latitude, g.longitude)) {
    console.log('OUT OF BOUNDS', g.terminal_id, g.terminal_name, g.latitude, g.longitude);
    g.latitude = null;
    g.longitude = null;
    g.geocode_method = 'invalid_bounds';
  }
}

const targets = geo.filter((g) => g.latitude == null).map((g) => g.terminal_id);
console.log('Patching', targets.length, 'terminals…');

for (const id of targets) {
  const row = rowById.get(id);
  const entry = byId.get(id);
  if (!row || !entry) continue;
  process.stdout.write(`[${id}] ${entry.terminal_name}… `);
  let hit = null;
  for (const q of patchQueries(row)) {
    hit = await geocodeOne(q);
    if (hit) break;
    await sleep(DELAY_MS);
  }
  if (hit) {
    Object.assign(entry, {
      latitude: hit.lat,
      longitude: hit.lng,
      geocode_method: hit.provider,
      geocode_query: hit.query,
      geocode_label: hit.formatted,
    });
    console.log(hit.lat, hit.lng);
  } else {
    console.log('still FAIL');
  }
  await sleep(DELAY_MS);
}

writeFileSync(pathGeo, JSON.stringify(geo, null, 2), 'utf8');
const ok = geo.filter((g) => g.latitude != null).length;
console.log('Done:', ok, '/', geo.length);
