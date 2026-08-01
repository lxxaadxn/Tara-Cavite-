/**
 * Geocode DASMARIÑAS_STA_2025 addresses via Nominatim (1 req/s policy).
 * Run: node scripts/geocode-dasmarinas-sta2025.mjs
 * Writes: data/dasmarinasSta2025Geocoded.json
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const tsPath = join(root, 'data', 'dasmarinasSta2025Places.ts');
const raw = readFileSync(tsPath, 'utf8');
const arrMatch = raw.match(/export const DASMARIÑAS_STA_2025_PLACES[^=]+=\s*(\[[\s\S]*?\]);/);
if (!arrMatch) {
  console.error('Could not parse places array from TS file');
  process.exit(1);
}

/** Minimal eval of array literal (trusted local file). */
const places = new Function(`return ${arrMatch[1]}`)();

const UA = 'TaraCavite/1.0 (tourism inventory geocode)';

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!j?.length) return null;
  return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon), displayName: j[0].display_name };
}

const out = [];
for (let i = 0; i < places.length; i++) {
  const p = places[i];
  process.stdout.write(`[${i + 1}/${places.length}] ${p.name}… `);
  try {
    const g = await geocode(p.address);
    if (g) {
      out.push({ ...p, latitude: g.lat, longitude: g.lng, geocodeMatch: g.displayName });
      console.log(`${g.lat}, ${g.lng}`);
    } else {
      out.push({ ...p, latitude: null, longitude: null, geocodeMatch: null });
      console.log('NO RESULT');
    }
  } catch (e) {
    console.log('ERROR', e.message);
    out.push({ ...p, latitude: null, longitude: null, error: String(e) });
  }
  if (i < places.length - 1) await new Promise((r) => setTimeout(r, 1100));
}

writeFileSync(join(root, 'data', 'dasmarinasSta2025Geocoded.json'), JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote data/dasmarinasSta2025Geocoded.json');
