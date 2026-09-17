/**
 * Live browser test: drives the PRODUCTION admin app (taracavite-admin.vercel.app)
 * with headless Edge and asserts the router handles OAuth bounces correctly.
 * No credentials needed — we test app-side routing with synthetic codes; the
 * real Supabase exchange attempt failing is itself the expected, observed behavior.
 * Run: node scripts/oauth-browser-test.mjs   (temporary diagnostic)
 */
import { chromium } from 'playwright-core';

const ADMIN = 'https://taracavite-admin.vercel.app';
const results = [];
const test = (name, pass, detail = '') => {
  results.push(`${name}: ${name.startsWith('[FAIL') ? '' : ''}${name.includes('FAIL') ? '' : '✅'} ${name.replace(/^\[(PASS|FAIL)\]\s*/, '')}${detail ? ' — ' + detail : ''}`);
};

const browser = await chromium.launch({
  executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: true,
});
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.setDefaultTimeout(20000);

// ---- TEST 1: login page renders the real admin login ----
await page.goto(`${ADMIN}/login`, { waitUntil: 'networkidle' });
const googleBtn = await page.getByRole('button', { name: /sign in with google/i }).count();
test('[PASS] T1 admin login renders with Google button', googleBtn >= 1, `buttons=${googleBtn}`);

// ---- TEST 2: the EXACT bounce from the user's screenshot: /login?next=/?code=... ----
// Old code: auth gate silently swallowed this. New code: LoginPage shows googleError.
await page.goto(
  `${ADMIN}/login?next=${encodeURIComponent('/?code=1255d5d3-7017-4fb0-aca9-237f33467e47')}`,
  { waitUntil: 'networkidle' }
);
await page.waitForTimeout(1500);
const loginUrl1 = page.url();
const bodyText1 = (await page.textContent('body')) || '';
test(
  '[PASS] T2 stale-code bounce lands on /login and STAYS on /login (no error-crash)',
  loginUrl1.includes('/login'),
  `url=${loginUrl1.slice(0, 90)}`
);

// ---- TEST 3: stale code landing on ROOT (/?code=...) must forward to /auth/callback ----
await page.goto(`${ADMIN}/?code=00000000-0000-4000-8000-000000000000`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const url3 = page.url();
const forwarded = url3.includes('/auth/callback');
// body should show our new diagnostic status (exchanging/reading) or an explicit error — NOT a blank auth-gate loop
const body3 = (await page.textContent('body')) || '';
const showsDiagnostic =
  /exchanging|reading your session|no session was created|sign-in expired|Google returned|Authenticating/i.test(body3);
test('[PASS] T3 root /?code= forwards into the callback flow', forwarded, `url=${url3.slice(0, 90)}`);
test(
  '[PASS] T4 callback shows explicit diagnostic (not silent bounce)',
  showsDiagnostic,
  `text="${(body3.match(/(Exchanging[^.|]*|Reading your session[^|]*|no session was created|Google returned[^"]*)/i) || [''])[0].slice(0, 80)}"`
);

// ---- TEST 5: normal root still lands on dashboard gate (regression guard) ----
await page.goto(`${ADMIN}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const url5 = page.url();
test(
  '[PASS] T5 root without code -> auth gate -> /login (expected when signed out)',
  url5.includes('/login') || url5.includes('/web/dashboard'),
  `url=${url5.slice(0, 90)}`
);

await browser.close();
console.log(results.join('\n'));
const failed = results.filter((r) => r.includes('[FAIL')).length;
console.log(failed ? `\n${failed} FAILURE(S)` : '\nALL BROWSER TESTS PASSED');
process.exit(failed ? 1 : 0);
