/**
 * Fill null coordinates using Nominatim on "Barangay, Dasmariñas, Cavite" + small offsets.
 * Run after geocode-dasmarinas-sta2025.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const jsonPath = join(root, 'data', 'dasmarinasSta2025Geocoded.json');

const UA = 'CaviTour/1.0 (https://github.com/cavitour; barangay fallback geocode)';

async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  if (!j?.length) return null;
  return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
}

const places = JSON.parse(readFileSync(jsonPath, 'utf8'));
const barangayCache = new Map();
const perBarangayIndex = new Map();

function offsetFor(i) {
  const step = 0.00032;
  return { dLat: (i % 7) * step - step * 3, dLng: Math.floor(i / 7) * step - step * 2 };
}

for (const p of places) {
  if (p.latitude != null && p.longitude != null) continue;

  const q = `${p.barangay}, Dasmariñas, Cavite, Philippines`;
  if (!barangayCache.has(p.barangay)) {
    process.stdout.write(`Geocoding barangay: ${p.barangay}… `);
    const g = await geocode(q);
    barangayCache.set(p.barangay, g || { lat: 14.3298, lng: 120.9366 });
    console.log(barangayCache.get(p.barangay));
    await new Promise((r) => setTimeout(r, 1100));
  }

  const base = barangayCache.get(p.barangay);
  const idx = perBarangayIndex.get(p.barangay) ?? 0;
  perBarangayIndex.set(p.barangay, idx + 1);
  const { dLat, dLng } = offsetFor(idx);

  p.latitude = base.lat + dLat;
  p.longitude = base.lng + dLng;
  p.geocodeFallback = `barangay centroid + offset (${p.barangay})`;
}

writeFileSync(jsonPath, JSON.stringify(places, null, 2), 'utf8');
console.log('Updated', jsonPath);
