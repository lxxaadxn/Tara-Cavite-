/**
 * Single content pipeline: Admin CMS → Supabase → Web & Mobile.
 * Analytics and other admin dashboards may stay mock until event tables exist.
 */

export const CONTENT_PIPELINE = {
  /** Admin writes curated destinations here (STA is the single establishment table). */
  adminPlacesTable: 'sta_v3_cavite_2025',
  /**
   * Public read model for web + mobile.
   * STA UPDATED Excel membership + Maps-link coords + hours/media/contact on the same table.
   * Only is_listed rows are exposed as is_published.
   */
  establishmentsView: 'v_sta_v3_cavite_2025_catalog',
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
