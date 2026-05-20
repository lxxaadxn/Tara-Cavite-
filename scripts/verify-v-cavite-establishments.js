/**
 * Verify public.v_cavite_establishments is readable with the app anon key.
 * Usage: node scripts/verify-v-cavite-establishments.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bmsftpvixpvtjrlclnlz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2Z0cHZpeHB2dGpybGNsbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzg1NDEsImV4cCI6MjA4NjYxNDU0MX0.ZEefnXcvDxxwaSEnsBvUxhxZar-V6M1v8F2_-kZRJkc';

const SELECT =
  'id, name, ta_name, type_code, ta_category, ntdp_category, city_mun, address, latitude, longitude, description, searchable_text, created_at, lgu_slug';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data, error, count } = await supabase
    .from('v_cavite_establishments')
    .select(SELECT, { count: 'exact' })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(5);

  if (error) {
    console.error('FAIL:', error.message);
    console.error(
      'Apply supabase/migrations/20260517120000_v_cavite_establishments_tourist_attraction.sql in Supabase SQL Editor.'
    );
    process.exit(1);
  }

  const n = count ?? data?.length ?? 0;
  console.log('OK: v_cavite_establishments readable, rows with coords:', n);
  if (data?.length) {
    console.log('Sample:', data.map((r) => `${r.name} (${r.lgu_slug})`).join('; '));
  }
  if (n === 0) {
    console.warn('WARN: view exists but has no geocoded rows. Seed places_* or tourist_attractions.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
