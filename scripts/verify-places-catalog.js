/**
 * Verify public.places is readable with the app anon key (catalog + images).
 * Usage: node scripts/verify-places-catalog.js
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://bmsftpvixpvtjrlclnlz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2Z0cHZpeHB2dGpybGNsbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzg1NDEsImV4cCI6MjA4NjYxNDU0MX0.ZEefnXcvDxxwaSEnsBvUxhxZar-V6M1v8F2_-kZRJkc';

const SELECT = 'id, name, image_url, latitude, longitude, city_mun';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data, error, count } = await supabase
    .from('places')
    .select(SELECT, { count: 'exact' })
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .limit(5);

  if (error) {
    console.error('FAIL:', error.message);
    console.error('Apply supabase/migrations/20260518120000_sync_places_with_images.sql');
    process.exit(1);
  }

  const total = count ?? 0;
  console.log('OK: public.places readable, published rows with coords:', total);

  const { count: withImages } = await supabase
    .from('places')
    .select('id', { count: 'exact', head: true })
    .not('image_url', 'is', null);

  console.log('Rows with image_url or gallery_urls:', withImages ?? 0);

  if (data?.length) {
    console.log(
      'Sample:',
      data.map((r) => `${r.name}${r.image_url ? ' [img]' : ''}`).join('; ')
    );
  }

  if (total === 0) {
    console.warn('WARN: no rows — run view migration then sync_places_with_images.sql');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
