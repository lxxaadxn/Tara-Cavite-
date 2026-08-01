/**
 * Backfill tourist_attractions rows with lat/lng = 0 using Google Places + Geocoding.
 *
 * Requires: GOOGLE_MAPS_API_KEY (Places API + Geocoding API enabled)
 * Optional: write SQL only with --sql-only (default writes data/backfill-zero-coords-google.json)
 *
 * Usage:
 *   set GOOGLE_MAPS_API_KEY=...
 *   node scripts/backfill-zero-coords-google.mjs
 *   node scripts/backfill-zero-coords-google.mjs --from-json   # skip live API; use saved results
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const OUT = join(root, 'data', 'backfill-zero-coords-google.json');
const TARGETS = join(root, 'data', 'backfill-zero-coords-targets.json');
const SQL_OUT = join(root, 'data', 'backfill-zero-coords-google.sql');

const GOOGLE_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim() || '';
const fromJson = process.argv.includes('--from-json');
const sqlOnly = process.argv.includes('--sql-only');
const DELAY_MS = 220;

// Cavite + Corregidor / Magallanes fringe
function inCaviteBounds(lat, lng) {
  return lat >= 14.02 && lat <= 14.56 && lng >= 120.55 && lng <= 121.15;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function cityLabel(city) {
  const c = String(city ?? '').trim();
  if (/^dasmari/i.test(c)) return 'Dasmariñas';
  if (/^mendez/i.test(c)) return 'Mendez';
  return c;
}

function buildQueries(row) {
  const name = String(row.ta_name ?? '').trim();
  const city = cityLabel(row.city_mun);
  const address = String(row.address ?? '').trim();
  const q = [];
  if (address && !/^groundfloor paterno/i.test(address)) {
    q.push(`${name}, ${address}`);
    q.push(address);
  }
  q.push(`${name}, ${city}, Cavite, Philippines`);
  q.push(`${name}, ${city}, Cavite`);
  // Known landmark aliases
  if (/people'?s park in the sky/i.test(name)) q.unshift('People\'s Park in the Sky, Tagaytay, Cavite, Philippines');
  if (/skyranch/i.test(name)) q.unshift('Sky Ranch Tagaytay, Tagaytay, Cavite, Philippines');
  if (/picnic grove/i.test(name)) q.unshift('Tagaytay Picnic Grove, Tagaytay, Cavite, Philippines');
  if (/museo orlina/i.test(name)) q.unshift('Museo Orlina, Tagaytay, Cavite, Philippines');
  if (/acienda/i.test(name)) q.unshift('Acienda Designer Outlet, Silang, Cavite, Philippines');
  if (/ilog maria/i.test(name)) q.unshift('Ilog Maria Honeybee Farm, Silang, Cavite, Philippines');
  if (/paradizoo/i.test(name)) q.unshift('Paradizoo, Mendez, Cavite, Philippines');
  if (/yoki'?s farm/i.test(name)) q.unshift("Yoki's Farm, Mendez, Cavite, Philippines");
  if (/eagle ridge/i.test(name)) q.unshift('Eagle Ridge Golf and Country Club, General Trias, Cavite, Philippines');
  if (/sherwood hills/i.test(name)) q.unshift('Sherwood Hills Golf Club, Trece Martires, Cavite, Philippines');
  if (/sm tanza/i.test(name)) q.unshift('SM City Tanza, Tanza, Cavite, Philippines');
  if (/vista mall tanza/i.test(name)) q.unshift('Vista Mall Tanza, Tanza, Cavite, Philippines');
  if (/pnpa museum/i.test(name)) q.unshift('Philippine National Police Academy Museum, Silang, Cavite, Philippines');
  return [...new Set(q.filter(Boolean))];
}

async function googlePlacesFind(query) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
  url.searchParams.set('input', query);
  url.searchParams.set('inputtype', 'textquery');
  url.searchParams.set('fields', 'geometry,formatted_address,name,place_id');
  url.searchParams.set('locationbias', 'rectangle:14.02,120.55|14.56,121.15');
  url.searchParams.set('key', GOOGLE_KEY);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Places HTTP ${res.status}`);
  const j = await res.json();
  if (j.status === 'REQUEST_DENIED') throw new Error(`Places denied: ${j.error_message || j.status}`);
  const c = j.candidates?.[0];
  const loc = c?.geometry?.location;
  if (!loc) return null;
  return {
    lat: loc.lat,
    lng: loc.lng,
    provider: 'google_places',
    formatted: c.formatted_address ?? c.name,
    place_id: c.place_id,
    name: c.name,
  };
}

async function googleGeocode(query) {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', query);
  url.searchParams.set('key', GOOGLE_KEY);
  url.searchParams.set('region', 'ph');
  url.searchParams.set('bounds', '14.02,120.55|14.56,121.15');
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocode HTTP ${res.status}`);
  const j = await res.json();
  if (j.status === 'REQUEST_DENIED') throw new Error(`Geocode denied: ${j.error_message || j.status}`);
  if (j.status !== 'OK' || !j.results?.length) return null;
  const r = j.results[0];
  const loc = r.geometry?.location;
  if (!loc) return null;
  const locType = r.geometry?.location_type;
  return {
    lat: loc.lat,
    lng: loc.lng,
    provider: 'google_geocode',
    formatted: r.formatted_address,
    location_type: locType,
    place_id: r.place_id,
  };
}

function looksLikeCavite(hit, city) {
  const text = `${hit.formatted || ''} ${hit.name || ''}`.toLowerCase();
  if (text.includes('cavite')) return true;
  if (city && text.includes(String(city).toLowerCase().replace(/ñ/g, 'n'))) return true;
  // Corregidor sometimes labeled as Bataan / Manila Bay but coords are in our bounds
  if (inCaviteBounds(hit.lat, hit.lng)) return true;
  return false;
}

async function geocodeRow(row) {
  const queries = buildQueries(row);
  for (const q of queries) {
    let hit = null;
    try {
      hit = await googlePlacesFind(q);
    } catch (e) {
      if (/denied/i.test(e.message)) throw e;
      console.warn('  places err:', e.message);
    }
    await sleep(DELAY_MS);
    if (!hit) {
      try {
        hit = await googleGeocode(q);
      } catch (e) {
        if (/denied/i.test(e.message)) throw e;
        console.warn('  geocode err:', e.message);
      }
      await sleep(DELAY_MS);
    }
    if (!hit) continue;
    if (!inCaviteBounds(hit.lat, hit.lng)) {
      console.warn(`  skip OOB ${hit.lat},${hit.lng} for "${q}"`);
      continue;
    }
    if (!looksLikeCavite(hit, row.city_mun) && hit.provider === 'google_geocode') {
      console.warn(`  skip non-Cavite label: ${hit.formatted}`);
      continue;
    }
    return { ...hit, query: q };
  }
  return null;
}

function toSql(results) {
  const ok = results.filter((r) => r.latitude != null);
  const lines = [
    '-- Google Maps backfill for tourist_attractions (zero coords)',
    'BEGIN;',
  ];
  for (const r of ok) {
    lines.push(
      `UPDATE tourist_attractions SET latitude = ${r.latitude}, longitude = ${r.longitude} WHERE ta_id = ${r.ta_id}; -- ${String(r.ta_name).replace(/'/g, "''")}`
    );
  }
  lines.push('COMMIT;');
  lines.push(`-- ok=${ok.length} failed=${results.length - ok.length}`);
  return lines.join('\n');
}

async function main() {
  if (!existsSync(TARGETS)) {
    console.error('Missing', TARGETS, '— export targets first.');
    process.exit(1);
  }
  const targets = JSON.parse(readFileSync(TARGETS, 'utf8'));
  console.log('Targets:', targets.length);

  let results;
  if (fromJson || sqlOnly) {
    if (!existsSync(OUT)) {
      console.error('Missing', OUT);
      process.exit(1);
    }
    results = JSON.parse(readFileSync(OUT, 'utf8'));
  } else {
    if (!GOOGLE_KEY) {
      console.error('Set GOOGLE_MAPS_API_KEY (Places API + Geocoding API enabled).');
      process.exit(1);
    }
    results = [];
    for (let i = 0; i < targets.length; i++) {
      const row = targets[i];
      process.stdout.write(`[${i + 1}/${targets.length}] ${row.ta_name} (${row.city_mun})… `);
      try {
        const g = await geocodeRow(row);
        if (g) {
          results.push({
            ta_id: row.ta_id,
            establishment_public_id: row.establishment_public_id,
            ta_name: row.ta_name,
            city_mun: row.city_mun,
            latitude: g.lat,
            longitude: g.lng,
            geocode_method: g.provider,
            geocode_query: g.query,
            geocode_label: g.formatted,
            place_id: g.place_id ?? null,
          });
          console.log(`${g.lat}, ${g.lng} (${g.provider})`);
        } else {
          results.push({
            ta_id: row.ta_id,
            establishment_public_id: row.establishment_public_id,
            ta_name: row.ta_name,
            city_mun: row.city_mun,
            latitude: null,
            longitude: null,
            geocode_method: 'failed',
          });
          console.log('FAIL');
        }
      } catch (e) {
        console.error('\nFatal:', e.message);
        writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');
        process.exit(1);
      }
    }
    writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');
    console.log('Wrote', OUT);
  }

  const sql = toSql(results);
  writeFileSync(SQL_OUT, sql, 'utf8');
  console.log('Wrote', SQL_OUT);
  const ok = results.filter((r) => r.latitude != null).length;
  console.log(`Summary: ok=${ok} failed=${results.length - ok}`);
}

await main();
