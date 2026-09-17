/**
 * OAuth probe — observes the LIVE Supabase/Google flow using production config.
 * Run: node scripts/oauth-probe.mjs
 * (Temporary diagnostic script — safe to delete.)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bmsftpvixpvtjrlclnlz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtc2Z0cHZpeHB2dGpybGNsbmx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMzg1NDEsImV4cCI6MjA4NjYxNDU0MX0.ZEefnXcvDxxwaSEnsBvUxhxZar-V6M1v8F2_-kZRJkc';
const ADMIN_ORIGIN = 'https://taracavite-admin.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { flowType: 'pkce', detectSessionInUrl: false },
});

console.log('=== STEP 1: exact production signInWithOAuth call ===');
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${ADMIN_ORIGIN}/auth/callback?next=${encodeURIComponent('/web/dashboard')}`,
    skipBrowserRedirect: true,
    queryParams: { prompt: 'select_account' },
  },
});
if (error) {
  console.error('signInWithOAuth ERROR:', error.message);
  process.exit(1);
}
console.log('authorize URL ok:', data.url.slice(0, 110) + '…');

console.log('\n=== STEP 2: follow authorize -> Google (no redirect) ===');
const g = await fetch(data.url, { redirect: 'manual' });
const gLoc = g.headers.get('location');
console.log('status:', g.status);
if (!gLoc || !gLoc.startsWith('https://accounts.google.com/')) {
  console.error('UNEXPECTED:', g.status, (await g.text()).slice(0, 300));
  process.exit(1);
}
const gu = new URL(gLoc);
console.log('reaches Google consent:', true);
console.log('  prompt          =', gu.searchParams.get('prompt'));
console.log('  redirect_uri    =', gu.searchParams.get('redirect_uri'));
console.log('  redirect_to     =', gu.searchParams.get('redirect_to'));
console.log('  state present   =', Boolean(gu.searchParams.get('state')));

console.log('\n=== STEP 3: simulate a STALE/REUSED code returning to Supabase callback ===');
const state = gu.searchParams.get('state');
const cb = await fetch(
  `${SUPABASE_URL}/auth/v1/callback?code=00000000-0000-4000-8000-000000000000&state=${state}`,
  { redirect: 'manual' }
);
const cbLoc = cb.headers.get('location');
console.log('status:', cb.status);
console.log('bounces browser to:', cbLoc);
if (cbLoc) {
  const cu = new URL(cbLoc);
  console.log('  -> origin :', cu.origin);
  console.log('  -> path   :', cu.pathname);
  console.log('  -> params :', [...cu.searchParams.keys()].join(', '), '| hash:', cu.hash || '(none)');
}

console.log('\n=== STEP 4: unknown state (fully stale flow) at Supabase callback ===');
const cb2 = await fetch(
  `${SUPABASE_URL}/auth/v1/callback?code=00000000-0000-4000-8000-000000000000&state=11111111-1111-4111-8111-111111111111`,
  { redirect: 'manual' }
);
const cb2Loc = cb2.headers.get('location');
console.log('status:', cb2.status);
console.log('bounces browser to:', cb2Loc);
if (cb2Loc) {
  const c2 = new URL(cb2Loc);
  console.log('  -> origin :', c2.origin);
  console.log('  -> path   :', c2.pathname);
  console.log('  -> params :', [...c2.searchParams.keys()].join(', '), '| hash:', c2.hash || '(none)');
}
console.log('\nPROBE DONE');
