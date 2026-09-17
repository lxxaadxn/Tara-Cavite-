/**
 * Geocode parsed STA rows (Nominatim, 1 req/s). Fallback: LGU centroid + jitter.
 * Reads:  data/cavite_sta_v3_parsed.json  (uses .flat)
 * Writes: data/cavite_sta_v3_geocoded.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getCentroidForLgu, jitterCentroid } from './cavite-lgu-centroids.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const inPath = join(root, 'data', 'cavite_sta_v3_parsed.json');
const outPath = join(root, 'data', 'cavite_sta_v3_geocoded.json');

const { flat } = JSON.parse(readFileSync(inPath, 'utf8'));

const UA = 'TaraCavite/1.0 (STA Cavite geocode)';
const DELAY_MS = 1100;

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!j?.length) return null;
  return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const out = [];
for (let i = 0; i < flat.length; i++) {
  const p = flat[i];
  process.stdout.write(`[${i + 1}/${flat.length}] ${p.ta_name}… `);

  try {
    let g = await geocode(p.address);
    if (!g) await sleep(DELAY_MS);

    if (!g) {
      const detail = [p.ta_name, p._row?.barangay, p.city_mun, 'Cavite', 'Philippines'].filter(Boolean).join(', ');
      g = await geocode(detail);
      if (!g) await sleep(DELAY_MS);
    }

    if (!g && p.city_mun) {
      g = await geocode(`${p.city_mun}, Cavite, Philippines`);
    }

    if (g) {
      out.push({ ...p, latitude: g.lat, longitude: g.lng, geocode_method: 'nominatim' });
      console.log(`${g.lat}, ${g.lng}`);
    } else {
      const c = getCentroidForLgu(p.city_mun, p.sheet_name);
      if (c) {
        const j = jitterCentroid(c.lat, c.lng, p.address + p.ta_name);
        out.push({
          ...p,
          latitude: j.lat,
          longitude: j.lng,
          geocode_method: 'lgu_centroid',
        });
        console.log(`${j.lat}, ${j.lng} (centroid)`);
      } else {
        out.push({ ...p, latitude: null, longitude: null, geocode_method: 'failed' });
        console.log('FAIL');
      }
    }
  } catch (e) {
    console.log('ERR', e.message);
    const c = getCentroidForLgu(p.city_mun, p.sheet_name);
    if (c) {
      const j = jitterCentroid(c.lat, c.lng, p.address);
      out.push({ ...p, latitude: j.lat, longitude: j.lng, geocode_method: 'lgu_centroid', error: e.message });
    } else {
      out.push({ ...p, latitude: null, longitude: null, geocode_method: 'failed', error: e.message });
    }
  }

  if (i < flat.length - 1) await sleep(DELAY_MS);
}

writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote', outPath);
