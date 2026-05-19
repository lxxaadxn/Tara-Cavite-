/**
 * Single content pipeline: Admin CMS → Supabase → Web & Mobile.
 * Analytics and other admin dashboards may stay mock until event tables exist.
 */

export const CONTENT_PIPELINE = {
  /** Admin writes curated destinations here (source_slug prefix admin:) */
  adminPlacesTable: 'places',
  /** Public read model for web + mobile search, maps, detail */
  establishmentsView: 'v_cavite_establishments',
  adminSourcePrefix: 'admin:',
  imageStorageBucket: 'place-images',
  /** Same Supabase project for admin, web, mobile */
  supabaseProjectRef: 'bmsftpvixpvtjrlclnlz',
};

export const SYNC_MESSAGES = {
  live:
    'Live listings from Admin Content Management (same on web and mobile). Analytics may still use demo numbers.',
  demo:
    'Demo catalog — web and app show the same sample places. Connect Supabase to show what you publish in admin.',
  adminHint:
    'Destinations saved here appear on web Search and the mobile app after migration 20260510120004 is applied.',
};
