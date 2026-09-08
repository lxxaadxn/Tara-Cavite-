/** Public CMS copy and asset URLs (landing, auth, brand). */

const LANDING_HERO_IMAGE_DEFAULT =
  'https://www.beautyofthephilippines.com/wp-content/uploads/2007/05/Corregidor-Island-2025-11-22-2025-11-22-DJI_0873_HDR-1-marianosayno-2-0-1536x1023.jpg';

export const SITE_CONTENT_DEFAULTS = {
  'landing.hero.kicker': 'YOUR ULTIMATE CAVITE TRAVEL COMPANION',
  'landing.hero.headline': 'TARA, CAVITE!',
  'landing.hero.subtitle':
    'Discover verified spots, follow curated step-by-step itineraries, get turn-by-turn navigation, and stay updated with official announcements from local establishments and the Provincial Tourism Office of Cavite in one complete platform.',
  'landing.hero.cta': 'Explore map and Destinations',
  'landing.hero.cta_href': '/signup',
  'landing.hero.image_url': LANDING_HERO_IMAGE_DEFAULT,
  'landing.hero.image_alt': 'Aerial view of Corregidor Island, Cavite',
  'landing.nav.features': 'Features we provide',
  'landing.nav.destinations': 'Top Destinations',
  'landing.nav.itineraries': 'Curated Itineraries',
  'landing.nav.trails': 'Curated Itineraries',
  'landing.nav.why': 'Features we provide',
  'landing.why.heading': 'Why Choose Tara, Cavite!',
  'landing.why.body':
    'Tara, Cavite! combines interactive map navigation and sequential day trails with a comprehensive catalog of verified establishments across the province. Users can save custom travel lists, log location check-ins, and stay informed with real-time notices posted directly by local businesses and the Provincial Tourism Office.',
  'landing.why.pill_1': 'Interactive route maps',
  'landing.why.pill_2': 'Custom saved lists',
  'landing.why.pill_3': 'Establishment and tourism announcements',
  'landing.why.stat_establishments': 'Verified Establishments & Attractions',
  'landing.why.stat_municipalities': 'Cities & Municipalities Covered',
  'landing.why.stat_routes': 'Day Routes with Sequential Stop Timelines',
  'landing.why.stat_users': 'Active users',
  'landing.why.live_value': 'Active users',
  'landing.why.live_label': 'Live count of active traveler accounts',
  'landing.features.heading': 'Features we provide',
  'landing.features.1.n': '01',
  'landing.features.1.title': 'Step-by-Step Route Schedules',
  'landing.features.1.body':
    'View detailed itinerary stops complete with recommended stay durations, free/paid entry tags, and quick links to navigation.',
  'landing.features.1.image_url':
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=80',
  'landing.features.1.href': '/itinerary',
  'landing.features.2.n': '02',
  'landing.features.2.title': 'Personalized Saved Lists & Check-ins',
  'landing.features.2.body':
    'Group your favorite spots into custom private lists, leave reviews, and track your travel history with location check-ins.',
  'landing.features.2.image_url':
    'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=900&q=80',
  'landing.features.2.href': '/saved',
  'landing.features.3.n': '03',
  'landing.features.3.title': 'Turn-by-Turn Navigation',
  'landing.features.3.body':
    'Get direct travel routes, estimated travel times, and traffic condition updates for driving or commuting.',
  'landing.features.3.image_url':
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=900&q=80',
  'landing.features.3.href': '/search',
  'landing.features.4.n': '04',
  'landing.features.4.title': 'Establishment & Tourism Notices',
  'landing.features.4.body':
    'Stay informed with direct updates, local event schedules, and travel news posted by verified establishments and the Provincial Tourism Office of Cavite.',
  'landing.features.4.image_url':
    'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=80',
  'landing.features.4.href': '/announcements',
  'landing.destinations.heading': 'Explore Cavite’s Top Destinations',
  'landing.destinations.body':
    'Verified spots drawn directly from the Cavite tourism catalog. Open any tile to search that place.',
  'landing.destinations.cta': 'See more places',
  'landing.destinations.cta_href': '/search',
  'landing.destinations.place_ids': '[]',
  'landing.trails.heading': 'Curated Day Trails',
  'landing.trails.body': 'Ready-to-use travel routes linking verified destinations with estimated timings.',
  'landing.trails.cta': 'View itineraries',
  'landing.trails.cta_href': '/itinerary',
  'landing.trails.itinerary_ids': '[]',
  'landing.signup.heading': 'Ready to start your Cavite journey?',
  'landing.signup.body':
    'Create a free traveler account to save places, log your check-ins, unlock community reviews, and follow curated routes.',
  'landing.signup.primary': 'Create Free Account',
  'landing.signup.primary_href': '/signup',
  'landing.signup.secondary': 'Browse Map First',
  'landing.signup.secondary_href': '/search',
  'landing.footer.tagline':
    'Your verified guide to Cavite establishment search, interactive route navigation, and local travel announcements.',
  'landing.footer.contact_email': 'taracavite@gmail.com',
  'landing.footer.contact_phone': '',
  'landing.footer.copyright': '© 2026 Tara, Cavite! All rights reserved.',
  'auth.login.welcome': 'Welcome back! Enter your details to continue exploring',
  'auth.login.banner_url': '',
  'auth.signup.terms': 'I agree to the Terms of Use.',
  'auth.signup.privacy': 'Your data is used to personalize routes and saved lists. See Privacy for details.',
  'auth.reset.heading': 'Forgot password',
  'auth.reset.helper': 'Enter your email and we will send you a link to choose a new password.',
  'brand.logo_light_url': '',
  'brand.logo_dark_url': '',
  'brand.name': 'Tara, Cavite!',
  'brand.favicon_url': '',
  'brand.tab_title': 'Tara, Cavite! – Your Guide to Exploring Cavite',
  'brand.meta_description':
    "Your go-to tourist guide for discovering Cavite's destinations, routes, food spots, and hidden gems.",
};

const changeListeners = new Set();

export function subscribeSiteContentChanged(fn) {
  if (typeof fn !== 'function') return () => {};
  changeListeners.add(fn);
  return () => changeListeners.delete(fn);
}

export function emitSiteContentChanged() {
  for (const fn of changeListeners) {
    try {
      fn();
    } catch {
      // ignore
    }
  }
}

export function siteContentValue(map, key) {
  const live = map?.[key];
  if (live != null && String(live).length) return String(live);
  return SITE_CONTENT_DEFAULTS[key] ?? '';
}

export const LANDING_CATALOG_PICK_LIMIT = 4;

export function parseSiteContentIdList(raw, { limit = LANDING_CATALOG_PICK_LIMIT } = {}) {
  const text = String(raw ?? '').trim();
  let values = [];
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) values = parsed;
    } catch {
      values = text.split(/[\n,]/);
    }
  }
  const seen = new Set();
  const out = [];
  for (const item of values) {
    const id = String(item ?? '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

export function serializeSiteContentIdList(ids, { limit = LANDING_CATALOG_PICK_LIMIT } = {}) {
  return JSON.stringify(parseSiteContentIdList(JSON.stringify(ids ?? []), { limit }));
}

export function mergeSiteContent(rows) {
  const map = { ...SITE_CONTENT_DEFAULTS };
  for (const row of rows ?? []) {
    const key = String(row?.key ?? '').trim();
    if (!key) continue;
    map[key] = String(row?.value ?? '');
  }
  return map;
}

export async function fetchSiteContent(client) {
  if (!client) return { ...SITE_CONTENT_DEFAULTS };
  const { data, error } = await client.from('site_content').select('key, value');
  if (error) throw new Error(error.message);
  return mergeSiteContent(data);
}

export async function upsertSiteContent(client, entries) {
  if (!client) throw new Error('Not signed in');
  const rows = Object.entries(entries ?? {}).map(([key, value]) => ({
    key: String(key).trim(),
    value: String(value ?? ''),
  }));
  if (!rows.length) return;
  const { error } = await client.from('site_content').upsert(rows, { onConflict: 'key' });
  if (error) throw new Error(error.message);
  emitSiteContentChanged();
}

export async function uploadSiteContentFile(client, folder, file) {
  if (!client) throw new Error('Not signed in');
  if (!file) return '';
  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) throw new Error('Image must be 5 MB or smaller.');
  const ext = String(file.name || 'jpg').split('.').pop()?.toLowerCase() || 'jpg';
  const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg', 'ico'].includes(ext) ? ext : 'jpg';
  const path = `${String(folder || 'cms').replace(/[^a-z0-9/_-]/gi, '')}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const { error } = await client.storage.from('site-content').upload(path, file, {
    upsert: true,
    contentType: file.type || 'image/jpeg',
  });
  if (error) {
    const message = String(error.message || '');
    if (/bucket not found|not found/i.test(message)) {
      throw new Error('Photo storage is not set up. Run SITE_CONTENT.sql in Supabase, then try again.');
    }
    if (/row-level security|not allowed|unauthorized/i.test(message)) {
      throw new Error('This admin account cannot upload photos. Confirm you are signed in as the Tourism Office admin.');
    }
    throw new Error(error.message);
  }
  const { data } = client.storage.from('site-content').getPublicUrl(path);
  return data?.publicUrl || '';
}

let realtimeClient = null;
let realtimeChannel = null;
let realtimeRefs = 0;

function notifySiteContentListeners() {
  emitSiteContentChanged();
}

export function subscribeSiteContent(client, onChange) {
  if (typeof onChange !== 'function') return () => {};
  const unsubLocal = subscribeSiteContentChanged(onChange);

  if (client?.channel) {
    if (!realtimeChannel || realtimeClient !== client) {
      if (realtimeChannel && realtimeClient) {
        try {
          realtimeClient.removeChannel(realtimeChannel);
        } catch {
          // ignore
        }
      }
      realtimeClient = client;
      realtimeRefs = 0;
      try {
        realtimeChannel = client
          .channel('site-content-live')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'site_content' }, notifySiteContentListeners)
          .subscribe();
      } catch {
        realtimeChannel = null;
        realtimeClient = null;
      }
    }
    if (realtimeChannel) realtimeRefs += 1;
  }

  return () => {
    unsubLocal();
    if (!realtimeChannel || realtimeClient !== client) return;
    realtimeRefs -= 1;
    if (realtimeRefs > 0) return;
    try {
      realtimeClient.removeChannel(realtimeChannel);
    } catch {
      // ignore
    }
    realtimeChannel = null;
    realtimeClient = null;
    realtimeRefs = 0;
  };
}

