export const CONTENT_PIPELINE = {
  adminPlacesTable: 'tourist_attractions',
  establishmentsView: 'places',
  adminSourcePrefix: 'admin:',
  imageStorageBucket: 'place-images',
  supabaseProjectRef: 'bmsftpvixpvtjrlclnlz',
};

export const SYNC_MESSAGES = {
  live:
    'Live listings from Admin Content Management (same on web and mobile). Visit counts use QR check-ins and Destination Reached.',
  demo:
    'Demo catalog — web and app show the same sample places. Connect Supabase to show what you publish in admin.',
  adminHint:
    'Destinations saved here appear on web Search and the mobile app. Each place can get a unique check-in QR for visitors.',
};
