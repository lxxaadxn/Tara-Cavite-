import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const places = JSON.parse(readFileSync(join(root, 'data', 'dasmarinasSta2025Geocoded.json'), 'utf8'));

function esc(s) {
  return String(s).replace(/'/g, "''");
}

const lines = [
  `-- Dasmariñas STA-v3 (2025) tourist inventory → public.places`,
  `-- Run after migration adds ntdp_category + source_slug`,
  ``,
];

for (const p of places) {
  const desc = `NTDP: ${p.ntdpCategory}. Barangay: ${p.barangay}. Official STA-v3 inventory (City of Dasmariñas, Cavite, 2025).`;
  lines.push(`INSERT INTO public.places (name, address, type, hours, latitude, longitude, description, ntdp_category, source_slug)`);
  lines.push(
    `VALUES ('${esc(p.name)}', '${esc(p.address)}', '${esc(p.taCategory)}', '${esc(p.hours)}', ${p.latitude}, ${p.longitude}, '${esc(desc)}', '${esc(p.ntdpCategory)}', '${esc(p.slug)}')`
  );
  lines.push(
    `ON CONFLICT (source_slug) DO UPDATE SET name = EXCLUDED.name, address = EXCLUDED.address, type = EXCLUDED.type, hours = EXCLUDED.hours, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, description = EXCLUDED.description, ntdp_category = EXCLUDED.ntdp_category, updated_at = NOW();`
  );
  lines.push(``);
}

writeFileSync(join(root, 'supabase', 'seed_dasmarinas_sta2025_places.sql'), lines.join('\n'), 'utf8');
console.log('Wrote supabase/seed_dasmarinas_sta2025_places.sql');
